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
  }>;
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

const USER_KEY = "nimble_backend_user_id";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  logDebug("api", "Response received", {
    path,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    ok: response.ok,
  });
  if (!response.ok) {
    const error = new Error(payload.error ?? `Request failed (${response.status})`);
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
  return data.sources;
}

export async function listSourceQuestions(sourceId: string): Promise<BackendQuestion[]> {
  const data = await apiRequest<{ questions: BackendQuestion[] }>(`/api/sources/${sourceId}/questions`);
  return data.questions;
}

export async function createSourceFromText(title: string, content: string): Promise<BackendSource> {
  const data = await apiRequest<{ source: BackendSource }>("/api/sources", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
  return data.source;
}

export async function uploadSourceFile(file: File): Promise<BackendSource> {
  const form = new FormData();
  form.append("file", file);
  const data = await apiRequest<{ source: BackendSource }>("/api/import/upload", {
    method: "POST",
    body: form,
  });
  return data.source;
}

export async function deleteSource(sourceId: string): Promise<void> {
  await apiRequest(`/api/sources/${sourceId}`, {
    method: "DELETE",
  });
}

export async function updateQuestion(questionId: string, prompt: string, answer: string): Promise<BackendQuestion> {
  const data = await apiRequest<{ question: BackendQuestion }>(`/api/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify({ prompt, answer }),
  });
  return data.question;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiRequest("/api/questions/bulk", {
    method: "POST",
    body: JSON.stringify({ questionIds: [questionId] }),
  });
}

export async function startSession(sourceId: string, mode: StudyMode): Promise<BackendSessionStart> {
  return apiRequest<BackendSessionStart>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ sourceId, mode }),
  });
}

export async function submitAttempt(
  sessionId: string,
  payload: { questionId: string; answer: string; isRetry?: boolean },
): Promise<BackendAttemptResult> {
  return apiRequest<BackendAttemptResult>(`/api/sessions/${sessionId}/attempts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProgress(): Promise<BackendProgress> {
  return apiRequest<BackendProgress>("/api/progress");
}
