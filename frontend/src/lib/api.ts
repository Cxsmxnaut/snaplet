import { logDebug, logError } from './debug';
import { supabase } from './supabase';

export type BackendSource = {
  id: string;
  title: string;
  content: string;
  kind: "paste" | "upload" | "csv";
  extractionStatus: "extracting" | "ready" | "needs_attention" | "failed";
  questionGenerationStatus: "pending" | "generating" | "ready" | "failed";
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BackendQuestion = {
  id: string;
  sourceId: string;
  prompt: string;
  answer: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

type SourceCreateResponse = {
  source: BackendSource;
  questions?: BackendQuestion[];
};

type LocalSessionQuestion = {
  sessionId: string;
  questionId: string;
  prompt: string;
  answer: string;
  position: number;
  kind: "new" | "review" | "revisit";
};

type LocalSessionState = {
  id: string;
  sourceId: string;
  mode: StudyMode;
  questionCap: number;
  pointer: number;
  retryQuestionId: string | null;
  questions: LocalSessionQuestion[];
};

export type BackendProgress = {
  totals: {
    sources: number;
    questions: number;
    sessions: number;
    attempts: number;
  };
  outcomes: Record<"exact" | "accent_near" | "typo_near" | "correct_after_retry" | "incorrect", number>;
  weakQuestions: Array<{
    questionId: string;
    prompt: string;
    recentErrorCount: number;
    nearMissCount: number;
    sourceId: string | null;
    sourceTitle: string | null;
  }>;
  recentSessions: Array<{
    sessionId: string;
    sourceId: string | null;
    sourceTitle: string;
    mode: StudyMode;
    accuracy: number;
    correctCount: number;
    incorrectCount: number;
    attemptCount: number;
    durationSeconds: number;
    completedAt: string;
  }>;
  timeSeries: Array<{
    date: string;
    label: string;
    attempts: number;
    sessions: number;
    accuracy: number;
  }>;
  kitBreakdown: Array<{
    sourceId: string;
    sourceTitle: string;
    attempts: number;
    accuracy: number;
    mastery: number;
    masteryDelta: number;
    weakPressure: number;
    sessionCount: number;
    lastStudiedAt: string | null;
  }>;
  comparisons: {
    current: {
      attempts: number;
      sessions: number;
      retention: number;
    };
    previous: {
      attempts: number;
      sessions: number;
      retention: number;
    };
    deltas: {
      attempts: number;
      sessions: number;
      retention: number;
    };
  };
  recommendations: {
    headline: string;
    summary: string;
    actionLabel: string;
    actionType: "create_kit" | "open_kits" | "review_weak_kit";
    sourceId: string | null;
    mode: StudyMode | null;
  };
};

export type BackendSessionStart = {
  session: {
    id: string;
    questionCap: number;
  };
  currentQuestion: {
    sessionId: string;
    questionId: string;
    prompt: string;
    position: number;
    kind: "new" | "review" | "revisit";
  } | null;
};

export type StudyMode = "standard" | "focus" | "weak_review" | "fast_drill";

export type BackendAttemptResult = {
  needsRetry: boolean;
  outcome: "exact" | "accent_near" | "typo_near" | "correct_after_retry" | "incorrect";
  feedback: string;
  correctAnswer: string;
  sessionEnded: boolean;
  nextQuestion: {
    sessionId: string;
    questionId: string;
    prompt: string;
    position: number;
    kind: "new" | "review" | "revisit";
  } | null;
};

const USER_KEY = "snaplet_backend_user_id";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const SOURCE_CACHE_KEY = "snaplet_backend_sources_cache_v1";
const QUESTION_CACHE_KEY = "snaplet_backend_questions_cache_v1";
const SESSION_CACHE_KEY = "snaplet_local_sessions_v1";

function readSourceCache(): Record<string, BackendSource> {
  try {
    return JSON.parse(window.localStorage.getItem(SOURCE_CACHE_KEY) ?? "{}") as Record<string, BackendSource>;
  } catch {
    return {};
  }
}

function writeSourceCache(cache: Record<string, BackendSource>): void {
  window.localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(cache));
}

function cacheSource(source: BackendSource): void {
  const cache = readSourceCache();
  cache[source.id] = source;
  writeSourceCache(cache);
}

function mergeSourcesWithCache(sources: BackendSource[]): BackendSource[] {
  const cache = readSourceCache();
  const merged = new Map<string, BackendSource>();

  for (const source of Object.values(cache)) {
    merged.set(source.id, source);
  }
  for (const source of sources) {
    merged.set(source.id, source);
  }

  return [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function removeCachedSource(sourceId: string): void {
  const sourceCache = readSourceCache();
  delete sourceCache[sourceId];
  writeSourceCache(sourceCache);

  const questionCache = readQuestionCache();
  delete questionCache[sourceId];
  writeQuestionCache(questionCache);
}

function readQuestionCache(): Record<string, BackendQuestion[]> {
  try {
    return JSON.parse(window.localStorage.getItem(QUESTION_CACHE_KEY) ?? "{}") as Record<string, BackendQuestion[]>;
  } catch {
    return {};
  }
}

function writeQuestionCache(cache: Record<string, BackendQuestion[]>): void {
  window.localStorage.setItem(QUESTION_CACHE_KEY, JSON.stringify(cache));
}

function cacheQuestions(sourceId: string, questions: BackendQuestion[]): void {
  const cache = readQuestionCache();
  cache[sourceId] = questions;
  writeQuestionCache(cache);
}

function getCachedQuestions(sourceId: string): BackendQuestion[] {
  const cache = readQuestionCache();
  return cache[sourceId] ?? [];
}

function readSessionCache(): Record<string, LocalSessionState> {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_CACHE_KEY) ?? "{}") as Record<string, LocalSessionState>;
  } catch {
    return {};
  }
}

