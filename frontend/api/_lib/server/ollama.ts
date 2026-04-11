const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:0.8b";

function hasOllamaConfig(): boolean {
  return Boolean(process.env.OLLAMA_API_KEY);
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

type SpanishLevel = "none" | "beginner" | "intermediate" | "advanced";

function inferSpanishLevel(sourceText: string): SpanishLevel {
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

function spanishLanguageRule(level: SpanishLevel): string[] {
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

export async function generateQuestionPairsWithOllama(
  sourceText: string,
): Promise<Array<{ prompt: string; answer: string }> | null> {
  if (!hasOllamaConfig()) {
    return null;
  }

  const spanishLevel = inferSpanishLevel(sourceText);

  const prompt = [
    "You are generating high-quality study questions designed for active recall and fast mastery.",
    "",
    "Return ONLY valid JSON using this exact shape:",
    '{"pairs":[{"prompt":"...","answer":"..."}]}',
    "",
    "Rules:",
    "Generate enough high-quality questions to cover the important concepts in the source material.",
    "- For small inputs, generate at least 10 questions",
    "- For larger inputs, generate proportionally more (20–50+ if needed)",
    "- Do not limit artificially",
    "- Each question must require a short, typed answer (1–3 words ideally)",
    "- Avoid yes/no questions",
    "- Avoid vague or overly easy questions",
    "- Prioritize important terms, definitions, translations, and key concepts",
    "- Questions must be clear, direct, and unambiguous",
    "",
    "Question Types (mix these):",
    '- Definition: "What is X?"',
    '- Recall: "Define X"',
    '- Translation (if applicable): "What is X in [language]?"',
    '- Fill-in-the-blank: "X is _____"',
    '- Reverse recall: "Which term means _____?"',
    "",
    "Quality Rules:",
    "- Answers must be concise and exact",
    "- Avoid duplicate or very similar questions",
    "- Focus on information that is useful to memorize",
    "- Prefer specificity over generality",
    "- Avoid redundancy",
    "- Do not generate multiple questions that test the exact same fact unless necessary",
    "",
    ...spanishLanguageRule(spanishLevel),
    "Source:",
    sourceText.slice(0, 18_000),
  ].join("\n");

  let rawText = "";
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { response?: unknown };
    rawText = typeof data.response === "string" ? data.response : "";
  } catch {
    return null;
  }

  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as { pairs?: Array<{ prompt?: string; answer?: string }> };
    if (!Array.isArray(parsed.pairs)) {
      return null;
    }

    const pairs = parsed.pairs
      .map((item) => ({
        prompt: (item.prompt ?? "").trim(),
        answer: (item.answer ?? "").trim(),
      }))
      .filter((item) => item.prompt.length > 2 && item.answer.length > 0);

    return pairs.length > 0 ? pairs : null;
  } catch {
    return null;
  }
}

export async function generateTitleWithOllama(sourceText: string): Promise<string | null> {
  if (!hasOllamaConfig()) {
    return null;
  }

  const prompt = [
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

  let rawText = "";
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { response?: unknown };
    rawText = typeof data.response === "string" ? data.response : "";
  } catch {
    return null;
  }

  const jsonText = extractJsonObject(rawText);
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
