import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(frontendDir, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(frontendDir, ".env.local"), override: true });

const dataset = [
  {
    label: "Biology notes",
    text: `
Photosynthesis is the process plants use to convert light energy into chemical energy. Chlorophyll in the chloroplast absorbs sunlight. Water and carbon dioxide are used to produce glucose and oxygen. The light-dependent reactions happen in the thylakoid membranes. The Calvin cycle happens in the stroma.
    `.trim(),
  },
  {
    label: "Spanish vocabulary",
    text: `
hola: hello
adios: goodbye
gracias: thank you
por favor: please
¿Cómo estás?: How are you?
    `.trim(),
  },
  {
    label: "History study guide",
    text: `
The French Revolution began in 1789. The Estates-General was called because of a financial crisis. The storming of the Bastille became a symbol of revolt. The Reign of Terror was associated with Maximilien Robespierre. Napoleon Bonaparte eventually rose to power after the revolution.
    `.trim(),
  },
];

const providerOrder = (process.argv
  .find((arg) => arg.startsWith("--providers="))
  ?.split("=")[1] ?? process.env.GENERATION_PROVIDERS ?? "groq,openrouter,ollama")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function extractJsonObject(text) {
  const trimmed = String(text ?? "").trim();
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

function parseQuestionPairs(text) {
  const jsonText = extractJsonObject(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.pairs)) return null;
    return parsed.pairs
      .map((item) => ({
        prompt: String(item.prompt ?? "").trim().replace(/\s+/g, " "),
        answer: String(item.answer ?? "").trim().replace(/\s+/g, " "),
      }))
      .filter((item) => item.prompt.length > 6 && item.answer.length > 0);
  } catch {
    return null;
  }
}

function parseTitle(text) {
  const jsonText = extractJsonObject(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText);
    const title = String(parsed.title ?? "").trim().replace(/[.!?]+$/g, "");
    return title.length >= 3 ? title : null;
  } catch {
    return null;
  }
}

