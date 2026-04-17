import { recordProductEvent } from "./product-events.js";

type GenerationProvider = "ollama" | "groq" | "openrouter";
type GenerationTask = "questions" | "title";

type QuestionPair = { prompt: string; answer: string };

export type ProviderQuestionGenerationResult = {
  pairs: QuestionPair[] | null;
  provider: GenerationProvider | null;
  model: string | null;
};

type ProviderDefinition = {
  keyEnvPool: string;
  keyEnvSingle: string;
  defaultQuestionModel: string;
  questionModelEnv: string;
  defaultTitleModel: string;
  titleModelEnv: string;
  requestQuestions: (
    apiKey: string,
    sourceText: string,
    signal: AbortSignal,
  ) => Promise<{
    response: Response;
    model: string;
    content: string;
  } | null>;
  requestTitle: (
    apiKey: string,
    sourceText: string,
    signal: AbortSignal,
  ) => Promise<{
    response: Response;
    model: string;
    content: string;
  } | null>;
};

type ProviderFailureKind = "http_error" | "timeout" | "network_error" | "empty_response" | "parse_error";

type ProviderAttemptFailure = {
  provider: GenerationProvider;
  task: GenerationTask;
  model: string;
  kind: ProviderFailureKind;
  latencyMs: number;
  httpStatus?: number;
  message?: string;
};

type QuestionAttemptResult = {
  pairs: QuestionPair[] | null;
  model?: string;
  latencyMs?: number;
  failure: ProviderAttemptFailure | null;
};

type TitleAttemptResult = {
  title: string | null;
  model?: string;
  latencyMs?: number;
  failure: ProviderAttemptFailure | null;
};

const DEFAULT_PROVIDER_ORDER: GenerationProvider[] = ["groq", "openrouter", "ollama"];

const keyRotationCursor: Record<GenerationProvider, number> = {
  groq: 0,
  openrouter: 0,
  ollama: 0,
};

function generationLogMode(): "failures" | "verbose" | "silent" {
  const raw = (process.env.GENERATION_LOGGING ?? "failures").trim().toLowerCase();
  if (raw === "silent" || raw === "off") {
    return "silent";
  }
  if (raw === "verbose") {
    return "verbose";
  }
  return "failures";
}

function summarizeErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return error.message.slice(0, 240);
}

function logGenerationFailure(failure: ProviderAttemptFailure): void {
  if (generationLogMode() === "silent") {
    return;
  }

  console.warn("[generation] provider failed", {
    provider: failure.provider,
    task: failure.task,
    model: failure.model,
    kind: failure.kind,
    latencyMs: failure.latencyMs,
    httpStatus: failure.httpStatus,
    message: failure.message,
  });
}

function logGenerationSuccess(details: {
  provider: GenerationProvider;
  task: GenerationTask;
  model: string;
  latencyMs: number;
  recoveredAfterFallback: boolean;
  pairCount?: number;
}): void {
  if (generationLogMode() !== "verbose" && !details.recoveredAfterFallback) {
    return;
  }

  console.info("[generation] provider accepted", details);
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    return null;
  }

  return trimmed.slice(start, end + 1);
}

function providerModel(
  provider: GenerationProvider,
  modelEnv: string,
  defaultModel: string,
): string {
  const configuredModel = process.env[modelEnv]?.trim();
  if (provider === "ollama") {
    return configuredModel || process.env.OLLAMA_MODEL?.trim() || defaultModel;
  }

  return configuredModel || defaultModel;
}

function normalizeProviderList(raw: string | undefined): GenerationProvider[] {
  if (!raw) {
    return DEFAULT_PROVIDER_ORDER;
  }

  const items = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const providers: GenerationProvider[] = [];
  for (const item of items) {
    if (item === "ollama" || item === "groq" || item === "openrouter") {
      providers.push(item);
    }
  }

  return providers.length > 0 ? providers : DEFAULT_PROVIDER_ORDER;
}

