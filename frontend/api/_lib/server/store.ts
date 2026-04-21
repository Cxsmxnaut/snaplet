import { type SupabaseClient } from "@supabase/supabase-js";
import {
  type Attempt,
  type ExtractionRun,
  type Question,
  type ReviewState,
  type Session,
  type SnapletState,
  type SourceFile,
  type StudySource,
  type UserBucket,
} from "../domain/types.js";
import { getRequestContext } from "./request-context.js";
import { createSupabaseServerClient } from "./supabase-server.js";
const userWriteChains = new Map<string, Promise<void>>();
const bucketCache = new Map<string, UserBucket>();

type BucketLoadResult =
  | { kind: "found"; bucket: UserBucket }
  | { kind: "missing" }
  | { kind: "unavailable"; reason: string };

type PersistBucketResult =
  | { ok: true }
  | { ok: false; reason: string };

type UpsertResponse = Promise<{ error: { message: string } | null }>;

type StudySourceRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  kind: StudySource["kind"];
  visibility: StudySource["visibility"];
  extraction_status: StudySource["extractionStatus"];
  question_generation_status: StudySource["questionGenerationStatus"];
  generation_provenance: NonNullable<StudySource["generationProvenance"]>;
  generation_provider: string | null;
  generation_degraded: boolean;
  question_count: number;
  created_at: string;
  updated_at: string;
};

type SourceFileRow = {
  id: string;
  user_id: string;
  source_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  extractor_mode: SourceFile["extractorMode"];
  extraction_status: SourceFile["extractionStatus"];
  quality_score: number;
  created_at: string;
  updated_at: string;
};

type ExtractionRunRow = {
  id: string;
  user_id: string;
  source_file_id: string;
  parser_path: string;
  ocr_used: boolean;
  duration_ms: number;
  quality_score: number;
  status: ExtractionRun["status"];
  error_details: string | null;
  created_at: string;
};

type QuestionRow = {
  id: string;
  user_id: string;
  source_id: string;
  prompt: string;
  answer: string;
  status: Question["status"];
  created_at: string;
  updated_at: string;
};

type StudySessionRow = {
  id: string;
  user_id: string;
  source_id: string | null;
  source_title: string;
  mode: NonNullable<Session["mode"]>;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  question_cap: number;
  attempt_count: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  time_cap_seconds: number | null;
  pointer: number | null;
  pending_retry_question_id: string | null;
  queue: Session["queue"] | null;
  created_at: string;
  updated_at: string;
};

type SessionAttemptRow = {
  id: string;
  user_id: string;
  session_id: string;
  question_id: string;
  source_id: string | null;
  source_title: string;
  prompt: string;
  answer: string;
  canonical_answer: string;
  outcome: Attempt["outcome"];
  is_retry: boolean;
  final: boolean;
  created_at: string;
};

type QuestionProgressRow = {
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
  last_outcome: ReviewState["lastOutcome"] | null;
  mastery_score: number;
  pressure_score: number;
  updated_at: string;
};

function emptyBucket(): UserBucket {
  return {
    sources: {},
    sourceFiles: {},
    extractionRuns: {},
    questions: {},
    reviewStates: {},
    sessions: {},
    attempts: {},
  };
}

function getSupabaseClient(): SupabaseClient | null {
  const accessToken = getRequestContext()?.accessToken ?? null;
  return createSupabaseServerClient(accessToken);
}

function createEphemeralBucketState(userId: string): { state: SnapletState; bucket: UserBucket } {
  const state: SnapletState = { users: {} };
  const bucket = emptyBucket();
  state.users[userId] = bucket;
  return { state, bucket };
}

function persistenceUnavailableError(reason: string): Error {
  return new Error(
    `Snaplet persistence is unavailable. ${reason}. Configure Supabase correctly before using the real product runtime.`,
  );
}

function hasBucketData(bucket: UserBucket): boolean {
  return (
    Object.keys(bucket.sources).length > 0 ||
    Object.keys(bucket.sourceFiles).length > 0 ||
    Object.keys(bucket.extractionRuns).length > 0 ||
    Object.keys(bucket.questions).length > 0 ||
    Object.keys(bucket.reviewStates).length > 0 ||
    Object.keys(bucket.sessions).length > 0 ||
    Object.keys(bucket.attempts).length > 0
  );
}

function isPersistFailure(result: PersistBucketResult): result is { ok: false; reason: string } {
  return result.ok === false;
}