function writeSessionCache(cache: Record<string, LocalSessionState>): void {
  window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ");
}

function buildLocalSession(
  sourceId: string,
  mode: StudyMode,
  questions: BackendQuestion[],
): BackendSessionStart {
  const activeQuestions = questions.filter((question) => question.status === "active");
  if (activeQuestions.length === 0) {
    throw new Error("This kit has no questions yet. Add content or regenerate questions first.");
  }

  const questionCap = mode === "fast_drill" ? Math.min(16, activeQuestions.length) : Math.min(10, activeQuestions.length);
  const sessionId = `local_${crypto.randomUUID()}`;
  const localQuestions: LocalSessionQuestion[] = activeQuestions.slice(0, questionCap).map((question, index) => ({
    sessionId,
    questionId: question.id,
    prompt: question.prompt,
    answer: question.answer,
    position: index + 1,
    kind: "new",
  }));

  const session: LocalSessionState = {
    id: sessionId,
    sourceId,
    mode,
    questionCap,
    pointer: 0,
    retryQuestionId: null,
    questions: localQuestions,
  };

  const cache = readSessionCache();
  cache[sessionId] = session;
  writeSessionCache(cache);

  const first = localQuestions[0] ?? null;
  return {
    session: { id: sessionId, questionCap },
    currentQuestion: first
      ? {
          sessionId,
          questionId: first.questionId,
          prompt: first.prompt,
          position: first.position,
          kind: first.kind,
        }
      : null,
  };
}

function submitLocalAttempt(
  sessionId: string,
  payload: { questionId: string; answer: string; isRetry?: boolean },
): BackendAttemptResult {
  const cache = readSessionCache();
  const session = cache[sessionId];
  if (!session) {
    throw new Error("Study session expired. Start a new session.");
  }

  const current = session.questions[session.pointer];
  if (!current || current.questionId !== payload.questionId) {
    throw new Error("Question not found in current session.");
  }

  const isCorrect = normalizeAnswer(payload.answer) === normalizeAnswer(current.answer);
  const isRetry = Boolean(payload.isRetry || session.retryQuestionId === current.questionId);

  if (!isCorrect && !isRetry) {
    session.retryQuestionId = current.questionId;
    cache[sessionId] = session;
    writeSessionCache(cache);
    return {
      needsRetry: true,
      outcome: "incorrect",
      feedback: "Not quite. Try once more before we move on.",
      correctAnswer: current.answer,
      sessionEnded: false,
      nextQuestion: null,
    };
  }

  const outcome = isCorrect ? (isRetry ? "correct_after_retry" : "exact") : "incorrect";
  const feedback = isCorrect
    ? isRetry
      ? "Correct after retry. Nice recovery."
      : "Correct."
    : "Incorrect.";

  session.pointer += 1;
  session.retryQuestionId = null;

  const next = session.questions[session.pointer] ?? null;
  const sessionEnded = next === null;

  if (sessionEnded) {
    delete cache[sessionId];
  } else {
    cache[sessionId] = session;
  }
  writeSessionCache(cache);

  return {
    needsRetry: false,
    outcome,
    feedback,
    correctAnswer: current.answer,
    sessionEnded,
    nextQuestion: next
      ? {
          sessionId,
          questionId: next.questionId,
          prompt: next.prompt,
          position: next.position,
          kind: next.kind,
        }
      : null,
  };
}

