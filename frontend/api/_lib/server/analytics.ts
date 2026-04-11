import type {
  Attempt,
  AttemptOutcome,
  Question,
  ReviewState,
  Session,
  StudySource,
  UserBucket,
} from "../domain/types.js";
import { createSupabaseServerClient } from "./supabase-server.js";
import { getRequestContext } from "./request-context.js";

type ProgressResponse = {
  totals: {
    sources: number;
    questions: number;
    sessions: number;
    attempts: number;
  };
  outcomes: Record<AttemptOutcome, number>;
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
    mode: "standard" | "focus" | "weak_review" | "fast_drill";
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
    mode: "standard" | "focus" | "weak_review" | "fast_drill" | null;
  };
};

type AnalyticsSessionRow = {
  id: string;
  user_id: string;
  source_id: string | null;
  source_title: string;
  mode: "standard" | "focus" | "weak_review" | "fast_drill";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  question_cap: number;
  attempt_count: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  created_at: string;
  updated_at: string;
};

type AnalyticsAttemptRow = {
  id: string;
  user_id: string;
  session_id: string;
  question_id: string;
  source_id: string | null;
  source_title: string;
  prompt: string;
  answer: string;
  canonical_answer: string;
  outcome: AttemptOutcome;
  is_retry: boolean;
  final: boolean;
  created_at: string;
};

type AnalyticsQuestionProgressRow = {
  user_id: string;
  question_id: string;
  source_id: string | null;
  source_title: string;
  prompt: string;
  stability: number;
  difficulty: number;
  next_due_at: string;
  last_seen_at: string | null;
  recent_error_count: number;
  near_miss_count: number;
  retry_success_count: number;
  total_attempts: number;
  correct_attempts: number;
  last_outcome: AttemptOutcome | null;
  mastery_score: number;
  pressure_score: number;
  updated_at: string;
};

type ProgressWindow = {
  attempts: number;
  correct: number;
  sessions: number;
  retention: number;
};

function getClient() {
  const accessToken = getRequestContext()?.accessToken ?? null;
  return createSupabaseServerClient(accessToken);
}