function buildQuestionMessages(sourceText: string) {
  return [
    {
      role: "system",
      content: [
        "You generate active-recall study questions from source material.",
        "Return JSON only in this schema:",
        '{"pairs":[{"prompt":"...","answer":"..."}]}',
        "Make each answer concise and easy to type.",
        "Prefer short-answer recall, definition, translation, reverse recall, and fill-in-the-blank prompts.",
        "Avoid yes/no questions, duplicates, trivia, and vague prompts.",
        "Cover the important concepts in the source.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Generate a high-quality study set from this source material.",
          desired_question_count: "10 to 24 depending on content density",
          source_text: sourceText.slice(0, 18_000),
        },
        null,
        2,
      ),
    },
  ];
}

function buildTitleMessages(sourceText: string) {
  return [
    {
      role: "system",
      content: [
        "You create concise study-kit titles from source material.",
        "Return JSON only in this schema:",
        '{"title":"..."}',
        "Title must be 2 to 6 words, specific, clean, and without ending punctuation.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Create a concise title for this study kit.",
          source_text: sourceText.slice(0, 12_000),
        },
        null,
        2,
      ),
    },
  ];
}

function inferSpanishLevel(sourceText: string): "none" | "beginner" | "intermediate" | "advanced" {
  const text = sourceText.toLowerCase();
  const words = text.split(/[^a-záéíóúüñ]+/).filter(Boolean);
  if (words.length === 0) {
    return "none";
  }

  const spanishSignals = new Set([
    "el", "la", "los", "las", "de", "que", "en", "y", "con", "para", "por",
    "es", "son", "ser", "estar", "soy", "eres", "estoy", "hola", "gracias", "adios",
  ]);
  const advancedSignals = [
    "subjuntivo",
    "pluscuamperfecto",
    "pretérito imperfecto",
    "voz pasiva",
    "oraciones subordinadas",
    "gramática avanzada",
    "análisis sintáctico",
    "literatura española",
  ];
  const beginnerSignals = [
    "spanish 1",
    "beginner spanish",
    "intro spanish",
    "vocab list",
    "vocabulary list",
    "translation",
    "translate",
    "class notes",
    "unit 1",
  ];

  let spanishHitCount = 0;
  for (const word of words) {
    if (spanishSignals.has(word)) {
      spanishHitCount += 1;
    }
  }

  const spanishRatio = spanishHitCount / words.length;
  const hasDiacritics = /[áéíóúüñ¿¡]/i.test(text);
  const looksSpanish = hasDiacritics || spanishRatio >= 0.08;
  if (!looksSpanish) {
    return "none";
  }

  const advancedHits = advancedSignals.filter((signal) => text.includes(signal)).length;
  if (advancedHits >= 1 || spanishRatio >= 0.22) {
    return "advanced";
  }

  const beginnerHits = beginnerSignals.filter((signal) => text.includes(signal)).length;
  if (beginnerHits >= 1 || spanishRatio < 0.12) {
    return "beginner";
  }

  return "intermediate";
}

function spanishLanguageRule(level: "none" | "beginner" | "intermediate" | "advanced"): string[] {
  if (level === "none") {
    return [];
  }

  if (level === "advanced") {
    return [
      "Spanish-specific Prompting Policy (advanced):",
      "- Since this appears advanced Spanish, mixed prompt language is allowed.",
      "- You may ask in Spanish when pedagogically useful.",
      "- Keep answers concise; include translation questions when relevant.",
      "",
    ];
  }

  return [
    `Spanish-specific Prompting Policy (${level}):`,
    "- This appears to be beginner/intermediate Spanish material.",
    "- Ask questions in English by default.",
    "- Keep the answer in Spanish when testing Spanish vocabulary/phrases.",
    "- Do NOT make the entire question set predominantly Spanish.",
    "- Prefer prompts like: 'What is <Spanish term> in English?' or 'How do you say <English term> in Spanish?'",
    "",
  ];
}