function getUserId(): string {
  const existing = window.localStorage.getItem(USER_KEY);
  if (existing) {
    return existing;
  }

  const next = `usr_${crypto.randomUUID()}`;
  window.localStorage.setItem(USER_KEY, next);
  return next;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const startedAt = performance.now();
  const headers = new Headers(init?.headers ?? {});
  const {
    data: { session },
  } = await supabase.auth.getSession();

  headers.set("x-snaplet-user-id", session?.user?.id ?? getUserId());
  if (session?.access_token) {
    headers.set("authorization", `Bearer ${session.access_token}`);
  }

  if (!(init?.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  logDebug("api", "Request started", {
    path,
    method: init?.method ?? "GET",
    hasBody: Boolean(init?.body),
  });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (err) {
    const mapped = new Error('Unable to reach backend. Check your connection or API URL and try again.');
    logError('api', 'Network request failed', {
      path,
      error: err,
    });
    throw mapped;
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  logDebug("api", "Response received", {
    path,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    ok: response.ok,
  });
  if (!response.ok) {
    const fallbackMessage =
      response.status === 401
        ? 'Your session expired. Please sign in again.'
        : response.status === 403
        ? 'You do not have permission to perform this action.'
        : response.status >= 500
        ? 'The server had an issue. Please try again in a moment.'
        : `Request failed (${response.status})`;
    const error = new Error(payload.error ?? fallbackMessage);
    logError("api", "Request failed", {
      path,
      status: response.status,
      payload,
    });
    throw error;
  }

  return payload;
}

export async function listSources(): Promise<BackendSource[]> {
  const data = await apiRequest<{ sources: BackendSource[] }>("/api/sources");
  for (const source of data.sources) {
    cacheSource(source);
  }
  return mergeSourcesWithCache(data.sources);
}

export async function listSourceQuestions(sourceId: string): Promise<BackendQuestion[]> {
  const data = await apiRequest<{ questions: BackendQuestion[] }>(`/api/sources/${sourceId}/questions`);
  if (data.questions.length > 0) {
    cacheQuestions(sourceId, data.questions);
    return data.questions;
  }
  return getCachedQuestions(sourceId);
}

export async function createSourceFromText(title: string, content: string): Promise<BackendSource> {
  const data = await apiRequest<SourceCreateResponse>("/api/sources", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
  cacheSource(data.source);
  if (Array.isArray(data.questions) && data.questions.length > 0) {
    cacheQuestions(data.source.id, data.questions);
  }
  return data.source;
}

export async function uploadSourceFile(file: File): Promise<BackendSource> {
  const form = new FormData();
  form.append("file", file);
  const data = await apiRequest<SourceCreateResponse>("/api/import/upload", {
    method: "POST",
    body: form,
  });
  cacheSource(data.source);
  if (Array.isArray(data.questions) && data.questions.length > 0) {
    cacheQuestions(data.source.id, data.questions);
  }
  return data.source;
}

export async function deleteSource(sourceId: string): Promise<void> {
  await apiRequest(`/api/sources/${sourceId}`, {
    method: "DELETE",
  });
  removeCachedSource(sourceId);
}

export async function updateQuestion(questionId: string, prompt: string, answer: string): Promise<BackendQuestion> {
  const data = await apiRequest<{ question: BackendQuestion }>(`/api/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify({ prompt, answer }),
  });
  const questionCache = readQuestionCache();
  for (const sourceId of Object.keys(questionCache)) {
    questionCache[sourceId] = questionCache[sourceId].map((question) =>
      question.id === questionId ? data.question : question,
    );
  }
  writeQuestionCache(questionCache);
  return data.question;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiRequest("/api/questions/bulk", {
    method: "POST",
    body: JSON.stringify({ questionIds: [questionId] }),
  });
  const questionCache = readQuestionCache();
  for (const sourceId of Object.keys(questionCache)) {
    questionCache[sourceId] = questionCache[sourceId].filter((question) => question.id !== questionId);
  }
  writeQuestionCache(questionCache);
}

export async function startSession(
  sourceId: string,
  mode: StudyMode,
  questions: BackendQuestion[] = getCachedQuestions(sourceId),
): Promise<BackendSessionStart> {
  try {
    return await apiRequest<BackendSessionStart>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ sourceId, mode }),
    });
  } catch (error) {
    if (questions.length === 0) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "";
    logError("api", "Falling back to local study session", {
      sourceId,
      mode,
      questionCount: questions.length,
      message,
    });
    return buildLocalSession(sourceId, mode, questions);
  }
}

export async function submitAttempt(
  sessionId: string,
  payload: { questionId: string; answer: string; isRetry?: boolean },
): Promise<BackendAttemptResult> {
  if (sessionId.startsWith("local_")) {
    return submitLocalAttempt(sessionId, payload);
  }

  return apiRequest<BackendAttemptResult>(`/api/sessions/${sessionId}/attempts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProgress(): Promise<BackendProgress> {
  return apiRequest<BackendProgress>("/api/progress");
}
