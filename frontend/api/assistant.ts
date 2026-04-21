import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { AssistantAction, AssistantMessage, AssistantProgressSnapshot, AssistantRequest, AssistantResponse } from "../shared/assistant.js";
import { buildHelpKnowledgeText } from "../shared/help-center.js";
import { resolveAuthContext } from "./_lib/server/auth.js";
import { ApiError, errorResponse, isPlainObject, methodNotAllowed, ok, readJsonObject } from "./_lib/server/http.js";
import { runWithRequestContext } from "./_lib/server/request-context.js";
import { getProgress, listSourceSummaries } from "./_lib/server/service.js";
import { sendWebResponse, toWebRequest } from "./_lib/vercel-bridge.js";

type SourceSummary = {
  id: string;
  title: string;
  updatedAt: string;
  questionCount: number;
  visibility: "private" | "public";
};

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api").replace(/\/$/, "");
const OLLAMA_ASSISTANT_MODEL = process.env.OLLAMA_ASSISTANT_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen3.5:0.8b";

const DEFAULT_SUGGESTIONS = [
  "Summarize my progress",
  "Explain how streaks work",
  "Take me to my most recent kit",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return sendWebResponse(methodNotAllowed(["POST"]), res);
    }

    const request = await toWebRequest(req);
    const auth = await resolveAuthContext(request);
    const payload = await parseAssistantRequest(request);

    return await runWithRequestContext(auth, async () => {
      const [sources, progress] = await Promise.all([
        listSourceSummaries(auth.userId),
        getProgress(auth.userId).catch(() => null),
      ]);

      const normalizedSources = sources
        .map((source) => ({
          id: source.id,
          title: source.title,
          updatedAt: source.updatedAt,
          questionCount: source.questionCount,
          visibility: source.visibility,
        }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      const progressSnapshot: AssistantProgressSnapshot | null = progress
        ? {
            totals: progress.totals,
            recommendation: progress.recommendations,
          }
        : null;

      const latestUserMessage = [...payload.messages].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
      const heuristic = buildHeuristicResponse(latestUserMessage, normalizedSources, progressSnapshot);
      const modelResult = await queryJunoWithOllama({
        messages: payload.messages,
        sources: normalizedSources,
        progress: progressSnapshot,
        routeContext: payload.routeContext,
      });

      const response = shouldPreferHeuristic(latestUserMessage, heuristic) ? heuristic : modelResult ?? heuristic;
      return sendWebResponse(ok(response), res);
    });
  } catch (error) {
    return sendWebResponse(errorResponse(error), res);
  }
}

async function parseAssistantRequest(request: Request): Promise<AssistantRequest> {
  const payload = await readJsonObject(request);
  const rawMessages = payload.messages;
  const rawRouteContext = payload.routeContext;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new ApiError(400, "messages must be a non-empty array.", { code: "invalid_messages" });
  }

  const messages = rawMessages
    .map((message): AssistantMessage => {
      if (!isPlainObject(message)) {
        throw new ApiError(400, "Each message must be an object.", { code: "invalid_message_shape" });
      }

      const role = message.role;
      const content = message.content;
      if ((role !== "user" && role !== "assistant") || typeof content !== "string" || content.trim().length === 0) {
        throw new ApiError(400, "Each message needs a valid role and content.", { code: "invalid_message" });
      }

      return {
        role,
        content: content.trim().slice(0, 6_000),
      };
    })
    .slice(-8);

  const currentTab =
    isPlainObject(rawRouteContext) && typeof rawRouteContext.currentTab === "string"
      ? rawRouteContext.currentTab.trim().slice(0, 64)
      : "assistant";
  const currentKitId =
    isPlainObject(rawRouteContext) && typeof rawRouteContext.currentKitId === "string"
      ? rawRouteContext.currentKitId.trim().slice(0, 128)
      : null;

  return {
    messages,
    routeContext: {
      currentTab: currentTab || "assistant",
      currentKitId: currentKitId && currentKitId.length > 0 ? currentKitId : null,
    },
  };
}