function buildOllamaQuestionPrompt(sourceText: string): string {
  const spanishLevel = inferSpanishLevel(sourceText);

  return [
    "You are generating high-quality study questions designed for active recall and fast mastery.",
    "",
    "Return ONLY valid JSON using this exact shape:",
    '{"pairs":[{"prompt":"...","answer":"..."}]}',
    "",
    "Rules:",
    "- For small inputs, generate at least 10 questions",
    "- For larger inputs, generate proportionally more (20-50+ if needed)",
    "- Each question must require a short, typed answer (1-3 words ideally)",
    "- Avoid yes/no questions",
    "- Avoid vague or overly easy questions",
    "- Prioritize important terms, definitions, translations, and key concepts",
    "- Questions must be clear, direct, and unambiguous",
    "- Answers must be concise and exact",
    "- Avoid duplicate or very similar questions",
    "",
    ...spanishLanguageRule(spanishLevel),
    "Source:",
    sourceText.slice(0, 18_000),
  ].join("\n");
}

function buildOllamaTitlePrompt(sourceText: string): string {
  return [
    "Create a concise study-kit title from the source material.",
    "Return ONLY valid JSON in this exact shape:",
    '{"title":"..."}',
    "",
    "Rules:",
    "- 2 to 6 words",
    "- No quotes in the title",
    "- No punctuation at the end",
    "- Clear and specific to the topic",
    "",
    "Source:",
    sourceText.slice(0, 12_000),
  ].join("\n");
}

function normalizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 140);
}

