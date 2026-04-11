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
    label: "ATP full form",
    prompt: "What does ATP stand for?",
    canonicalAnswer: "adenosine triphosphate",
    userAnswer: "adenosine triphosphate",
    expected: true,
  },
  {
    label: "ATP abbreviation accepted",
    prompt: "What does ATP stand for?",
    canonicalAnswer: "adenosine triphosphate",
    userAnswer: "ATP",
    expected: true,
  },
  {
    label: "Photosynthesis paraphrase",
    prompt: "What process turns light into stored chemical energy in plants?",
    canonicalAnswer: "photosynthesis",
    userAnswer: "the process is photosynthesis",
    expected: true,
  },
  {
    label: "Wrong biology concept",
    prompt: "What process turns light into stored chemical energy in plants?",
    canonicalAnswer: "photosynthesis",
    userAnswer: "cellular respiration",
    expected: false,
  },
  {
    label: "Mitochondria paraphrase",
    prompt: "What is the powerhouse of the cell?",
    canonicalAnswer: "mitochondria",
    userAnswer: "the mitochondrion",
    expected: true,
  },
  {
    label: "Wrong organelle",
    prompt: "What is the powerhouse of the cell?",
    canonicalAnswer: "mitochondria",
    userAnswer: "ribosome",
    expected: false,
  },
  {
    label: "Spanish translation exact",
    prompt: "How do you say 'hello' in Spanish?",
    canonicalAnswer: "hola",
    userAnswer: "hola",
    expected: true,
  },
  {
    label: "Spanish translation wrong",
    prompt: "How do you say 'hello' in Spanish?",
    canonicalAnswer: "hola",
    userAnswer: "adios",
    expected: false,
  },
  {
    label: "Cell membrane synonym",
    prompt: "What structure controls what enters and leaves the cell?",
    canonicalAnswer: "cell membrane",
    userAnswer: "plasma membrane",
    expected: true,
  },
  {
    label: "Cell membrane near concept wrong",
    prompt: "What structure controls what enters and leaves the cell?",
    canonicalAnswer: "cell membrane",
    userAnswer: "cell wall",
    expected: false,
  },
  {
    label: "Water formula",
    prompt: "What is the chemical formula for water?",
    canonicalAnswer: "H2O",
    userAnswer: "h2o",
    expected: true,
  },
  {
    label: "Water wrong formula",
    prompt: "What is the chemical formula for water?",
    canonicalAnswer: "H2O",
    userAnswer: "CO2",
    expected: false,
  },
  {
    label: "French Revolution date exact",
    prompt: "What year did the French Revolution begin?",
    canonicalAnswer: "1789",
    userAnswer: "1789",
    expected: true,
  },
  {
    label: "French Revolution date sentence",
    prompt: "What year did the French Revolution begin?",
    canonicalAnswer: "1789",
    userAnswer: "It began in 1789.",
    expected: true,
  },
  {
    label: "French Revolution wrong date",
    prompt: "What year did the French Revolution begin?",
    canonicalAnswer: "1789",
    userAnswer: "1799",
    expected: false,
  },
  {
    label: "Osmosis definition synonym",
    prompt: "What is osmosis?",
    canonicalAnswer: "movement of water across a semipermeable membrane",
    userAnswer: "diffusion of water through a selectively permeable membrane",
    expected: true,
  },
  {
    label: "Osmosis wrong substance",
    prompt: "What is osmosis?",
    canonicalAnswer: "movement of water across a semipermeable membrane",
    userAnswer: "movement of glucose across a membrane",
    expected: false,
  },
  {
    label: "Quadratic formula concept",
    prompt: "What formula solves ax^2 + bx + c = 0?",
    canonicalAnswer: "quadratic formula",
    userAnswer: "the quadratic formula",
    expected: true,
  },
  {
    label: "Quadratic wrong formula",
    prompt: "What formula solves ax^2 + bx + c = 0?",
    canonicalAnswer: "quadratic formula",
    userAnswer: "pythagorean theorem",
    expected: false,
  },
  {
    label: "Constitution branch",
    prompt: "Which branch interprets the laws?",
    canonicalAnswer: "judicial branch",
    userAnswer: "the judiciary",
    expected: true,
  },
  {
    label: "Constitution wrong branch",
    prompt: "Which branch interprets the laws?",
    canonicalAnswer: "judicial branch",
    userAnswer: "legislative branch",
    expected: false,
  },
];

const providerOrder = (process.argv
  .find((arg) => arg.startsWith("--providers="))
  ?.split("=")[1] ?? process.env.ANSWER_CHECK_PROVIDERS ?? "ollama,groq,openrouter")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function buildMessages(payload) {
  return [
    {
      role: "system",
      content: [
        "You grade short study answers.",
        "Return JSON only in this schema:",
        '{"is_correct":boolean,"confidence":number,"reason":string}',
        "Use semantic equivalence.",
        "Accept paraphrases, synonyms, abbreviations, and clearly correct alternate phrasings when the meaning matches.",
        "Reject answers that describe the wrong concept even if wording overlaps.",
        "Confidence must be between 0 and 1.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          question: payload.prompt,
          canonical_answer: payload.canonicalAnswer,
          user_answer: payload.userAnswer,
        },
        null,
        2,
      ),
    },
  ];
}