function buildHeuristicResponse(
  latestUserMessage: string,
  sources: SourceSummary[],
  progress: AssistantProgressSnapshot | null,
): AssistantResponse {
  const normalized = latestUserMessage.toLowerCase();
  const recentKit = sources[0] ?? null;

  if (normalized.includes("progress")) {
    return {
      assistantName: "Juno",
      usedModel: false,
      message: progress
        ? `You currently have ${progress.totals.sources} kit${progress.totals.sources === 1 ? "" : "s"}, ${progress.totals.questions} question${progress.totals.questions === 1 ? "" : "s"}, ${progress.totals.sessions} recorded session${progress.totals.sessions === 1 ? "" : "s"}, and ${progress.totals.attempts} total attempts. ${progress.recommendation ? `Your best next move is: ${progress.recommendation.headline}. ${progress.recommendation.summary}` : "You can open Progress for the deeper breakdown."}`
        : "I can open Progress for you, but I do not have enough recent study data yet to summarize anything meaningful.",
      action: normalized.includes("open") || normalized.includes("take me") ? { type: "navigate", target: "progress" } : null,
      suggestions: ["Open progress", "Explain streaks", "Take me to my latest kit"],
    };
  }

  if (normalized.includes("streak")) {
    return {
      assistantName: "Juno",
      usedModel: false,
      message:
        "A streak is earned by finishing at least one study session before local midnight. Standard, Focus, Fast Drill, and Weak Review all count. If you miss a full day, the streak resets the next time you study.",
      action: normalized.includes("open") || normalized.includes("show")
        ? { type: "open_help_topic", topic: "streaks" }
        : null,
      suggestions: ["Open streak help", "Summarize my progress", "Take me home"],
    };
  }

  if ((normalized.includes("recent kit") || normalized.includes("latest kit")) && recentKit) {
    return {
      assistantName: "Juno",
      usedModel: false,
      message: `Your most recent kit is ${recentKit.title}. I can open it for review right now.`,
      action: { type: "open_kit", sourceId: recentKit.id, destination: "review" },
      suggestions: ["Open progress", "Start a new kit", "Explain how study modes work"],
    };
  }

  const extractedContent = extractStudyContent(latestUserMessage);
  if ((normalized.includes("create a kit") || normalized.includes("make a kit")) && extractedContent) {
    return {
      assistantName: "Juno",
      usedModel: false,
      message: "I pulled the notes out of your message and I’m ready to turn them into a study kit.",
      action: {
        type: "create_kit",
        title: guessKitTitle(latestUserMessage, extractedContent),
        content: extractedContent,
        visibility: "private",
      },
      suggestions: ["Open my kits", "Summarize my progress", "Explain streaks"],
    };
  }

  return {
    assistantName: "Juno",
    usedModel: false,
    message:
      "I can help with three big things right now: explain how Snaplet works, summarize your progress, and take actions in the app like opening pages or creating a kit from notes you paste here.",
    action: null,
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

async function queryJunoWithOllama({
  messages,
  sources,
  progress,
  routeContext,
}: {
  messages: AssistantMessage[];
  sources: SourceSummary[];
  progress: AssistantProgressSnapshot | null;
  routeContext: AssistantRequest["routeContext"];
}): Promise<AssistantResponse | null> {
  const prompt = buildAssistantPrompt(messages, sources, progress, routeContext);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: OLLAMA_ASSISTANT_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { response?: unknown };
    const rawText = typeof payload.response === "string" ? payload.response : "";
    const jsonText = extractJsonObject(rawText);
    if (!jsonText) {
      return null;
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const message = typeof parsed.message === "string" ? parsed.message.trim().slice(0, 4_000) : "";
    if (!message) {
      return null;
    }

    const action = normalizeAssistantAction(parsed.action, sources);
    const suggestions = sanitizeSuggestions(parsed.suggestions);

    return {
      assistantName: "Juno",
      usedModel: true,
      message,
      action,
      suggestions,
    };
  } catch {
    return null;
  }
}

function buildAssistantPrompt(
  messages: AssistantMessage[],
  sources: SourceSummary[],
  progress: AssistantProgressSnapshot | null,
  routeContext: AssistantRequest["routeContext"],
): string {
  const conversation = messages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
  const sourceSummary = sources.length
    ? sources
        .slice(0, 10)
        .map((source) => `- ${source.id}: ${source.title} (${source.questionCount} cards, ${source.visibility}, updated ${source.updatedAt})`)
        .join("\n")
    : "- No study kits yet";
  const progressSummary = progress
    ? [
        `- totals: ${progress.totals.sources} kits, ${progress.totals.questions} questions, ${progress.totals.sessions} sessions, ${progress.totals.attempts} attempts`,
        progress.recommendation
          ? `- recommendation: ${progress.recommendation.headline} | ${progress.recommendation.summary} | action=${progress.recommendation.actionType} | sourceId=${progress.recommendation.sourceId ?? "none"} | mode=${progress.recommendation.mode ?? "none"}`
          : "- recommendation: none",
      ].join("\n")
    : "- Progress unavailable";

  return [
    "You are Juno, Snaplet's in-app AI assistant.",
    "Your job is to help users use the app, explain how it works, summarize progress, and trigger safe in-app actions.",
    "You can:",
    "- explain Snaplet using the help center knowledge below",
    "- summarize the user's progress from the progress snapshot",
    "- navigate to app pages",
    "- open a specific kit when one exists in the provided list",
    "- create a kit ONLY when the user has actually provided notes or study text in their message",
    "",
    "Never invent source IDs, progress numbers, or study content.",
    "If the user asks to create a kit but has not provided notes, ask them to paste the notes.",
    "If the user asks to open something that does not exist, say so plainly and offer the closest valid next step.",
    "Keep the tone helpful, concise, and action-oriented.",
    "",
    "Return ONLY valid JSON using this exact shape:",
    '{"message":"...","action":null,"suggestions":["...","...","..."]}',
    "",
    'Valid action forms:',
    '- {"type":"navigate","target":"dashboard"}',
    '- {"type":"navigate","target":"kits"}',
    '- {"type":"navigate","target":"progress"}',
    '- {"type":"navigate","target":"help"}',
    '- {"type":"navigate","target":"settings"}',
    '- {"type":"navigate","target":"create"}',
    '- {"type":"navigate","target":"assistant"}',
    '- {"type":"open_help_topic","topic":"streaks"}',
    '- {"type":"open_kit","sourceId":"src_...","destination":"review"}',
    '- {"type":"open_kit","sourceId":"src_...","destination":"study-mode"}',
    '- {"type":"create_kit","title":"...","content":"...","visibility":"private"}',
    "",
    `Current app tab: ${routeContext.currentTab}`,
    `Current kit id: ${routeContext.currentKitId ?? "none"}`,
    "",
    "User kits:",
    sourceSummary,
    "",
    "Progress snapshot:",
    progressSummary,
    "",
    buildHelpKnowledgeText(),
    "",
    "Conversation:",
    conversation,
  ].join("\n");
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return trimmed.slice(start, end + 1);
}

function normalizeAssistantAction(raw: unknown, sources: SourceSummary[]): AssistantAction | null {
  if (!isPlainObject(raw) || typeof raw.type !== "string") {
    return null;
  }

  if (raw.type === "navigate") {
    const target = raw.target;
    if (
      target === "dashboard" ||
      target === "kits" ||
      target === "progress" ||
      target === "help" ||
      target === "settings" ||
      target === "create" ||
      target === "assistant"
    ) {
      return { type: "navigate", target };
    }
    return null;
  }

  if (raw.type === "open_help_topic") {
    return { type: "open_help_topic", topic: raw.topic === "streaks" ? "streaks" : "general" };
  }

  if (raw.type === "open_kit") {
    if (typeof raw.sourceId !== "string") {
      return null;
    }
    const destination = raw.destination === "study-mode" ? "study-mode" : "review";
    const exists = sources.some((source) => source.id === raw.sourceId);
    if (!exists) {
      return null;
    }
    return {
      type: "open_kit",
      sourceId: raw.sourceId,
      destination,
    };
  }

  if (raw.type === "create_kit") {
    if (typeof raw.title !== "string" || typeof raw.content !== "string") {
      return null;
    }
    const title = raw.title.trim().slice(0, 120) || guessKitTitle(raw.title, raw.content);
    const content = raw.content.trim().slice(0, 120_000);
    if (content.length < 8) {
      return null;
    }
    return {
      type: "create_kit",
      title,
      content,
      visibility: raw.visibility === "public" ? "public" : "private",
    };
  }

  return null;
}

function sanitizeSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_SUGGESTIONS;
  }

  const suggestions = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !item.includes("action=") && !item.includes("open_help_topic:"))
    .slice(0, 3);

  return suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;
}