function parseQuestionPairs(content: string): QuestionPair[] | null {
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as { pairs?: Array<{ prompt?: string; answer?: string }> };
    if (!Array.isArray(parsed.pairs)) {
      return null;
    }

    const seen = new Set<string>();
    const pairs = parsed.pairs
      .map((item) => ({
        prompt: normalizePrompt(item.prompt ?? ""),
        answer: normalizeAnswer(item.answer ?? ""),
      }))
      .filter((item) => item.prompt.length > 6 && item.answer.length > 0)
      .filter((item) => {
        const dedupeKey = `${item.prompt.toLowerCase()}::${item.answer.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          return false;
        }
        seen.add(dedupeKey);
        return true;
      });

    return pairs.length > 0 ? pairs : null;
  } catch {
    return null;
  }
}

function parseTitle(content: string): string | null {
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as { title?: string };
    const title = (parsed.title ?? "").trim().replace(/[.!?]+$/g, "");
    if (title.length < 3) {
      return null;
    }

    return title.slice(0, 80);
  } catch {
    return null;
  }
}

const PROVIDERS: Record<GenerationProvider, ProviderDefinition> = {
  ollama: {
    keyEnvPool: "OLLAMA_API_KEYS",
    keyEnvSingle: "OLLAMA_API_KEY",
    defaultQuestionModel: "gemma3:4b",
    questionModelEnv: "OLLAMA_GENERATION_MODEL",
    defaultTitleModel: "gemma3:4b",
    titleModelEnv: "OLLAMA_TITLE_MODEL",
    async requestQuestions(apiKey, sourceText, signal) {
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
      const model = providerModel("ollama", "OLLAMA_GENERATION_MODEL", "gemma3:4b");
      const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: buildOllamaQuestionPrompt(sourceText),
          stream: false,
        }),
        signal,
      });

      const data = (await response.json()) as { response?: unknown };
      return {
        response,
        model,
        content: typeof data.response === "string" ? data.response : "",
      };
    },
    async requestTitle(apiKey, sourceText, signal) {
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
      const model = providerModel("ollama", "OLLAMA_TITLE_MODEL", "gemma3:4b");
      const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: buildOllamaTitlePrompt(sourceText),
          stream: false,
        }),
        signal,
      });

      const data = (await response.json()) as { response?: unknown };
      return {
        response,
        model,
        content: typeof data.response === "string" ? data.response : "",
      };
    },
  },
  groq: {
    keyEnvPool: "GROQ_API_KEYS",
    keyEnvSingle: "GROQ_API_KEY",
    defaultQuestionModel: "llama-3.1-8b-instant",
    questionModelEnv: "GROQ_GENERATION_MODEL",
    defaultTitleModel: "llama-3.1-8b-instant",
    titleModelEnv: "GROQ_TITLE_MODEL",
    async requestQuestions(apiKey, sourceText, signal) {
      const model = providerModel("groq", "GROQ_GENERATION_MODEL", "llama-3.1-8b-instant");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: buildQuestionMessages(sourceText),
        }),
        signal,
      });
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return {
        response,
        model,
        content: data.choices?.[0]?.message?.content ?? "",
      };
    },
    async requestTitle(apiKey, sourceText, signal) {
      const model = providerModel("groq", "GROQ_TITLE_MODEL", "llama-3.1-8b-instant");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: buildTitleMessages(sourceText),
        }),
        signal,
      });
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return {
        response,
        model,
        content: data.choices?.[0]?.message?.content ?? "",
      };
    },
  },
  openrouter: {
    keyEnvPool: "OPENROUTER_API_KEYS",
    keyEnvSingle: "OPENROUTER_API_KEY",
    defaultQuestionModel: "openai/gpt-4o-mini",
    questionModelEnv: "OPENROUTER_GENERATION_MODEL",
    defaultTitleModel: "openai/gpt-4o-mini",
    titleModelEnv: "OPENROUTER_TITLE_MODEL",
    async requestQuestions(apiKey, sourceText, signal) {
      const model = providerModel("openrouter", "OPENROUTER_GENERATION_MODEL", "openai/gpt-4o-mini");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: buildQuestionMessages(sourceText),
        }),
        signal,
      });
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return {
        response,
        model,
        content: data.choices?.[0]?.message?.content ?? "",
      };
    },
    async requestTitle(apiKey, sourceText, signal) {
      const model = providerModel("openrouter", "OPENROUTER_TITLE_MODEL", "openai/gpt-4o-mini");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: buildTitleMessages(sourceText),
        }),
        signal,
      });
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return {
        response,
        model,
        content: data.choices?.[0]?.message?.content ?? "",
      };
    },
  },
};

function readKeyPool(provider: GenerationProvider): string[] {
  const definition = PROVIDERS[provider];
  const poolEnv = process.env[definition.keyEnvPool];
  const singleEnv = process.env[definition.keyEnvSingle];
  const raw = (poolEnv && poolEnv.trim().length > 0 ? poolEnv : singleEnv) ?? "";

  return raw
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function rotatedKeys(provider: GenerationProvider): string[] {
  const keys = readKeyPool(provider);
  if (keys.length <= 1) {
    return keys;
  }

  const cursor = keyRotationCursor[provider] % keys.length;
  keyRotationCursor[provider] = (keyRotationCursor[provider] + 1) % keys.length;
  return [...keys.slice(cursor), ...keys.slice(0, cursor)];
}

async function requestQuestionsFromProvider(
  provider: GenerationProvider,
  apiKey: string,
  sourceText: string,
): Promise<QuestionAttemptResult> {
  const timeoutMs = Number(process.env.GENERATION_TIMEOUT_MS ?? 4800);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const definition = PROVIDERS[provider];
  const model = providerModel(provider, definition.questionModelEnv, definition.defaultQuestionModel);

  try {
    const result = await definition.requestQuestions(apiKey, sourceText, controller.signal);
    if (!result) {
      return {
        pairs: null,
        failure: {
          provider,
          task: "questions",
          model,
          kind: "empty_response",
          latencyMs: Date.now() - started,
        },
      };
    }

    if (!result.response.ok) {
      return {
        pairs: null,
        failure: {
          provider,
          task: "questions",
          model: result.model,
          kind: "http_error",
          latencyMs: Date.now() - started,
          httpStatus: result.response.status,
        },
      };
    }

    const pairs = parseQuestionPairs(result.content);
    if (!pairs) {
      return {
        pairs: null,
        failure: {
          provider,
          task: "questions",
          model: result.model,
          kind: "parse_error",
          latencyMs: Date.now() - started,
        },
      };
    }

    return { pairs, model: result.model, latencyMs: Date.now() - started, failure: null };
  } catch (error) {
    const kind: ProviderFailureKind =
      error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error";
    return {
      pairs: null,
      failure: {
        provider,
        task: "questions",
        model,
        kind,
        latencyMs: Date.now() - started,
        message: summarizeErrorMessage(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestTitleFromProvider(
  provider: GenerationProvider,
  apiKey: string,
  sourceText: string,
): Promise<TitleAttemptResult> {
  const timeoutMs = Number(process.env.GENERATION_TIMEOUT_MS ?? 4200);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const definition = PROVIDERS[provider];
  const model = providerModel(provider, definition.titleModelEnv, definition.defaultTitleModel);

  try {
    const result = await definition.requestTitle(apiKey, sourceText, controller.signal);
    if (!result) {
      return {
        title: null,
        failure: {
          provider,
          task: "title",
          model,
          kind: "empty_response",
          latencyMs: Date.now() - started,
        },
      };
    }

    if (!result.response.ok) {
      return {
        title: null,
        failure: {
          provider,
          task: "title",
          model: result.model,
          kind: "http_error",
          latencyMs: Date.now() - started,
          httpStatus: result.response.status,
        },
      };
    }

    const title = parseTitle(result.content);
    if (!title) {
      return {
        title: null,
        failure: {
          provider,
          task: "title",
          model: result.model,
          kind: "parse_error",
          latencyMs: Date.now() - started,
        },
      };
    }

    return { title, model: result.model, latencyMs: Date.now() - started, failure: null };
  } catch (error) {
    const kind: ProviderFailureKind =
      error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error";
    return {
      title: null,
      failure: {
        provider,
        task: "title",
        model,
        kind,
        latencyMs: Date.now() - started,
        message: summarizeErrorMessage(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateQuestionPairsWithProviderMetadata(
  sourceText: string,
): Promise<ProviderQuestionGenerationResult> {
  const providers = normalizeProviderList(process.env.GENERATION_PROVIDERS);
  let sawFailure = false;
  for (const provider of providers) {
    const keys = rotatedKeys(provider);
    for (const key of keys) {
      const attempt = await requestQuestionsFromProvider(provider, key, sourceText);
      if (attempt.pairs) {
        logGenerationSuccess({
          provider,
          task: "questions",
          model: attempt.model ?? providerModel(provider, PROVIDERS[provider].questionModelEnv, PROVIDERS[provider].defaultQuestionModel),
          latencyMs: attempt.latencyMs ?? 0,
          recoveredAfterFallback: sawFailure,
          pairCount: attempt.pairs.length,
        });
        return {
          pairs: attempt.pairs,
          provider,
          model: attempt.model ?? providerModel(provider, PROVIDERS[provider].questionModelEnv, PROVIDERS[provider].defaultQuestionModel),
        };
      }
      if (attempt.failure) {
        sawFailure = true;
        logGenerationFailure(attempt.failure);
      }
    }
  }

  await recordProductEvent({
    name: "provider_failure",
    properties: {
      subsystem: "generation_questions",
      providersTried: providers,
    },
  });

  return {
    pairs: null,
    provider: null,
    model: null,
  };
}

export async function generateQuestionPairsWithProviders(sourceText: string): Promise<QuestionPair[] | null> {
  const result = await generateQuestionPairsWithProviderMetadata(sourceText);
  return result.pairs;
}

export async function generateTitleWithProviders(sourceText: string): Promise<string | null> {
  const providers = normalizeProviderList(process.env.GENERATION_PROVIDERS);
  let sawFailure = false;
  for (const provider of providers) {
    const keys = rotatedKeys(provider);
    for (const key of keys) {
      const attempt = await requestTitleFromProvider(provider, key, sourceText);
      if (attempt.title) {
        logGenerationSuccess({
          provider,
          task: "title",
          model: attempt.model ?? providerModel(provider, PROVIDERS[provider].titleModelEnv, PROVIDERS[provider].defaultTitleModel),
          latencyMs: attempt.latencyMs ?? 0,
          recoveredAfterFallback: sawFailure,
        });
        return attempt.title;
      }
      if (attempt.failure) {
        sawFailure = true;
        logGenerationFailure(attempt.failure);
      }
    }
  }

  await recordProductEvent({
    name: "provider_failure",
    properties: {
      subsystem: "generation_title",
      providersTried: providers,
    },
  });

  return null;
}
