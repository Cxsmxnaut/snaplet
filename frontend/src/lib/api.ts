import { logDebug, logError } from './debug';
import type { ProductEventName } from '../../shared/product-events';
import { supabase } from './supabase';

export type BackendSource = {
  id: string;
  title: string;
  kind: "paste" | "upload" | "csv";
  visibility: "private" | "public";
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

export type SharedKitSnapshot = {
  source: BackendSource;
  questions: BackendQuestion[];
};

type SourceCreateResponse = {
  source: BackendSource;
  questions?: BackendQuestion[];
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

export type BackendSessionDetail = {
  session: {
    id: string;
    sourceId: string | null;
    mode: StudyMode;
    questionCap: number;
    answeredCount: number;
    correctCount: number;
    incorrectCount: number;
    startedAt: string;
    endedAt: string | null;
    pendingRetry: boolean;
  };
  currentQuestion: {
    sessionId: string;
    questionId: string;
    prompt: string;
    position: number;
    kind: "new" | "review" | "revisit";
  } | null;
  summary: {
    sessionId: string;
    sourceId: string | null;
    sourceTitle: string | null;
    accuracy: number;
    correctCount: number;
    incorrectCount: number;
    durationSeconds: number;
    completedAt: string;
    weakQuestions: Array<{
      question: string;
      userAnswer: string;
      correctAnswer: string;
    }>;
  } | null;
};

export type BackendActiveSourceSession = {
  sessionId: string;
  sourceId: string;
  mode: StudyMode;
  answeredCount: number;
  questionCap: number;
  startedAt: string;
  updatedAt: string;
  pendingRetry: boolean;
  currentPosition: number | null;
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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const startedAt = performance.now();
  const headers = new Headers(init?.headers ?? {});
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token || !session.user?.id) {
    throw new Error('Please sign in to continue.');
  }

  headers.set("authorization", `Bearer ${session.access_token}`);

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

export async function trackProductEvent(
  name: ProductEventName,
  options?: {
    sourceId?: string | null;
    sessionId?: string | null;
    properties?: Record<string, unknown>;
  },
): Promise<void> {
  const headers = new Headers({ "content-type": "application/json" });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set("authorization", `Bearer ${session.access_token}`);
  }

  try {
    await fetch(`${API_BASE_URL}/api/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        sourceId: options?.sourceId ?? null,
        sessionId: options?.sessionId ?? null,
        properties: options?.properties ?? {},
      }),
    });
  } catch (error) {
    logError("analytics", "Failed to record product event", {
      name,
      error,
    });
  }
}

export async function listSources(): Promise<BackendSource[]> {
  const data = await apiRequest<{ sources: BackendSource[] }>("/api/sources");
  return data.sources;
}

export async function listSourceQuestions(sourceId: string): Promise<BackendQuestion[]> {
  const data = await apiRequest<{ questions: BackendQuestion[] }>(`/api/sources/${sourceId}/questions`);
  return data.questions;
}

export async function createSourceFromText(
  title: string,
  content: string,
  visibility: "private" | "public" = "private",
): Promise<BackendSource> {
  const data = await apiRequest<SourceCreateResponse>("/api/sources", {
    method: "POST",
    body: JSON.stringify({ title, content, visibility }),
  });
  return data.source;
}

export async function uploadSourceFile(
  file: File,
  visibility: "private" | "public" = "private",
): Promise<BackendSource> {
  const form = new FormData();
  form.append("file", file);
  form.append("visibility", visibility);
  const data = await apiRequest<SourceCreateResponse>("/api/import/upload", {
    method: "POST",
    body: form,
  });
  return data.source;
}

export async function regenerateSourceQuestions(sourceId: string): Promise<{ questionCount: number }> {
  return apiRequest<{ questionCount: number }>(`/api/sources/${sourceId}/generate`, {
    method: "POST",
  });
}

export async function updateSourceVisibility(
  sourceId: string,
  visibility: "private" | "public",
): Promise<BackendSource> {
  const data = await apiRequest<{ source: BackendSource }>(`/api/sources/${sourceId}`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
  return data.source;
}

export async function getSharedKit(sourceId: string): Promise<SharedKitSnapshot> {
  const response = await fetch(`${API_BASE_URL}/api/shared/${sourceId}`);
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & SharedKitSnapshot;
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
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

export async function startSession(
  sourceId: string,
  mode: StudyMode,
): Promise<BackendSessionStart> {
  return apiRequest<BackendSessionStart>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ sourceId, mode }),
  });
}

export async function getSessionDetails(sessionId: string): Promise<BackendSessionDetail> {
  return apiRequest<BackendSessionDetail>(`/api/sessions/${sessionId}`);
}

export async function getActiveSourceSession(sourceId: string): Promise<BackendActiveSourceSession | null> {
  const response = await apiRequest<{ session: BackendActiveSourceSession | null }>(`/api/sources/${sourceId}/active-session`);
  return response.session;
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