function cloneBucket(bucket: UserBucket): UserBucket {
  return {
    sources: { ...bucket.sources },
    sourceFiles: { ...bucket.sourceFiles },
    extractionRuns: { ...bucket.extractionRuns },
    questions: { ...bucket.questions },
    reviewStates: { ...bucket.reviewStates },
    sessions: { ...bucket.sessions },
    attempts: { ...bucket.attempts },
  };
}

function isRelationMissingError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("does not exist") === true ||
    error.message?.toLowerCase().includes("could not find the table") === true
  );
}

function sourceFromRow(row: StudySourceRow): StudySource {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    kind: row.kind,
    visibility: row.visibility ?? "private",
    extractionStatus: row.extraction_status,
    questionGenerationStatus: row.question_generation_status,
    generationProvenance: row.generation_provenance ?? "none",
    generationProvider: row.generation_provider ?? undefined,
    generationDegraded: row.generation_degraded ?? false,
    questionCount: row.question_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sourceFileFromRow(row: SourceFileRow): SourceFile {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    extractorMode: row.extractor_mode,
    extractionStatus: row.extraction_status,
    qualityScore: row.quality_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function extractionRunFromRow(row: ExtractionRunRow): ExtractionRun {
  return {
    id: row.id,
    userId: row.user_id,
    sourceFileId: row.source_file_id,
    parserPath: row.parser_path,
    ocrUsed: row.ocr_used,
    durationMs: row.duration_ms,
    qualityScore: row.quality_score,
    status: row.status,
    errorDetails: row.error_details ?? undefined,
    createdAt: row.created_at,
  };
}

function questionFromRow(row: QuestionRow): Question {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id,
    prompt: row.prompt ?? "Question",
    answer: row.answer ?? "Answer",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureNonNullString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function isQueue(value: unknown): value is Session["queue"] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as { questionId?: unknown }).questionId === "string" &&
        typeof (entry as { kind?: unknown }).kind === "string",
    )
  );
}

function sessionFromRow(row: StudySessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id ?? undefined,
    mode: row.mode,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    questionCap: row.question_cap,
    timeCapSeconds: row.time_cap_seconds ?? 300,
    pointer: row.pointer ?? 0,
    answeredCount: row.attempt_count,
    queue: isQueue(row.queue) ? row.queue : [],
    pendingRetryQuestionId: row.pending_retry_question_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attemptFromRow(row: SessionAttemptRow): Attempt {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    questionId: row.question_id,
    answer: row.answer ?? "Answer",
    canonicalAnswer: row.canonical_answer ?? "",
    outcome: row.outcome,
    isRetry: row.is_retry,
    final: row.final,
    createdAt: row.created_at,
  };
}

function reviewStateFromRow(row: QuestionProgressRow): ReviewState {
  return {
    userId: row.user_id,
    questionId: row.question_id,
    stability: row.stability,
    difficulty: row.difficulty,
    nextDueAt: row.next_due_at,
    lastSeenAt: row.last_seen_at ?? undefined,
    recentErrorCount: row.recent_error_count,
    nearMissCount: row.near_miss_count,
    retrySuccessCount: row.retry_success_count,
    totalAttempts: row.total_attempts,
    correctAttempts: row.correct_attempts,
    lastOutcome: row.last_outcome ?? undefined,
  };
}

function sourceToRow(source: StudySource): StudySourceRow {
  return {
    id: source.id,
    user_id: source.userId,
    title: source.title,
    content: source.content,
    kind: source.kind,
    visibility: source.visibility,
    extraction_status: source.extractionStatus,
    question_generation_status: source.questionGenerationStatus,
    generation_provenance: source.generationProvenance ?? "none",
    generation_provider: source.generationProvider ?? null,
    generation_degraded: source.generationDegraded ?? false,
    question_count: source.questionCount,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
  };
}

function sourceFileToRow(file: SourceFile): SourceFileRow {
  return {
    id: file.id,
    user_id: file.userId,
    source_id: file.sourceId,
    file_name: file.fileName,
    mime_type: file.mimeType,
    size_bytes: file.size,
    extractor_mode: file.extractorMode,
    extraction_status: file.extractionStatus,
    quality_score: file.qualityScore,
    created_at: file.createdAt,
    updated_at: file.updatedAt,
  };
}

function extractionRunToRow(run: ExtractionRun): ExtractionRunRow {
  return {
    id: run.id,
    user_id: run.userId,
    source_file_id: run.sourceFileId,
    parser_path: run.parserPath,
    ocr_used: run.ocrUsed,
    duration_ms: run.durationMs,
    quality_score: run.qualityScore,
    status: run.status,
    error_details: run.errorDetails ?? null,
    created_at: run.createdAt,
  };
}