function shouldPreferHeuristic(latestUserMessage: string, heuristic: AssistantResponse): boolean {
  if (!heuristic.action) {
    return false;
  }

  const normalized = latestUserMessage.toLowerCase();
  return (
    normalized.includes("take me") ||
    normalized.includes("open ") ||
    normalized.includes("go to") ||
    normalized.includes("make a kit") ||
    normalized.includes("create a kit") ||
    normalized.includes("summarize my progress") ||
    normalized.includes("explain how streaks work")
  );
}

function extractStudyContent(message: string): string | null {
  const fencedMatch = message.match(/```[\s\S]*?\n([\s\S]*?)```/);
  if (fencedMatch?.[1]?.trim() && fencedMatch[1].trim().length >= 8) {
    return fencedMatch[1].trim();
  }

  const markerMatch = message.match(/(?:notes|study this|from this|content)\s*:\s*([\s\S]+)/i);
  if (markerMatch?.[1]?.trim() && markerMatch[1].trim().length >= 8) {
    return markerMatch[1].trim();
  }

  const lines = message.split("\n").map((line) => line.trimEnd());
  if (lines.length >= 3) {
    const afterFirstLine = lines.slice(1).join("\n").trim();
    if (afterFirstLine.length >= 24) {
      return afterFirstLine;
    }
  }

  return null;
}

function guessKitTitle(message: string, content: string): string {
  const firstContentLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && line.length <= 80);
  if (firstContentLine) {
    return firstContentLine.slice(0, 80);
  }

  const stripped = message.replace(/create (a )?kit/gi, "").replace(/make (a )?kit/gi, "").trim();
  if (stripped.length >= 3) {
    return stripped.slice(0, 80);
  }

  return "Juno Study Kit";
}
