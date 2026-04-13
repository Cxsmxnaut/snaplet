type AnswerCheckProvider = "ollama" | "groq" | "openrouter";

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

type SemanticPayload = {
  prompt: string;
  canonicalAnswer: string;
  userAnswer: string;
};

type ProviderFailureKind = "http_error" | "timeout" | "network_error" | "empty_response" | "parse_error";

type ProviderAttemptFailure = {
  provider: AnswerCheckProvider;
  model: string;
  kind: ProviderFailureKind;
  latencyMs: number;
  httpStatus?: number;
  message?: string;
};

type ProviderAttemptResult = {
  result: SemanticCheckResult | null;
  failure: ProviderAttemptFailure | null;
};

type ProviderDefinition = {
  keyEnvPool: string;
  keyEnvSingle: string;
  defaultModel: string;
  modelEnv: string;
  request: (apiKey: string, payload: SemanticPayload, signal: AbortSignal) => Promise<{
    response: Response;
    model: string;
    content: string;
  } | null>;
};

const DEFAULT_PROVIDER_ORDER: AnswerCheckProvider[] = ["ollama", "groq", "openrouter"];

const keyRotationCursor: Record<AnswerCheckProvider, number> = {
  ollama: 0,
  groq: 0,
  openrouter: 0,
};

function semanticLogMode(): "failures" | "verbose" | "silent" {
  const raw = (process.env.SEMANTIC_ANSWER_LOGGING ?? "failures").trim().toLowerCase();
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

function logSemanticFailure(failure: ProviderAttemptFailure): void {
  if (semanticLogMode() === "silent") {
    return;
  }

  console.warn("[semantic-check] provider failed", {
    provider: failure.provider,
    model: failure.model,
    kind: failure.kind,
    latencyMs: failure.latencyMs,
    httpStatus: failure.httpStatus,
    message: failure.message,
  });
}

function logSemanticSuccess(result: SemanticCheckResult, recoveredAfterFallback: boolean): void {
  if (semanticLogMode() !== "verbose" && !recoveredAfterFallback) {
    return;
  }

  console.info("[semantic-check] provider accepted", {
    provider: result.provider,
    model: result.model,
    confidence: result.confidence,
    isCorrect: result.isCorrect,
    latencyMs: result.latencyMs,
    recoveredAfterFallback,
  });
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function providerModel(provider: AnswerCheckProvider, modelEnv: string, defaultModel: string): string {
  if (provider === "ollama") {
    return process.env[modelEnv] ?? process.env.OLLAMA_MODEL ?? defaultModel;
  }
  return process.env[modelEnv] ?? defaultModel;
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

function normalizeProviderList(raw: string | undefined): AnswerCheckProvider[] {
  if (!raw) {
    return DEFAULT_PROVIDER_ORDER;
  }

  const items = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const providers: AnswerCheckProvider[] = [];
  for (const item of items) {
    if (item === "ollama" || item === "groq" || item === "openrouter") {
      providers.push(item);
    }
  }

  return providers.length > 0 ? providers : DEFAULT_PROVIDER_ORDER;
}

function buildMessages(payload: SemanticPayload) {
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

function buildOllamaPrompt(payload: SemanticPayload): string {
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

function parseContentToSemantic(content: string): SemanticResponse | null {
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText) as SemanticResponse;
  } catch {
    return null;
  }
}

const PROVIDERS: Record<AnswerCheckProvider, ProviderDefinition> = {
  ollama: {
    keyEnvPool: "OLLAMA_API_KEYS",
    keyEnvSingle: "OLLAMA_API_KEY",
    defaultModel: "gemma3:4b",
    modelEnv: "OLLAMA_ANSWER_CHECK_MODEL",
    async request(apiKey, payload, signal) {
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
      const model = providerModel("ollama", "OLLAMA_ANSWER_CHECK_MODEL", "gemma3:4b");
      const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: buildOllamaPrompt(payload),
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
    defaultModel: "llama-3.1-8b-instant",
    modelEnv: "GROQ_ANSWER_CHECK_MODEL",
    async request(apiKey, payload, signal) {
      const model = providerModel("groq", "GROQ_ANSWER_CHECK_MODEL", "llama-3.1-8b-instant");
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
        signal,
      });

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
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
    defaultModel: "openai/gpt-4o-mini",
    modelEnv: "OPENROUTER_ANSWER_CHECK_MODEL",
    async request(apiKey, payload, signal) {
      const model = providerModel("openrouter", "OPENROUTER_ANSWER_CHECK_MODEL", "openai/gpt-4o-mini");
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
        signal,
      });

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return {
        response,
        model,
        content: data.choices?.[0]?.message?.content ?? "",
      };
    },
  },
};

function readKeyPool(provider: AnswerCheckProvider): string[] {
  const definition = PROVIDERS[provider];
  const poolEnv = process.env[definition.keyEnvPool];
  const singleEnv = process.env[definition.keyEnvSingle];
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
  payload: SemanticPayload,
): Promise<ProviderAttemptResult> {
  const timeoutMs = Number(process.env.SEMANTIC_ANSWER_TIMEOUT_MS ?? 2800);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const definition = PROVIDERS[provider];
  const model = providerModel(provider, definition.modelEnv, definition.defaultModel);

  try {
    const result = await definition.request(apiKey, payload, controller.signal);
    if (!result) {
      return {
        result: null,
        failure: {
          provider,
          model,
          kind: "empty_response",
          latencyMs: Date.now() - started,
        },
      };
    }

    if (!result.response.ok) {
      return {
        result: null,
        failure: {
          provider,
          model: result.model,
          kind: "http_error",
          latencyMs: Date.now() - started,
          httpStatus: result.response.status,
        },
      };
    }

    const parsed = parseContentToSemantic(result.content);
    if (!parsed || typeof parsed.is_correct !== "boolean") {
      return {
        result: null,
        failure: {
          provider,
          model: result.model,
          kind: "parse_error",
          latencyMs: Date.now() - started,
        },
      };
    }

    return {
      result: {
        isCorrect: parsed.is_correct,
        confidence: clampConfidence(parsed.confidence),
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : "",
        provider,
        model: result.model,
        latencyMs: Date.now() - started,
      },
      failure: null,
    };
  } catch (error) {
    const kind: ProviderFailureKind =
      error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error";
    return {
      result: null,
      failure: {
        provider,
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

export async function semanticCheckAnswer(payload: SemanticPayload): Promise<SemanticCheckResult | null> {
  const trimmedAnswer = payload.userAnswer.trim();
  if (trimmedAnswer.length < 2) {
    return null;
  }

  const providers = normalizeProviderList(process.env.ANSWER_CHECK_PROVIDERS);
  let sawFailure = false;
  for (const provider of providers) {
    const keys = rotatedKeys(provider);
    for (const key of keys) {
      const attempt = await requestProvider(provider, key, payload);
      if (attempt.result) {
        logSemanticSuccess(attempt.result, sawFailure);
        return attempt.result;
      }
      if (attempt.failure) {
        sawFailure = true;
        logSemanticFailure(attempt.failure);
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