function buildOllamaPrompt(payload) {
  return [
    "You grade short study answers.",
    "Return ONLY valid JSON using this exact schema:",
    '{"is_correct":boolean,"confidence":number,"reason":string}',
    "",
    "Rules:",
    "- Use semantic equivalence.",
    "- Accept paraphrases, synonyms, abbreviations, and clearly correct alternate phrasings when the meaning matches.",
    "- Reject wrong concepts even if wording overlaps.",
    "- Confidence must be between 0 and 1.",
    "",
    "Question:",
    payload.prompt,
    "",
    "Canonical answer:",
    payload.canonicalAnswer,
    "",
    "User answer:",
    payload.userAnswer,
  ].join("\n");
}

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

function parseResult(text) {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.is_correct !== "boolean") {
      return null;
    }
    return {
      isCorrect: parsed.is_correct,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return null;
  }
}

function readKeys(provider) {
  const envMap = {
    ollama: [process.env.OLLAMA_API_KEYS, process.env.OLLAMA_API_KEY],
    groq: [process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY],
    openrouter: [process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY],
  };
  const raw = envMap[provider]?.find((value) => value && value.trim().length > 0) ?? "";
  return raw
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function requestProvider(provider, apiKey, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SEMANTIC_ANSWER_TIMEOUT_MS ?? 2800));
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
          model: process.env.OLLAMA_ANSWER_CHECK_MODEL ?? process.env.OLLAMA_MODEL ?? "gemma3:4b",
          prompt: buildOllamaPrompt(payload),
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        return { ok: false, status: response.status, latencyMs: Date.now() - started };
      }
      const data = await response.json();
      const parsed = parseResult(data.response);
      return { ok: Boolean(parsed), status: response.status, latencyMs: Date.now() - started, parsed };
    }

    if (provider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_ANSWER_CHECK_MODEL ?? "llama-3.1-8b-instant",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: buildMessages(payload),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        return { ok: false, status: response.status, latencyMs: Date.now() - started };
      }
      const data = await response.json();
      const parsed = parseResult(data.choices?.[0]?.message?.content ?? "");
      return { ok: Boolean(parsed), status: response.status, latencyMs: Date.now() - started, parsed };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_ANSWER_CHECK_MODEL ?? "openai/gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: buildMessages(payload),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, status: response.status, latencyMs: Date.now() - started };
    }
    const data = await response.json();
    const parsed = parseResult(data.choices?.[0]?.message?.content ?? "");
    return { ok: Boolean(parsed), status: response.status, latencyMs: Date.now() - started, parsed };
  } catch (error) {
    return {
      ok: false,
      status: String(error && error.name ? error.name : "error"),
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const providers = providerOrder.filter((provider) => provider === "ollama" || provider === "groq" || provider === "openrouter");
  const summary = [];

  for (const provider of providers) {
    const keys = readKeys(provider);
    if (keys.length === 0) {
      summary.push({ provider, available: false, reason: "No API key configured" });
      continue;
    }

    let correct = 0;
    let completed = 0;
    let confidenceTotal = 0;
    let latencyTotal = 0;
    let unavailable = 0;
    const misses = [];

    for (const row of dataset) {
      let result = null;
      for (const key of keys) {
        result = await requestProvider(provider, key, row);
        if (result.ok) {
          break;
        }
      }

      if (!result || !result.ok || !result.parsed) {
        unavailable += 1;
        misses.push(`${row.label}: unavailable`);
        continue;
      }

      completed += 1;
      latencyTotal += result.latencyMs;
      confidenceTotal += result.parsed.confidence;
      const matched = result.parsed.isCorrect === row.expected;
      if (matched) {
        correct += 1;
      } else {
        misses.push(
          `${row.label}: expected ${row.expected ? "correct" : "incorrect"}, got ${result.parsed.isCorrect ? "correct" : "incorrect"} (${result.parsed.reason || "no reason"})`,
        );
      }
    }

    summary.push({
      provider,
      available: true,
      completed,
      correct,
      unavailable,
      accuracy: completed > 0 ? correct / completed : 0,
      avgConfidence: completed > 0 ? confidenceTotal / completed : 0,
      avgLatencyMs: completed > 0 ? latencyTotal / completed : 0,
      misses,
    });
  }

  console.log("\nSemantic answer-check provider evaluation\n");
  for (const row of summary) {
    if (!row.available) {
      console.log(`- ${row.provider}: unavailable (${row.reason})`);
      continue;
    }

    console.log(
      `- ${row.provider}: accuracy ${formatPct(row.accuracy)}, completed ${row.completed}/${dataset.length}, unavailable ${row.unavailable}, avg confidence ${row.avgConfidence.toFixed(2)}, avg latency ${row.avgLatencyMs.toFixed(0)}ms`,
    );
    if (row.misses.length > 0) {
      for (const miss of row.misses.slice(0, 6)) {
        console.log(`  - ${miss}`);
      }
    }
  }

  const ranked = summary
    .filter((row) => row.available && row.completed > 0)
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return a.avgLatencyMs - b.avgLatencyMs;
    });

  if (ranked.length > 0) {
    const winner = ranked[0];
    console.log(`\nBest provider on this dataset: ${winner.provider} (${formatPct(winner.accuracy)}, ${winner.avgLatencyMs.toFixed(0)}ms avg latency)`);
  } else {
    console.log("\nNo provider produced usable results.");
    process.exitCode = 1;
  }
}

await main();
