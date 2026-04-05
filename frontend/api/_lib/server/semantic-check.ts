type AnswerCheckProvider = "groq" | "openrouter";

export type SemanticCheckResult = {
  isCorrect: boolean;
  confidence: number;
  reason: string;
  provider: AnswerCheckProvider;
  model: string;
  latencyMs: number;
};

type SemanticResponse = {
  is_correct?: boolean;
  confidence?: number;
  reason?: string;
};

const keyRotationCursor: Record<AnswerCheckProvider, number> = {
  groq: 0,
  openrouter: 0,
};

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeProviderList(raw: string | undefined): AnswerCheckProvider[] {
  if (!raw) {
    return ["groq", "openrouter"];
  }

  const items = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const providers: AnswerCheckProvider[] = [];
  for (const item of items) {
    if (item === "groq" || item === "openrouter") {
      providers.push(item);
    }
  }

  return providers.length > 0 ? providers : ["groq", "openrouter"];
}

function buildMessages(payload: { prompt: string; canonicalAnswer: string; userAnswer: string }) {
  return [
    {
      role: "system",
      content: [
        "You grade short study answers.",
        "Return JSON only in this schema:",
        '{"is_correct":boolean,"confidence":number,"reason":string}',
        "Use semantic equivalence.",
        "Accept paraphrases/synonyms when meaning matches.",
        "Reject wrong concepts even if wording overlaps.",
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

function parseContentToSemantic(content: string): SemanticResponse | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed) as SemanticResponse;
    } catch {
      return null;
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as SemanticResponse;
  } catch {
    return null;
  }
}

function readKeyPool(provider: AnswerCheckProvider): string[] {
  const poolEnv = provider === "groq" ? process.env.GROQ_API_KEYS : process.env.OPENROUTER_API_KEYS;
  const singleEnv = provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  const raw = (poolEnv && poolEnv.trim().length > 0 ? poolEnv : singleEnv) ?? "";

  return raw
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function rotatedKeys(provider: AnswerCheckProvider): string[] {
  const keys = readKeyPool(provider);
  if (keys.length <= 1) {
    return keys;
  }

  const cursor = keyRotationCursor[provider] % keys.length;
  keyRotationCursor[provider] = (keyRotationCursor[provider] + 1) % keys.length;
  return [...keys.slice(cursor), ...keys.slice(0, cursor)];
}

async function requestProvider(
  provider: AnswerCheckProvider,
  apiKey: string,
  payload: { prompt: string; canonicalAnswer: string; userAnswer: string },
): Promise<SemanticCheckResult | null> {
  const timeoutMs = Number(process.env.SEMANTIC_ANSWER_TIMEOUT_MS ?? 2800);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    if (provider === "groq") {
      const model = process.env.GROQ_ANSWER_CHECK_MODEL ?? "llama-3.1-8b-instant";
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
          messages: buildMessages(payload),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseContentToSemantic(content);
      if (!parsed || typeof parsed.is_correct !== "boolean") {
        return null;
      }

      return {
        isCorrect: parsed.is_correct,
        confidence: clampConfidence(parsed.confidence),
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : "",
        provider,
        model,
        latencyMs: Date.now() - started,
      };
    }

    const model = process.env.OPENROUTER_ANSWER_CHECK_MODEL ?? "openai/gpt-4o-mini";
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
        messages: buildMessages(payload),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseContentToSemantic(content);
    if (!parsed || typeof parsed.is_correct !== "boolean") {
      return null;
    }

    return {
      isCorrect: parsed.is_correct,
      confidence: clampConfidence(parsed.confidence),
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : "",
      provider,
      model,
      latencyMs: Date.now() - started,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function semanticCheckAnswer(payload: {
  prompt: string;
  canonicalAnswer: string;
  userAnswer: string;
}): Promise<SemanticCheckResult | null> {
  const trimmedAnswer = payload.userAnswer.trim();
  if (trimmedAnswer.length < 2) {
    return null;
  }

  const providers = normalizeProviderList(process.env.ANSWER_CHECK_PROVIDERS);
  for (const provider of providers) {
    const keys = rotatedKeys(provider);
    for (const key of keys) {
      const result = await requestProvider(provider, key, payload);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

export function semanticPassesThreshold(result: SemanticCheckResult | null): boolean {
  if (!result) {
    return false;
  }
  const minimum = Number(process.env.SEMANTIC_ANSWER_MIN_CONFIDENCE ?? 0.64);
  return result.isCorrect && result.confidence >= minimum;
}