function readModel(envName, fallback) {
  const value = process.env[envName];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readKeys(provider) {
  const envMap = {
    ollama: [process.env.OLLAMA_API_KEYS, process.env.OLLAMA_API_KEY],
    groq: [process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY],
    openrouter: [process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY],
  };

  return (envMap[provider] ?? [])
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[\n,]+/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildQuestionMessages(sourceText) {
  return [
    {
      role: "system",
      content: [
        "You generate active-recall study questions from source material.",
        "Return JSON only in this schema:",
        '{"pairs":[{"prompt":"...","answer":"..."}]}',
        "Make each answer concise and easy to type.",
        "Avoid yes/no questions, duplicates, and vague prompts.",
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

function buildTitleMessages(sourceText) {
  return [
    {
      role: "system",
      content: [
        "You create concise study-kit titles from source material.",
        "Return JSON only in this schema:",
        '{"title":"..."}',
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

function buildOllamaQuestionPrompt(sourceText) {
  return [
    "You are generating high-quality study questions designed for active recall and fast mastery.",
    "Return ONLY valid JSON using this exact shape:",
    '{"pairs":[{"prompt":"...","answer":"..."}]}',
    "- Generate enough high-quality questions to cover the material",
    "- Keep answers short and exact",
    "- Avoid duplicates and yes/no questions",
    "Source:",
    sourceText.slice(0, 18_000),
  ].join("\n");
}

function buildOllamaTitlePrompt(sourceText) {
  return [
    "Create a concise study-kit title from the source material.",
    "Return ONLY valid JSON in this exact shape:",
    '{"title":"..."}',
    "Source:",
    sourceText.slice(0, 12_000),
  ].join("\n");
}

async function requestProvider(provider, task, sourceText) {
  const keys = readKeys(provider);
  if (keys.length === 0) {
    return { ok: false, error: "missing_key" };
  }

  const apiKey = keys[0];
  const started = Date.now();

  try {
    if (provider === "ollama") {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api"}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: task === "questions"
            ? readModel("OLLAMA_GENERATION_MODEL", readModel("OLLAMA_MODEL", "gemma3:4b"))
            : readModel("OLLAMA_TITLE_MODEL", readModel("OLLAMA_MODEL", "gemma3:4b")),
          prompt: task === "questions" ? buildOllamaQuestionPrompt(sourceText) : buildOllamaTitlePrompt(sourceText),
          stream: false,
        }),
      });

      const data = await response.json();
      return {
        ok: response.ok,
        latencyMs: Date.now() - started,
        raw: typeof data.response === "string" ? data.response : "",
        status: response.status,
      };
    }

    const endpoint = provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const model = provider === "groq"
      ? (task === "questions" ? readModel("GROQ_GENERATION_MODEL", "llama-3.1-8b-instant") : readModel("GROQ_TITLE_MODEL", "llama-3.1-8b-instant"))
      : (task === "questions" ? readModel("OPENROUTER_GENERATION_MODEL", "openai/gpt-4o-mini") : readModel("OPENROUTER_TITLE_MODEL", "openai/gpt-4o-mini"));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: task === "questions" ? 0.2 : 0,
        response_format: { type: "json_object" },
        messages: task === "questions" ? buildQuestionMessages(sourceText) : buildTitleMessages(sourceText),
      }),
    });
    const data = await response.json();
    return {
      ok: response.ok,
      latencyMs: Date.now() - started,
      raw: data.choices?.[0]?.message?.content ?? "",
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown_error",
      latencyMs: Date.now() - started,
    };
  }
}

function scorePairs(pairs) {
  if (!pairs || pairs.length === 0) {
    return 0;
  }

  const uniquePromptCount = new Set(pairs.map((pair) => pair.prompt.toLowerCase())).size;
  const shortAnswerCount = pairs.filter((pair) => pair.answer.split(/\s+/).length <= 5).length;
  const questionPromptCount = pairs.filter((pair) => /\?$|fill the blank|define|which term|what/i.test(pair.prompt)).length;

  const countScore = Math.min(1, pairs.length / 10) * 40;
  const uniquenessScore = (uniquePromptCount / pairs.length) * 30;
  const shortAnswerScore = (shortAnswerCount / pairs.length) * 20;
  const promptShapeScore = (questionPromptCount / pairs.length) * 10;

  return Math.round(countScore + uniquenessScore + shortAnswerScore + promptShapeScore);
}

async function runProvider(provider) {
  const records = [];

  for (const sample of dataset) {
    const questionResult = await requestProvider(provider, "questions", sample.text);
    const titleResult = await requestProvider(provider, "title", sample.text);
    const pairs = questionResult.ok ? parseQuestionPairs(questionResult.raw) : null;
    const title = titleResult.ok ? parseTitle(titleResult.raw) : null;

    records.push({
      label: sample.label,
      questionOk: Boolean(pairs),
      titleOk: Boolean(title),
      pairCount: pairs?.length ?? 0,
      qualityScore: scorePairs(pairs),
      questionLatencyMs: questionResult.latencyMs ?? null,
      titleLatencyMs: titleResult.latencyMs ?? null,
      questionStatus: questionResult.status ?? questionResult.error ?? null,
      titleStatus: titleResult.status ?? titleResult.error ?? null,
    });
  }

  const successfulQuestionRuns = records.filter((record) => record.questionOk);
  const successfulTitleRuns = records.filter((record) => record.titleOk);

  return {
    provider,
    questionSuccessRate: `${successfulQuestionRuns.length}/${records.length}`,
    titleSuccessRate: `${successfulTitleRuns.length}/${records.length}`,
    averageQuestionLatencyMs: successfulQuestionRuns.length
      ? Math.round(successfulQuestionRuns.reduce((sum, record) => sum + record.questionLatencyMs, 0) / successfulQuestionRuns.length)
      : null,
    averageTitleLatencyMs: successfulTitleRuns.length
      ? Math.round(successfulTitleRuns.reduce((sum, record) => sum + record.titleLatencyMs, 0) / successfulTitleRuns.length)
      : null,
    averageQualityScore: successfulQuestionRuns.length
      ? Math.round(successfulQuestionRuns.reduce((sum, record) => sum + record.qualityScore, 0) / successfulQuestionRuns.length)
      : 0,
    records,
  };
}

async function main() {
  const providers = providerOrder.filter((provider) =>
    provider === "ollama" || provider === "groq" || provider === "openrouter"
  );

  if (providers.length === 0) {
    console.error("No providers requested.");
    process.exit(1);
  }

  for (const provider of providers) {
    const result = await runProvider(provider);
    console.log(`\n=== ${provider.toUpperCase()} ===`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