function questionToRow(question: Question): QuestionRow {
  return {
    id: question.id,
    user_id: question.userId,
    source_id: question.sourceId,
    prompt: ensureNonNullString(question.prompt, "Question"),
    answer: ensureNonNullString(question.answer, "Answer"),
    status: question.status,
    created_at: question.createdAt,
    updated_at: question.updatedAt,
  };
}

function isCorrectOutcome(outcome: Attempt["outcome"]): boolean {
  return outcome === "exact" || outcome === "accent_near" || outcome === "correct_after_retry";
}

function sessionToRow(session: Session, bucket: UserBucket): StudySessionRow {
  const sessionAttempts = Object.values(bucket.attempts).filter((attempt) => attempt.sessionId === session.id && attempt.final);
  const correctCount = sessionAttempts.filter((attempt) => isCorrectOutcome(attempt.outcome)).length;
  const incorrectCount = sessionAttempts.length - correctCount;
  const source = session.sourceId ? bucket.sources[session.sourceId] : undefined;

  return {
    id: session.id,
    user_id: session.userId,
    source_id: session.sourceId ?? null,
    source_title: source?.title ?? "Study kit",
    mode: session.mode ?? "standard",
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
    duration_seconds: Math.max(
      0,
      Math.round(
        ((session.endedAt ? new Date(session.endedAt) : new Date(session.updatedAt)).getTime() -
          new Date(session.startedAt).getTime()) /
          1000,
      ),
    ),
    question_cap: session.questionCap,
    attempt_count: sessionAttempts.length,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    accuracy: sessionAttempts.length > 0 ? Math.round((correctCount / sessionAttempts.length) * 100) : 0,
    time_cap_seconds: session.timeCapSeconds,
    pointer: session.pointer,
    pending_retry_question_id: session.pendingRetryQuestionId ?? null,
    queue: session.queue,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function attemptToRow(attempt: Attempt, bucket: UserBucket): SessionAttemptRow {
  const question = bucket.questions[attempt.questionId];
  const source = question?.sourceId ? bucket.sources[question.sourceId] : undefined;

  return {
    id: attempt.id,
    user_id: attempt.userId,
    session_id: attempt.sessionId,
    question_id: attempt.questionId,
    source_id: question?.sourceId ?? null,
    source_title: source?.title ?? "Study kit",
    prompt: ensureNonNullString(question?.prompt, "Question"),
    answer: ensureNonNullString(attempt.answer, "Answer"),
    canonical_answer: ensureNonNullString(attempt.canonicalAnswer, ensureNonNullString(attempt.answer, "")),
    outcome: attempt.outcome,
    is_retry: attempt.isRetry,
    final: attempt.final,
    created_at: attempt.createdAt,
  };
}

function reviewStateToRow(reviewState: ReviewState, bucket: Pick<UserBucket, "questions" | "sources">): QuestionProgressRow {
  const question = bucket.questions[reviewState.questionId];
  const source = question?.sourceId ? bucket.sources[question.sourceId] : undefined;
  const mastery =
    reviewState.totalAttempts > 0
      ? Math.round((reviewState.correctAttempts / Math.max(1, reviewState.totalAttempts)) * 100)
      : 0;
  const pressure = reviewState.recentErrorCount + reviewState.nearMissCount * 0.5;

  return {
    user_id: reviewState.userId,
    question_id: reviewState.questionId,
    source_id: question?.sourceId ?? null,
    source_title: source?.title ?? "Study kit",
    prompt: question?.prompt ?? "",
    stability: reviewState.stability,
    difficulty: reviewState.difficulty,
    next_due_at: reviewState.nextDueAt,
    last_seen_at: reviewState.lastSeenAt ?? null,
    recent_error_count: reviewState.recentErrorCount,
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

async function loadRelationalBucketFromSupabase(userId: string): Promise<{ kind: "found"; bucket: UserBucket } | { kind: "missing" } | { kind: "unavailable"; reason: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { kind: "unavailable", reason: "Supabase client is not configured" };
  }

  const [
    sourcesResult,
    sourceFilesResult,
    extractionRunsResult,
    questionsResult,
    sessionsResult,
    attemptsResult,
    reviewStatesResult,
  ] = await Promise.all([
    supabase.from("study_sources").select("*").eq("user_id", userId),
    supabase.from("source_files").select("*").eq("user_id", userId),
    supabase.from("extraction_runs").select("*").eq("user_id", userId),
    supabase.from("study_questions").select("*").eq("user_id", userId),
    supabase.from("study_sessions").select("*").eq("user_id", userId),
    supabase.from("session_attempts").select("*").eq("user_id", userId),
    supabase.from("question_progress").select("*").eq("user_id", userId),
  ]);

  const firstError =
    sourcesResult.error ??
    sourceFilesResult.error ??
    extractionRunsResult.error ??
    questionsResult.error ??
    sessionsResult.error ??
    attemptsResult.error ??
    reviewStatesResult.error;

  if (firstError) {
    if (isRelationMissingError(firstError)) {
      return { kind: "unavailable", reason: "Normalized persistence tables are not installed yet" };
    }

    return { kind: "unavailable", reason: `Normalized state read failed (${firstError.message})` };
  }

  const bucket = emptyBucket();

  for (const row of (sourcesResult.data ?? []) as StudySourceRow[]) {
    bucket.sources[row.id] = sourceFromRow(row);
  }

  for (const row of (sourceFilesResult.data ?? []) as SourceFileRow[]) {
    bucket.sourceFiles[row.id] = sourceFileFromRow(row);
  }

  for (const row of (extractionRunsResult.data ?? []) as ExtractionRunRow[]) {
    bucket.extractionRuns[row.id] = extractionRunFromRow(row);
  }

  for (const row of (questionsResult.data ?? []) as QuestionRow[]) {
    bucket.questions[row.id] = questionFromRow(row);
  }

  for (const row of (sessionsResult.data ?? []) as StudySessionRow[]) {
    bucket.sessions[row.id] = sessionFromRow(row);
  }

  for (const row of (attemptsResult.data ?? []) as SessionAttemptRow[]) {
    bucket.attempts[row.id] = attemptFromRow(row);
  }

  for (const row of (reviewStatesResult.data ?? []) as QuestionProgressRow[]) {
    bucket.reviewStates[row.question_id] = reviewStateFromRow(row);
  }

  return hasBucketData(bucket) ? { kind: "found", bucket } : { kind: "missing" };
}

async function persistRelationalBucketToSupabase(userId: string, bucket: UserBucket): Promise<PersistBucketResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, reason: "Supabase client is not configured" };
  }

  const sources = Object.values(bucket.sources).map(sourceToRow);
  const sourceFiles = Object.values(bucket.sourceFiles)
    .filter((file) => bucket.sources[file.sourceId])
    .map(sourceFileToRow);
  const sourceFileIds = new Set(sourceFiles.map((file) => file.id));
  const extractionRuns = Object.values(bucket.extractionRuns)
    .filter((run) => sourceFileIds.has(run.sourceFileId))
    .map(extractionRunToRow);
  const questions = Object.values(bucket.questions)
    .filter((question) => bucket.sources[question.sourceId])
    .map(questionToRow);
  const sessions = Object.values(bucket.sessions).map((session) => sessionToRow(session, bucket));
  const attempts = Object.values(bucket.attempts).map((attempt) => attemptToRow(attempt, bucket));
  const reviewStates = Object.values(bucket.reviewStates).map((reviewState) => reviewStateToRow(reviewState, bucket));

  const upsertOperations: UpsertResponse[] = [];

  if (sources.length > 0) {
    upsertOperations.push(Promise.resolve(supabase.from("study_sources").upsert(sources, { onConflict: "id" })));
  }
  if (sourceFiles.length > 0) {
    upsertOperations.push(Promise.resolve(supabase.from("source_files").upsert(sourceFiles, { onConflict: "id" })));
  }
  if (extractionRuns.length > 0) {
    upsertOperations.push(Promise.resolve(supabase.from("extraction_runs").upsert(extractionRuns, { onConflict: "id" })));
  }
  if (questions.length > 0) {
    upsertOperations.push(Promise.resolve(supabase.from("study_questions").upsert(questions, { onConflict: "id" })));
  }
  if (sessions.length > 0) {
    upsertOperations.push(Promise.resolve(supabase.from("study_sessions").upsert(sessions, { onConflict: "id" })));
  }
  if (attempts.length > 0) {
    upsertOperations.push(Promise.resolve(supabase.from("session_attempts").upsert(attempts, { onConflict: "id" })));
  }
  if (reviewStates.length > 0) {
    upsertOperations.push(
      Promise.resolve(
        supabase.from("question_progress").upsert(reviewStates, {
          onConflict: "user_id,question_id",
        }),
      ),
    );
  }

  if (upsertOperations.length > 0) {
    const results = await Promise.all(upsertOperations);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      return { ok: false, reason: `Normalized state write failed (${firstError.message})` };
    }
  }

  return { ok: true };
}