function isCorrect(outcome: AttemptOutcome): boolean {
  return outcome === "exact" || outcome === "accent_near" || outcome === "correct_after_retry";
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function dayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function computeWindow(
  attempts: AnalyticsAttemptRow[],
  sessions: AnalyticsSessionRow[],
  startInclusive: Date,
  endExclusive: Date,
): ProgressWindow {
  const filteredAttempts = attempts.filter((attempt) => {
    const created = new Date(attempt.created_at);
    return created >= startInclusive && created < endExclusive && attempt.final;
  });
  const filteredSessions = sessions.filter((session) => {
    if (!session.ended_at) {
      return false;
    }
    const marker = new Date(session.ended_at);
    return marker >= startInclusive && marker < endExclusive;
  });
  const correct = filteredAttempts.filter((attempt) => isCorrect(attempt.outcome)).length;
  const attemptsCount = filteredAttempts.length;

  return {
    attempts: attemptsCount,
    correct,
    sessions: filteredSessions.length,
    retention: attemptsCount > 0 ? Math.round((correct / attemptsCount) * 100) : 0,
  };
}

function mapSessionRow(session: Session, source: StudySource | undefined, attempts: Attempt[]): AnalyticsSessionRow {
  const startedAt = new Date(session.startedAt).getTime();
  const endedAt = new Date(session.endedAt ?? session.updatedAt).getTime();
  const correctCount = attempts.filter((attempt) => attempt.final && isCorrect(attempt.outcome)).length;
  const incorrectCount = attempts.filter((attempt) => attempt.final).length - correctCount;
  const attemptCount = attempts.filter((attempt) => attempt.final).length;

  return {
    id: session.id,
    user_id: session.userId,
    source_id: session.sourceId ?? null,
    source_title: source?.title ?? "Study kit",
    mode: session.mode ?? "standard",
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
    duration_seconds: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    question_cap: session.questionCap,
    attempt_count: attemptCount,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    accuracy: attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function mapAttemptRow(
  attempt: Attempt,
  question: Question | undefined,
  source: StudySource | undefined,
): AnalyticsAttemptRow {
  return {
    id: attempt.id,
    user_id: attempt.userId,
    session_id: attempt.sessionId,
    question_id: attempt.questionId,
    source_id: question?.sourceId ?? null,
    source_title: source?.title ?? "Study kit",
    prompt: question?.prompt ?? "",
    answer: attempt.answer,
    canonical_answer: attempt.canonicalAnswer,
    outcome: attempt.outcome,
    is_retry: attempt.isRetry,
    final: attempt.final,
    created_at: attempt.createdAt,
  };
}

function mapQuestionProgressRow(
  userId: string,
  question: Question | undefined,
  source: StudySource | undefined,
  reviewState: ReviewState,
): AnalyticsQuestionProgressRow {
  const mastery = reviewState.totalAttempts > 0 ? Math.round((reviewState.correctAttempts / reviewState.totalAttempts) * 100) : 0;
  const pressure = Number((reviewState.recentErrorCount + reviewState.nearMissCount * 0.5).toFixed(2));
  return {
    user_id: userId,
    question_id: reviewState.questionId,
    source_id: question?.sourceId ?? null,
    source_title: source?.title ?? "Study kit",
    prompt: question?.prompt ?? "",
    stability: reviewState.stability,
    difficulty: reviewState.difficulty,
    next_due_at: reviewState.nextDueAt,
    last_seen_at: reviewState.lastSeenAt ?? null,
    recent_error_count: Number(reviewState.recentErrorCount.toFixed(2)),
    near_miss_count: reviewState.nearMissCount,
    retry_success_count: reviewState.retrySuccessCount,
    total_attempts: reviewState.totalAttempts,
    correct_attempts: reviewState.correctAttempts,
    last_outcome: reviewState.lastOutcome ?? null,
    mastery_score: mastery,
    pressure_score: pressure,
    updated_at: new Date().toISOString(),
  };
}

export async function syncSessionStart(session: Session, source: StudySource | undefined): Promise<void> {
  const client = getClient();
  if (!client) return;

  const row = mapSessionRow(session, source, []);
  await client.from("study_sessions").upsert(row, { onConflict: "id" });
}

export async function syncAttemptRecord(
  attempt: Attempt,
  question: Question | undefined,
  source: StudySource | undefined,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.from("session_attempts").upsert(mapAttemptRow(attempt, question, source), { onConflict: "id" });
}

export async function syncQuestionProgressRecord(
  userId: string,
  question: Question | undefined,
  source: StudySource | undefined,
  reviewState: ReviewState,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.from("question_progress").upsert(mapQuestionProgressRow(userId, question, source, reviewState), {
    onConflict: "user_id,question_id",
  });
}

export async function syncSessionFinal(
  session: Session,
  source: StudySource | undefined,
  attempts: Attempt[],
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.from("study_sessions").upsert(mapSessionRow(session, source, attempts), { onConflict: "id" });
}

export async function ensureAnalyticsBackfill(userId: string, bucket: UserBucket): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const existing = await client.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (existing.error) return false;
  if ((existing.count ?? 0) > 0) {
    return true;
  }

  const sessions = Object.values(bucket.sessions).map((session) =>
    mapSessionRow(
      session,
      session.sourceId ? bucket.sources[session.sourceId] : undefined,
      Object.values(bucket.attempts).filter((attempt) => attempt.sessionId === session.id),
    ),
  );
  const attempts = Object.values(bucket.attempts).map((attempt) => {
    const question = bucket.questions[attempt.questionId];
    const source = question?.sourceId ? bucket.sources[question.sourceId] : undefined;
    return mapAttemptRow(attempt, question, source);
  });
  const questionProgress = Object.values(bucket.reviewStates).map((reviewState) => {
    const question = bucket.questions[reviewState.questionId];
    const source = question?.sourceId ? bucket.sources[question.sourceId] : undefined;
    return mapQuestionProgressRow(userId, question, source, reviewState);
  });

  if (sessions.length > 0) {
    const { error } = await client.from("study_sessions").upsert(sessions, { onConflict: "id" });
    if (error) return false;
  }
  if (attempts.length > 0) {
    const { error } = await client.from("session_attempts").upsert(attempts, { onConflict: "id" });
    if (error) return false;
  }
  if (questionProgress.length > 0) {
    const { error } = await client.from("question_progress").upsert(questionProgress, {
      onConflict: "user_id,question_id",
    });
    if (error) return false;
  }

  return true;
}

export async function getAnalyticsProgress(
  userId: string,
  sourceCount: number,
  activeQuestionCount: number,
): Promise<ProgressResponse | null> {
  const client = getClient();
  if (!client) return null;

  const [sessionsResult, attemptsResult, questionProgressResult] = await Promise.all([
    client
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("ended_at", { ascending: false, nullsFirst: false }),
    client.from("session_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("question_progress").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
  ]);

  if (sessionsResult.error || attemptsResult.error || questionProgressResult.error) {
    return null;
  }

  const sessions = (sessionsResult.data ?? []) as AnalyticsSessionRow[];
  const attempts = (attemptsResult.data ?? []) as AnalyticsAttemptRow[];
  const questionProgress = (questionProgressResult.data ?? []) as AnalyticsQuestionProgressRow[];

  if (sessions.length === 0 && attempts.length === 0 && questionProgress.length === 0) {
    return null;
  }

  const finalAttempts = attempts.filter((attempt) => attempt.final);
  const completedSessions = sessions.filter((session) => session.ended_at);
  const outcomes: Record<AttemptOutcome, number> = {
    exact: 0,
    accent_near: 0,
    typo_near: 0,
    correct_after_retry: 0,
    incorrect: 0,
  };

  for (const attempt of finalAttempts) {
    outcomes[attempt.outcome] += 1;
  }

  const weakQuestions = questionProgress
    .filter((item) => item.recent_error_count > 0 || item.near_miss_count > 0)
    .sort((a, b) => Number(b.recent_error_count) - Number(a.recent_error_count))
    .slice(0, 6)
    .map((item) => ({
      questionId: item.question_id,
      prompt: item.prompt,
      recentErrorCount: Number(Number(item.recent_error_count).toFixed(2)),
      nearMissCount: item.near_miss_count,
      sourceId: item.source_id,
      sourceTitle: item.source_title,
    }));

  const recentSessions = completedSessions.slice(0, 8).map((session) => ({
    sessionId: session.id,
    sourceId: session.source_id,
    sourceTitle: session.source_title,
    mode: session.mode,
    accuracy: session.accuracy,
    correctCount: session.correct_count,
    incorrectCount: session.incorrect_count,
    attemptCount: session.attempt_count,
    durationSeconds: session.duration_seconds,
    completedAt: session.ended_at ?? session.updated_at,
  }));

  const today = new Date();
  const currentWindowStart = addDays(today, -6);
  const previousWindowStart = addDays(today, -13);
  const previousWindowEnd = addDays(today, -6);

  const timeSeries = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    const key = dayKey(date);
    const dayAttempts = finalAttempts.filter((attempt) => dayKey(attempt.created_at) === key);
    const daySessions = completedSessions.filter((session) => dayKey(session.ended_at ?? session.started_at) === key);
    const correctCount = dayAttempts.filter((attempt) => isCorrect(attempt.outcome)).length;
    return {
      date: key,
      label: formatDayLabel(date),
      attempts: dayAttempts.length,
      sessions: daySessions.length,
      accuracy: dayAttempts.length > 0 ? Math.round((correctCount / dayAttempts.length) * 100) : 0,
    };
  });

  const currentWindow = computeWindow(finalAttempts, completedSessions, currentWindowStart, addDays(today, 1));
  const previousWindow = computeWindow(finalAttempts, completedSessions, previousWindowStart, previousWindowEnd);

  const perSourceAttempts = new Map<string, AnalyticsAttemptRow[]>();
  for (const attempt of finalAttempts) {
    const key = attempt.source_id ?? "mixed";
    if (!perSourceAttempts.has(key)) {
      perSourceAttempts.set(key, []);
    }
    perSourceAttempts.get(key)?.push(attempt);
  }

  const kitBreakdown = [...perSourceAttempts.entries()]
    .map(([sourceId, sourceAttempts]) => {
      const sourceProgress = questionProgress.filter((item) => (item.source_id ?? "mixed") === sourceId);
      const sourceSessions = completedSessions.filter((session) => (session.source_id ?? "mixed") === sourceId);
      const correctCount = sourceAttempts.filter((attempt) => isCorrect(attempt.outcome)).length;
      const current = computeWindow(
        sourceAttempts,
        sourceSessions,
        currentWindowStart,
        addDays(today, 1),
      );
      const previous = computeWindow(
        sourceAttempts,
        sourceSessions,
        previousWindowStart,
        previousWindowEnd,
      );
      const sourceTitle =
        sourceAttempts[0]?.source_title ??
        sourceProgress[0]?.source_title ??
        sourceSessions[0]?.source_title ??
        "Study kit";
      const lastStudiedAt = sourceAttempts[sourceAttempts.length - 1]?.created_at ?? sourceSessions[0]?.ended_at ?? null;

      return {
        sourceId: sourceId === "mixed" ? "mixed" : sourceId,
        sourceTitle,
        attempts: sourceAttempts.length,
        accuracy: sourceAttempts.length > 0 ? Math.round((correctCount / sourceAttempts.length) * 100) : 0,
        mastery:
          sourceProgress.length > 0
            ? Math.round(sourceProgress.reduce((sum, item) => sum + item.mastery_score, 0) / sourceProgress.length)
            : 0,
        masteryDelta: current.retention - previous.retention,
        weakPressure: Number(
          sourceProgress.reduce((sum, item) => sum + Number(item.pressure_score), 0).toFixed(2),
        ),
        sessionCount: sourceSessions.length,
        lastStudiedAt,
      };
    })
    .sort((a, b) => {
      if (b.weakPressure !== a.weakPressure) return b.weakPressure - a.weakPressure;
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.attempts - a.attempts;
    })
    .slice(0, 8);

  const weakestKit = kitBreakdown[0] ?? null;
  const shouldReviewWeakKit = Boolean(weakestKit && (weakestKit.weakPressure > 0 || weakestKit.accuracy < 85));
  const recommendations = sourceCount === 0
    ? {
        headline: "Start your first signal loop",
        summary: "Create a study kit so Snaplet can begin tracking retention, weak spots, and momentum.",
        actionLabel: "Create your first kit",
        actionType: "create_kit" as const,
        sourceId: null,
        mode: null,
      }
    : shouldReviewWeakKit && weakestKit
      ? {
          headline: `Put ${weakestKit.sourceTitle} back into rotation`,
          summary: weakestKit.weakPressure > 2
            ? "This kit is carrying the highest error pressure right now. A short weak-review pass should give you the biggest lift."
            : "This kit has the most room to improve based on your recent outcomes and retained accuracy.",
          actionLabel: "Review weak kit",
          actionType: "review_weak_kit" as const,
          sourceId: weakestKit.sourceId === "mixed" ? null : weakestKit.sourceId,
          mode: "weak_review" as const,
        }
      : {
          headline: "Keep the momentum going",
          summary: "Open your study kits and run another session to build enough signal for coaching and trends.",
          actionLabel: "Open study kits",
          actionType: "open_kits" as const,
          sourceId: null,
          mode: null,
        };

  return {
    totals: {
      sources: sourceCount,
      questions: activeQuestionCount,
      sessions: sessions.length,
      attempts: finalAttempts.length,
    },
    outcomes,
    weakQuestions,
    recentSessions,
    timeSeries,
    kitBreakdown,
    comparisons: {
      current: {
        attempts: currentWindow.attempts,
        sessions: currentWindow.sessions,
        retention: currentWindow.retention,
      },
      previous: {
        attempts: previousWindow.attempts,
        sessions: previousWindow.sessions,
        retention: previousWindow.retention,
      },
      deltas: {
        attempts: currentWindow.attempts - previousWindow.attempts,
        sessions: currentWindow.sessions - previousWindow.sessions,
        retention: currentWindow.retention - previousWindow.retention,
      },
    },
    recommendations,
  };
}