async function loadBucketFromSupabase(userId: string): Promise<BucketLoadResult> {
  const relational = await loadRelationalBucketFromSupabase(userId);
  if (relational.kind === "found") {
    bucketCache.set(userId, relational.bucket);
    return {
      kind: "found",
      bucket: relational.bucket,
    };
  }

  if (relational.kind === "missing") {
    return {
      kind: "missing",
    };
  }

  return {
    kind: "unavailable",
    reason: relational.reason,
  };
}

export async function readUserBucket<T>(
  userId: string,
  reader: (bucket: UserBucket, state: SnapletState) => T | Promise<T>,
): Promise<T> {
  const remoteBucket = await loadBucketFromSupabase(userId);
  if (remoteBucket.kind === "found") {
    const state: SnapletState = { users: {} };
    state.users[userId] = cloneBucket(remoteBucket.bucket);
    return reader(cloneBucket(remoteBucket.bucket), state);
  }

  if (remoteBucket.kind === "missing") {
    const { state, bucket } = createEphemeralBucketState(userId);
    return reader(bucket, state);
  }

  throw persistenceUnavailableError(remoteBucket.reason);
}

export async function mutateUserBucket<T>(
  userId: string,
  mutator: (bucket: UserBucket, state: SnapletState) => T | Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    const remoteBucket = await loadBucketFromSupabase(userId);
    if (remoteBucket.kind === "unavailable") {
      throw persistenceUnavailableError(remoteBucket.reason);
    }

    const { state: remoteState, bucket } =
      remoteBucket.kind === "found"
        ? { state: { users: { [userId]: cloneBucket(remoteBucket.bucket) } }, bucket: cloneBucket(remoteBucket.bucket) }
        : createEphemeralBucketState(userId);
    const result = await mutator(bucket, remoteState);
    const persisted = await persistRelationalBucketToSupabase(userId, bucket);
    if (persisted.ok) {
      bucketCache.set(userId, bucket);
      return result;
    }

    if (isPersistFailure(persisted)) {
      throw persistenceUnavailableError(persisted.reason);
    }

    return result;
  };

  const existingChain = userWriteChains.get(userId) ?? Promise.resolve();
  const scheduled = existingChain.then(run, run);
  const settledChain = scheduled.then(
    () => undefined,
    () => undefined,
  );
  userWriteChains.set(userId, settledChain);

  settledChain.finally(() => {
    if (userWriteChains.get(userId) === settledChain) {
      userWriteChains.delete(userId);
    }
  });

  return scheduled;
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function deleteSourceRecords(userId: string, sourceId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw persistenceUnavailableError("Supabase client is not configured");
  }

  const { data: sourceFiles, error: sourceFilesError } = await supabase
    .from("source_files")
    .select("id")
    .eq("user_id", userId)
    .eq("source_id", sourceId);
  if (sourceFilesError) {
    throw new Error(`Source file lookup failed (${sourceFilesError.message})`);
  }

  const sourceFileIds = (sourceFiles ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((value): value is string => Boolean(value));

  if (sourceFileIds.length > 0) {
    const { error: extractionRunsError } = await supabase
      .from("extraction_runs")
      .delete()
      .eq("user_id", userId)
      .in("source_file_id", sourceFileIds);
    if (extractionRunsError) {
      throw new Error(`Extraction run deletion failed (${extractionRunsError.message})`);
    }
  }

  const deletions = await Promise.all([
    supabase.from("session_attempts").delete().eq("user_id", userId).eq("source_id", sourceId),
    supabase.from("question_progress").delete().eq("user_id", userId).eq("source_id", sourceId),
    supabase.from("study_sessions").delete().eq("user_id", userId).eq("source_id", sourceId),
    supabase.from("study_questions").delete().eq("user_id", userId).eq("source_id", sourceId),
    supabase.from("source_files").delete().eq("user_id", userId).eq("source_id", sourceId),
  ]);

  for (const [index, result] of deletions.entries()) {
    if (!result.error) {
      continue;
    }

    const labels = [
      "Session attempt deletion failed",
      "Question progress deletion failed",
      "Study session deletion failed",
      "Question deletion failed",
      "Source file deletion failed",
    ];
    throw new Error(`${labels[index]} (${result.error.message})`);
  }

  const { error } = await supabase.from("study_sources").delete().eq("user_id", userId).eq("id", sourceId);
  if (error) {
    throw new Error(`Source deletion failed (${error.message})`);
  }
}
