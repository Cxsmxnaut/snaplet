import {
  type Attempt,
  type AttemptOutcome,
  type CSVMapping,
  type CSVPreviewRow,
  type Question,
  type ReviewState,
  type Session,
  type SessionQuestion,
  type SourceVisibility,
  type StudySource,
  type UserBucket,
} from "../domain/types.js";
import { mapCsvRows, parseCsv, suggestCsvMapping, toPreviewRows } from "../domain/csv.js";
import { evaluateAnswer, isLexicalSemanticEquivalent } from "../domain/evaluation.js";
import { extractTextFromUpload } from "../domain/extraction.js";
import { generateQuestionPairs, generateStudyTitle } from "../domain/generation.js";
import { buildSessionQueue, pickRevisitOffset } from "../domain/queue.js";
import { semanticCheckAnswer, semanticPassesThreshold } from "./semantic-check.js";
import { removePublishedSourceSnapshot, syncPublishedSourceSnapshot } from "./published-snapshots.js";
import {
  buildFallbackProgressFromBucket,
  getAnalyticsProgress,
} from "./analytics.js";
import { recordProductEvent } from "./product-events.js";
import { createId, deleteSourceRecords, mutateUserBucket, readUserBucket } from "./store.js";

function nowIso(): string {
  return new Date().toISOString();
}

function toSourceSummary(source: StudySource) {
  const { content: _content, ...summary } = source;
  return summary;
}

async function syncSharedSnapshotForSource(userId: string, sourceId: string): Promise<void> {
  await readUserBucket(userId, async (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      await removePublishedSourceSnapshot(sourceId);
      return;
    }

    const activeQuestions = Object.values(bucket.questions)
      .filter((question) => question.sourceId === sourceId && question.status === "active")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    await syncPublishedSourceSnapshot(source, activeQuestions);
  });
}

function listAttempts(bucket: { attempts: Record<string, Attempt> }): Attempt[] {
  return Object.values(bucket.attempts).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function sortedQuestions(bucket: { questions: Record<string, Question> }): Question[] {
  return Object.values(bucket.questions)
    .filter((question) => question.status === "active")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function recomputeSourceQuestionCount(bucket: { questions: Record<string, Question>; sources: Record<string, StudySource> }, sourceId: string): void {
  const source = bucket.sources[sourceId];
  if (!source) {
    return;
  }

  source.questionCount = Object.values(bucket.questions).filter(
    (question) => question.sourceId === sourceId && question.status === "active",
  ).length;
  source.updatedAt = nowIso();
}

function ensureReviewState(
  bucket: { reviewStates: Record<string, ReviewState> },
  userId: string,
  questionId: string,
): ReviewState {
  const existing = bucket.reviewStates[questionId];
  if (existing) {
    return existing;
  }

  const reviewState: ReviewState = {
    userId,
    questionId,
    stability: 1,
    difficulty: 0.45,
    nextDueAt: nowIso(),
    recentErrorCount: 0,
    nearMissCount: 0,
    retrySuccessCount: 0,
    totalAttempts: 0,
    correctAttempts: 0,
  };
  bucket.reviewStates[questionId] = reviewState;
  return reviewState;
}

function addHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function applyReviewUpdate(reviewState: ReviewState, outcome: AttemptOutcome): void {
  reviewState.totalAttempts += 1;
  reviewState.lastSeenAt = nowIso();
  reviewState.lastOutcome = outcome;

  if (outcome === "exact") {
    reviewState.correctAttempts += 1;
    reviewState.stability = Math.min(12, reviewState.stability + 0.85);
    reviewState.difficulty = Math.max(0.05, reviewState.difficulty - 0.08);
    reviewState.recentErrorCount = Math.max(0, reviewState.recentErrorCount - 1);
    reviewState.nextDueAt = addHours(Math.max(10, reviewState.stability * 14));
    return;
  }

  if (outcome === "accent_near") {
    reviewState.correctAttempts += 1;
    reviewState.nearMissCount += 1;
    reviewState.stability = Math.min(10, reviewState.stability + 0.55);
    reviewState.difficulty = Math.min(1, reviewState.difficulty + 0.03);
    reviewState.recentErrorCount = Math.max(0, reviewState.recentErrorCount - 0.5);
    reviewState.nextDueAt = addHours(Math.max(8, reviewState.stability * 11));
    return;
  }

  if (outcome === "correct_after_retry") {
    reviewState.correctAttempts += 1;
    reviewState.retrySuccessCount += 1;
    reviewState.stability = Math.min(8, reviewState.stability + 0.3);
    reviewState.difficulty = Math.min(1, reviewState.difficulty + 0.08);
    reviewState.recentErrorCount = Math.max(0, reviewState.recentErrorCount + 0.2);
    reviewState.nextDueAt = addHours(Math.max(6, reviewState.stability * 8));
    return;
  }

  if (outcome === "typo_near") {
    reviewState.nearMissCount += 1;
    reviewState.recentErrorCount += 0.5;
    reviewState.nextDueAt = addHours(2);
    return;
  }

  reviewState.recentErrorCount += 1;
  reviewState.stability = Math.max(1, reviewState.stability * 0.65);
  reviewState.difficulty = Math.min(1, reviewState.difficulty + 0.16);
  reviewState.nextDueAt = addHours(4);
}

function currentSessionQuestion(session: Session, bucket: { questions: Record<string, Question> }): SessionQuestion | null {
  const queueItem = session.queue[session.pointer];
  if (!queueItem) {
    return null;
  }

  const question = bucket.questions[queueItem.questionId];
  if (!question) {
    return null;
  }

  return {
    sessionId: session.id,
    questionId: question.id,
    prompt: question.prompt,
    answer: question.answer,
    position: session.pointer + 1,
    kind: queueItem.kind,
  };
}

function sessionExpiryTime(session: Session): number {
  return new Date(session.startedAt).getTime() + session.timeCapSeconds * 1000;
}

function sessionEffectiveEndIso(session: Session): string {
  return new Date(sessionExpiryTime(session)).toISOString();
}

function sanitizeSessionDurationSeconds(
  durationSeconds: number,
  {
    timeCapSeconds,
    answeredCount,
    questionCap,
  }: {
    timeCapSeconds: number;
    answeredCount: number;
    questionCap: number;
  },
): number {
  const safeDuration = Number.isFinite(durationSeconds) ? Math.max(0, Math.round(durationSeconds)) : 0;
  const safeTimeCap = Number.isFinite(timeCapSeconds) ? Math.max(60, Math.round(timeCapSeconds)) : 300;
  const expectedAttemptWindow = Math.max(60, Math.min(45 * 60, Math.max(answeredCount, questionCap, 1) * 90));
  return Math.min(safeDuration, Math.max(safeTimeCap, expectedAttemptWindow));
}

function shouldAutoCloseSession(session: Session): boolean {
  if (session.endedAt) {
    return false;
  }

  if (session.answeredCount >= session.questionCap || session.pointer >= session.queue.length) {
    return true;
  }

  return Date.now() >= sessionExpiryTime(session);
}

async function finalizeSession(
  bucket: UserBucket,
  session: Session,
  endedAt?: string,
): Promise<void> {
  if (session.endedAt) {
    return;
  }

  const effectiveEndedAt = endedAt ?? nowIso();
  session.endedAt = effectiveEndedAt;
  session.updatedAt = effectiveEndedAt;
  session.pendingRetryQuestionId = undefined;
}

async function closeExpiredSessionsForSource(
  bucket: UserBucket,
  sourceId: string | null,
): Promise<Session[]> {
  const openSessions = getOpenSessionsForSource(bucket, sourceId);
  const validSessions: Session[] = [];

  for (const session of openSessions) {
    if (shouldAutoCloseSession(session)) {
      await finalizeSession(bucket, session, sessionEffectiveEndIso(session));
      continue;
    }

    validSessions.push(session);
  }

  return validSessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function maybeEndSession(session: Session): boolean {
  const ageSeconds = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
  const reachedCap = session.answeredCount >= session.questionCap;
  const exceededTime = ageSeconds >= session.timeCapSeconds;
  if (reachedCap || exceededTime || session.pointer >= session.queue.length) {
    session.endedAt = nowIso();
    session.updatedAt = nowIso();
    return true;
  }

  return false;
}

function normalizeSourceId(sourceId?: string): string | null {
  const trimmed = sourceId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getOpenSessionsForSource(bucket: UserBucket, sourceId: string | null): Session[] {
  return Object.values(bucket.sessions)
    .filter((session) => !session.endedAt && session.sourceId === sourceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function toBackendSessionStartResult(bucket: UserBucket, session: Session): {
  session: Session;
  currentQuestion: Omit<SessionQuestion, "answer"> | null;
} {
  const current = currentSessionQuestion(session, bucket);
  return {
    session,
    currentQuestion: current
      ? {
          sessionId: current.sessionId,
          questionId: current.questionId,
          prompt: current.prompt,
          position: current.position,
          kind: current.kind,
        }
      : null,
  };
}

function isOpenSessionConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("study_sessions_one_open_session_per_source_idx")
  );
}

async function generateQuestionsForSource(userId: string, sourceId: string): Promise<{ questionCount: number }> {
  const result = await mutateUserBucket(userId, async (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    source.questionGenerationStatus = "generating";
    source.updatedAt = nowIso();

    const generated = await generateQuestionPairs(source.content);
    if (generated.pairs.length === 0) {
      source.questionGenerationStatus = "failed";
      source.generationProvenance = generated.provenance;
      source.generationProvider = generated.provider ?? undefined;
      source.generationDegraded = generated.provenance !== "provider";
      source.updatedAt = nowIso();
      await recordProductEvent({
        name: "generation_failed",
        userId,
        sourceId: source.id,
        properties: {
          kind: source.kind,
          reason: "no_questions_generated",
          provenance: generated.provenance,
          provider: generated.provider,
        },
      });
      return { questionCount: source.questionCount };
    }

    const existingForSource = Object.values(bucket.questions).filter((question) => question.sourceId === source.id);
    for (const question of existingForSource) {
      question.status = "archived";
      question.updatedAt = nowIso();
    }

    for (const pair of generated.pairs) {
      const questionId = createId("q");
      bucket.questions[questionId] = {
        id: questionId,
        userId,
        sourceId,
        prompt: pair.prompt,
        answer: pair.answer,
        status: "active",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      ensureReviewState(bucket, userId, questionId);
    }

    source.questionGenerationStatus = "ready";
    source.generationProvenance = generated.provenance;
    source.generationProvider = generated.provider ?? undefined;
    source.generationDegraded = generated.provenance !== "provider";
    source.questionCount = generated.pairs.length;
    source.updatedAt = nowIso();
    await recordProductEvent({
      name: generated.provenance === "provider" ? "generation_succeeded" : "generation_failed",
      userId,
      sourceId: source.id,
      properties: {
        kind: source.kind,
        questionCount: generated.pairs.length,
        provenance: generated.provenance,
        provider: generated.provider,
        degraded: generated.provenance !== "provider",
      },
    });

    return { questionCount: generated.pairs.length };
  });

  await syncSharedSnapshotForSource(userId, sourceId);
  return result;
}

export async function listSources(userId: string): Promise<StudySource[]> {
  return readUserBucket(userId, (bucket) =>
    Object.values(bucket.sources)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function listSourceSummaries(userId: string): Promise<Array<Omit<StudySource, "content">>> {
  const sources = await listSources(userId);
  return sources.map((source) => toSourceSummary(source));
}

export async function createPasteSource(
  userId: string,
  title: string,
  content: string,
  options?: { visibility?: SourceVisibility },
): Promise<StudySource> {
  const trimmedContent = content.trim();
  if (trimmedContent.length < 8) {
    throw new Error("Source content is too short");
  }

  const generatedTitle = await generateStudyTitle(trimmedContent);
  const resolvedTitle = title.trim() || generatedTitle.trim() || "Untitled notes";
  const visibility = options?.visibility ?? "private";

  const source = await mutateUserBucket(userId, (bucket) => {
    const sourceId = createId("src");
    const createdAt = nowIso();

    const newSource: StudySource = {
      id: sourceId,
      userId,
      title: resolvedTitle,
      content: trimmedContent,
      kind: "paste",
      visibility,
      extractionStatus: "ready",
      questionGenerationStatus: "pending",
      generationProvenance: "none",
      generationDegraded: false,
      questionCount: 0,
      createdAt,
      updatedAt: createdAt,
    };

    bucket.sources[sourceId] = newSource;
    return newSource;
  });

  await generateQuestionsForSource(userId, source.id);
  const updatedSources = await listSources(userId);
  const updated = updatedSources.find((item) => item.id === source.id);
  if (!updated) {
    throw new Error("Source retrieval failed");
  }

  await recordProductEvent({
    name: "source_create_succeeded",
    userId,
    sourceId: updated.id,
    properties: {
      kind: updated.kind,
      questionCount: updated.questionCount,
      extractionStatus: updated.extractionStatus,
      questionGenerationStatus: updated.questionGenerationStatus,
    },
  });

  return updated;
}

export async function uploadSource(
  userId: string,
  file: File,
  options?: { visibility?: SourceVisibility },
): Promise<StudySource> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const visibility = options?.visibility ?? "private";

  if (isCsv) {
    const startedAt = Date.now();
    const csvText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const rows = parseCsv(csvText);
    const mapping = suggestCsvMapping(rows);

    const source = await mutateUserBucket(userId, (bucket) => {
      const sourceId = createId("src");
      const sourceFileId = createId("file");
      const runId = createId("xrun");
      const createdAt = nowIso();
      const mapped = mapping ? mapCsvRows(rows, mapping) : [];
      const serialized = mapped.map((row) => `${row.prompt}: ${row.answer}`).join("\n");
      const extractionStatus = mapped.length > 0 ? "ready" : "failed";
      const questionGenerationStatus = mapping && mapped.length > 0 ? "ready" : "failed";
      const qualityScore = mapped.length > 0 ? 1 : 0;

      const record: StudySource = {
        id: sourceId,
        userId,
        title: file.name,
        content: serialized,
        kind: "csv",
        visibility,
        extractionStatus,
        questionGenerationStatus,
        generationProvenance: "none",
        generationDegraded: false,
        questionCount: mapped.length,
        createdAt,
        updatedAt: createdAt,
      };

      bucket.sources[sourceId] = record;
      bucket.sourceFiles[sourceFileId] = {
        id: sourceFileId,
        userId,
        sourceId,
        fileName: file.name,
        mimeType: file.type || "text/csv",
        size: file.size,
        extractorMode: "csv",
        extractionStatus,
        qualityScore,
        createdAt,
        updatedAt: createdAt,
      };
      bucket.extractionRuns[runId] = {
        id: runId,
        userId,
        sourceFileId,
        parserPath: "csv_parse",
        ocrUsed: false,
        durationMs: Date.now() - startedAt,
        qualityScore,
        status: extractionStatus,
        errorDetails: mapping ? undefined : "CSV mapping could not be determined",
        createdAt,
      };

      for (const pair of mapped) {
        const questionId = createId("q");
        bucket.questions[questionId] = {
          id: questionId,
          userId,
          sourceId,
          prompt: pair.prompt,
          answer: pair.answer,
          status: "active",
          createdAt,
          updatedAt: createdAt,
        };
        ensureReviewState(bucket, userId, questionId);
      }

      return record;
    });

    if (!mapping) {
      await recordProductEvent({
        name: "upload_failed",
        userId,
        sourceId: source.id,
        properties: {
          kind: "csv",
          fileName: file.name,
          reason: "csv_mapping_missing",
        },
      });
      throw new Error("CSV mapping could not be determined");
    }

    await recordProductEvent({
      name: "upload_succeeded",
      userId,
      sourceId: source.id,
      properties: {
        kind: "csv",
        fileName: file.name,
        questionCount: source.questionCount,
        extractionStatus: source.extractionStatus,
      },
    });

    await syncSharedSnapshotForSource(userId, source.id);
    return source;
  }

  const initial = await mutateUserBucket(userId, (bucket) => {
    const sourceId = createId("src");
    const sourceFileId = createId("file");
    const runId = createId("xrun");
    const createdAt = nowIso();

    bucket.sources[sourceId] = {
      id: sourceId,
      userId,
      title: file.name,
      content: "",
      kind: "upload",
      visibility,
      extractionStatus: "extracting",
      questionGenerationStatus: "pending",
      generationProvenance: "none",
      generationDegraded: false,
      questionCount: 0,
      createdAt,
      updatedAt: createdAt,
    };

    bucket.sourceFiles[sourceFileId] = {
      id: sourceFileId,
      userId,
      sourceId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      extractorMode: "direct",
      extractionStatus: "extracting",
      qualityScore: 0,
      createdAt,
      updatedAt: createdAt,
    };

    bucket.extractionRuns[runId] = {
      id: runId,
      userId,
      sourceFileId,
      parserPath: "pending",
      ocrUsed: false,
      durationMs: 0,
      qualityScore: 0,
      status: "extracting",
      createdAt,
    };

    return {
      sourceId,
      sourceFileId,
      runId,
      startedAt: Date.now(),
    };
  });

  const extraction = await extractTextFromUpload(file.name, file.type, bytes);

  await mutateUserBucket(userId, (bucket) => {
    const source = bucket.sources[initial.sourceId];
    const sourceFile = bucket.sourceFiles[initial.sourceFileId];
    const run = bucket.extractionRuns[initial.runId];
    if (!source || !sourceFile || !run) {
      throw new Error("Source pipeline state missing");
    }

    source.content = extraction.text;
    source.extractionStatus = extraction.status;
    source.updatedAt = nowIso();
    const canAttemptGeneration = extraction.status !== "failed" && extraction.text.trim().length > 0;
    source.questionGenerationStatus = canAttemptGeneration ? "pending" : "failed";

    sourceFile.extractionStatus = extraction.status;
    sourceFile.extractorMode = extraction.ocrUsed ? "ocr_fallback" : "direct";
    sourceFile.qualityScore = extraction.qualityScore;
    sourceFile.updatedAt = nowIso();

    run.status = extraction.status;
    run.parserPath = extraction.parserPath;
    run.ocrUsed = extraction.ocrUsed;
    run.qualityScore = extraction.qualityScore;
    run.errorDetails = extraction.errorDetails;
    run.durationMs = Date.now() - initial.startedAt;
  });

  const canAttemptGeneration = extraction.status !== "failed" && extraction.text.trim().length > 0;
  if (canAttemptGeneration) {
    await generateQuestionsForSource(userId, initial.sourceId);
  }

  const sources = await listSources(userId);
  const source = sources.find((item) => item.id === initial.sourceId);
  if (!source) {
    throw new Error("Source was not found after upload");
  }

  await recordProductEvent({
    name: source.extractionStatus === "failed" ? "upload_failed" : "upload_succeeded",
    userId,
    sourceId: source.id,
    properties: {
      kind: source.kind,
      fileName: file.name,
      extractionStatus: source.extractionStatus,
      questionGenerationStatus: source.questionGenerationStatus,
      questionCount: source.questionCount,
    },
  });

  await syncSharedSnapshotForSource(userId, source.id);
  return source;
}

export async function previewCsv(fileText: string): Promise<{ rows: CSVPreviewRow[]; mapping: CSVMapping | null }> {
  const rows = parseCsv(fileText);
  const mapping = suggestCsvMapping(rows);

  return {
    rows: toPreviewRows(rows),
    mapping,
  };
}

export async function importCsvFromText(
  userId: string,
  title: string,
  csvText: string,
  mapping?: CSVMapping,
  options?: { visibility?: SourceVisibility },
): Promise<StudySource> {
  const rows = parseCsv(csvText);
  const resolvedMapping = mapping ?? suggestCsvMapping(rows);
  if (!resolvedMapping) {
    throw new Error("CSV mapping is required");
  }
  const startedAt = Date.now();
  const mapped = mapCsvRows(rows, resolvedMapping);
  const visibility = options?.visibility ?? "private";

  const source = await mutateUserBucket(userId, (bucket) => {
    const sourceId = createId("src");
    const sourceFileId = createId("file");
    const runId = createId("xrun");
    const createdAt = nowIso();
    const resolvedTitle = title.trim() || "CSV import";
    const serialized = mapped.map((row) => `${row.prompt}: ${row.answer}`).join("\n");
    const extractionStatus = mapped.length > 0 ? "ready" : "failed";
    const qualityScore = mapped.length > 0 ? 1 : 0;

    const record: StudySource = {
      id: sourceId,
      userId,
      title: resolvedTitle,
      content: serialized,
      kind: "csv",
      visibility,
      extractionStatus,
      questionGenerationStatus: mapped.length > 0 ? "ready" : "failed",
      generationProvenance: "none",
      generationDegraded: false,
      questionCount: mapped.length,
      createdAt,
      updatedAt: createdAt,
    };

    bucket.sources[sourceId] = record;
    bucket.sourceFiles[sourceFileId] = {
      id: sourceFileId,
      userId,
      sourceId,
      fileName: `${resolvedTitle}.csv`,
      mimeType: "text/csv",
      size: csvText.length,
      extractorMode: "csv",
      extractionStatus,
      qualityScore,
      createdAt,
      updatedAt: createdAt,
    };
    bucket.extractionRuns[runId] = {
      id: runId,
      userId,
      sourceFileId,
      parserPath: "csv_parse",
      ocrUsed: false,
      durationMs: Date.now() - startedAt,
      qualityScore,
      status: extractionStatus,
      createdAt,
    };

    for (const pair of mapped) {
      const questionId = createId("q");
      bucket.questions[questionId] = {
        id: questionId,
        userId,
        sourceId,
        prompt: pair.prompt,
        answer: pair.answer,
        status: "active",
        createdAt,
        updatedAt: createdAt,
      };
      ensureReviewState(bucket, userId, questionId);
    }

    return record;
  });

  await syncSharedSnapshotForSource(userId, source.id);
  return source;
}

export async function generateSourceQuestions(userId: string, sourceId: string): Promise<{ questionCount: number }> {
  return generateQuestionsForSource(userId, sourceId);
}

export async function listSourceQuestions(userId: string, sourceId: string): Promise<Question[]> {
  return readUserBucket(userId, (bucket) =>
    Object.values(bucket.questions)
      .filter((question) => question.sourceId === sourceId && question.status === "active")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );
}

export async function getSource(userId: string, sourceId: string): Promise<StudySource> {
  return readUserBucket(userId, (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }
    return { ...source };
  });
}

export async function updateSourceVisibility(
  userId: string,
  sourceId: string,
  visibility: SourceVisibility,
): Promise<StudySource> {
  const { source, previousVisibility } = await mutateUserBucket(userId, async (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    const previousVisibility = source.visibility;
    source.visibility = visibility;
    source.updatedAt = nowIso();
    return { source: { ...source }, previousVisibility };
  });

  try {
    await syncSharedSnapshotForSource(userId, sourceId);
  } catch (error) {
    await mutateUserBucket(userId, async (bucket) => {
      const source = bucket.sources[sourceId];
      if (!source) {
        return null;
      }

      source.visibility = previousVisibility;
      source.updatedAt = nowIso();
      return null;
    });

    throw error;
  }

  return source;
}

export async function createQuestionForSource(
  userId: string,
  sourceId: string,
  payload: { prompt: string; answer: string },
): Promise<Question> {
  const prompt = payload.prompt.trim();
  const answer = payload.answer.trim();
  if (prompt.length < 3 || answer.length < 1) {
    throw new Error("Question prompt and answer are required");
  }

  const question = await mutateUserBucket(userId, async (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    const id = createId("q");
    const createdAt = nowIso();
    const question: Question = {
      id,
      userId,
      sourceId,
      prompt,
      answer,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    };
    bucket.questions[id] = question;
    ensureReviewState(bucket, userId, id);
    recomputeSourceQuestionCount(bucket, sourceId);
    return question;
  });

  await syncSharedSnapshotForSource(userId, sourceId);
  return question;
}

export async function updateQuestion(
  userId: string,
  questionId: string,
  updates: { prompt?: string; answer?: string },
): Promise<Question> {
  const question = await mutateUserBucket(userId, async (bucket) => {
    const question = bucket.questions[questionId];
    if (!question) {
      throw new Error("Question not found");
    }

    const prompt = updates.prompt?.trim();
    const answer = updates.answer?.trim();

    if (prompt) {
      question.prompt = prompt;
    }

    if (answer) {
      question.answer = answer;
    }

    question.updatedAt = nowIso();
    return question;
  });

  await syncSharedSnapshotForSource(userId, question.sourceId);
  return question;
}

export async function deleteQuestions(userId: string, questionIds: string[]): Promise<{ deleted: number }> {
  if (questionIds.length === 0) {
    return { deleted: 0 };
  }

  const touchedSourceIds = await mutateUserBucket(userId, (bucket) => {
    let deleted = 0;
    const touched = new Set<string>();

    for (const questionId of questionIds) {
      const question = bucket.questions[questionId];
      if (!question || question.status !== "active") {
        continue;
      }
      question.status = "archived";
      question.updatedAt = nowIso();
      touched.add(question.sourceId);
      deleted += 1;
    }

    for (const sourceId of touched) {
      recomputeSourceQuestionCount(bucket, sourceId);
    }

    return {
      deleted,
      touchedSourceIds: [...touched],
    };
  });

  await Promise.all(touchedSourceIds.touchedSourceIds.map((sourceId) => syncSharedSnapshotForSource(userId, sourceId)));
  return { deleted: touchedSourceIds.deleted };
}

export async function archiveSource(userId: string, sourceId: string): Promise<void> {
  await mutateUserBucket(userId, (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    const questionIdsForSource = new Set<string>();
    const sessionIdsForSource = new Set<string>();

    for (const question of Object.values(bucket.questions)) {
      if (question.sourceId === sourceId) {
        questionIdsForSource.add(question.id);
        delete bucket.questions[question.id];
      }
    }

    for (const reviewState of Object.values(bucket.reviewStates)) {
      if (questionIdsForSource.has(reviewState.questionId)) {
        delete bucket.reviewStates[reviewState.questionId];
      }
    }

    for (const session of Object.values(bucket.sessions)) {
      if (session.sourceId === sourceId) {
        sessionIdsForSource.add(session.id);
        delete bucket.sessions[session.id];
      }
    }

    for (const attempt of Object.values(bucket.attempts)) {
      if (sessionIdsForSource.has(attempt.sessionId) || questionIdsForSource.has(attempt.questionId)) {
        delete bucket.attempts[attempt.id];
      }
    }

    for (const sourceFile of Object.values(bucket.sourceFiles)) {
      if (sourceFile.sourceId === sourceId) {
        delete bucket.sourceFiles[sourceFile.id];
      }
    }

    for (const run of Object.values(bucket.extractionRuns)) {
      if (!bucket.sourceFiles[run.sourceFileId]) {
        delete bucket.extractionRuns[run.id];
      }
    }

    delete bucket.sources[sourceId];
  });

  await deleteSourceRecords(userId, sourceId);
  await removePublishedSourceSnapshot(sourceId);
}

export async function duplicateSource(userId: string, sourceId: string): Promise<StudySource> {
  return mutateUserBucket(userId, (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    const now = nowIso();
    const newSourceId = createId("src");
    const copy: StudySource = {
      ...source,
      id: newSourceId,
      title: `${source.title} (Copy)`,
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    };
    bucket.sources[newSourceId] = copy;

    const originalQuestions = Object.values(bucket.questions).filter(
      (question) => question.sourceId === sourceId && question.status === "active",
    );

    for (const question of originalQuestions) {
      const id = createId("q");
      bucket.questions[id] = {
        ...question,
        id,
        sourceId: newSourceId,
        createdAt: now,
        updatedAt: now,
      };
      ensureReviewState(bucket, userId, id);
    }

    recomputeSourceQuestionCount(bucket, newSourceId);
    return copy;
  });
}

export async function startSession(
  userId: string,
  options?: { sourceId?: string; mode?: "standard" | "focus" | "weak_review" | "fast_drill" },
): Promise<{
  session: Session;
  currentQuestion: Omit<SessionQuestion, "answer"> | null;
}> {
  const requestedSourceId = normalizeSourceId(options?.sourceId);
  const mode = options?.mode ?? "standard";

  const run = async () =>
    mutateUserBucket(userId, async (bucket) => {
      const sourceId = requestedSourceId;
      const existingOpenSessions = await closeExpiredSessionsForSource(bucket, sourceId);
      if (existingOpenSessions.length > 0) {
        if (existingOpenSessions.length > 1) {
          for (const stale of existingOpenSessions.slice(1)) {
            await finalizeSession(bucket, stale);
          }
        }
        return toBackendSessionStartResult(bucket, existingOpenSessions[0]);
      }

      const allCandidates = sourceId
        ? sortedQuestions(bucket).filter((question) => question.sourceId === sourceId)
        : sortedQuestions(bucket);
      if (allCandidates.length === 0) {
        throw new Error("No active questions available. Add material first.");
      }

      for (const question of allCandidates) {
        ensureReviewState(bucket, userId, question.id);
      }

      const finalAttempts = listAttempts(bucket).filter((attempt) => attempt.final);
      const recentAttempts = finalAttempts.slice(-30);
      const recentCorrect = recentAttempts.filter((attempt) =>
        attempt.outcome === "exact" || attempt.outcome === "accent_near" || attempt.outcome === "correct_after_retry"
      ).length;
      const recentAccuracy = recentAttempts.length > 0 ? recentCorrect / recentAttempts.length : 1;

      const weakQuestions = allCandidates.filter((question) => {
        const review = bucket.reviewStates[question.id];
        if (!review) {
          return false;
        }

        return review.recentErrorCount > 0 || review.nearMissCount > 0 || review.lastOutcome === "incorrect";
      });
      const weakRatio = allCandidates.length > 0 ? weakQuestions.length / allCandidates.length : 0;

      let questionCap = 10;
      let maxReviewStreak = 2;
      let candidates = allCandidates;

      if (mode === "focus") {
        questionCap = 10;
        maxReviewStreak = 2;
      } else if (mode === "weak_review") {
        questionCap = 10;
        maxReviewStreak = 4;
        candidates = weakQuestions.length > 0 ? weakQuestions : allCandidates;
      } else if (mode === "fast_drill") {
        questionCap = 16;
        maxReviewStreak = 1;
      }

      // Adaptive behavior: when struggling, shrink sessions and lean harder into weak items.
      if (recentAccuracy < 0.6 || weakRatio > 0.45) {
        questionCap = Math.max(6, Math.min(questionCap, 8));
        if (mode === "standard" || mode === "fast_drill") {
          candidates = [...weakQuestions, ...allCandidates.filter((question) => !weakQuestions.includes(question))];
        }
      }

      // Adaptive behavior: when performing well, widen the set and favor newer items.
      if (recentAccuracy > 0.85 && weakRatio < 0.2) {
        questionCap = Math.min(20, questionCap + 4);
        if (mode === "standard" || mode === "fast_drill") {
          candidates = [...candidates].sort((a, b) => {
            const attemptsA = bucket.reviewStates[a.id]?.totalAttempts ?? 0;
            const attemptsB = bucket.reviewStates[b.id]?.totalAttempts ?? 0;
            if (attemptsA !== attemptsB) {
              return attemptsA - attemptsB;
            }
            return b.updatedAt.localeCompare(a.updatedAt);
          });
        }
      }

      const queue = buildSessionQueue({
        questions: candidates,
        reviewStates: bucket.reviewStates,
        attempts: finalAttempts,
        config: {
          questionCap,
          maxReviewStreak,
        },
      });

      if (queue.length === 0) {
        throw new Error("Unable to build a review queue");
      }

      const sessionId = createId("ses");
      const createdAt = nowIso();

      const session: Session = {
        id: sessionId,
        userId,
        sourceId,
        mode,
        startedAt: createdAt,
        questionCap,
        timeCapSeconds: 300,
        pointer: 0,
        answeredCount: 0,
        queue,
        createdAt,
        updatedAt: createdAt,
      };

      bucket.sessions[sessionId] = session;
      await recordProductEvent({
        name: "session_started",
        userId,
        sourceId: sourceId ?? null,
        sessionId,
        properties: {
          mode,
          questionCap,
        },
      });

      return toBackendSessionStartResult(bucket, session);
    });

  try {
    return await run();
  } catch (error) {
    if (!isOpenSessionConflictError(error)) {
      throw error;
    }

    return mutateUserBucket(userId, async (bucket) => {
      const recovered = (await closeExpiredSessionsForSource(bucket, requestedSourceId))[0];
      if (!recovered) {
        throw error;
      }

      return toBackendSessionStartResult(bucket, recovered);
    });
  }
}

export async function getSessionDetails(
  userId: string,
  sessionId: string,
): Promise<{
  session: {
    id: string;
    sourceId: string | null;
    mode: "standard" | "focus" | "weak_review" | "fast_drill";
    questionCap: number;
    answeredCount: number;
    correctCount: number;
    incorrectCount: number;
    startedAt: string;
    endedAt: string | null;
    pendingRetry: boolean;
  };
  currentQuestion: Omit<SessionQuestion, "answer"> | null;
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
}> {
  return mutateUserBucket(userId, async (bucket) => {
    const session = bucket.sessions[sessionId];
    if (!session) {
      throw new Error("Session not found");
    }

    if (shouldAutoCloseSession(session)) {
      await finalizeSession(bucket, session, sessionEffectiveEndIso(session));
    }

    const finalAttempts = Object.values(bucket.attempts)
      .filter((attempt) => attempt.sessionId === session.id && attempt.final)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const sourceId = session.sourceId ?? deriveSessionSourceId(bucket, session.id);
    const sourceTitle = sourceId ? bucket.sources[sourceId]?.title ?? null : null;
    const correctCount = finalAttempts.filter((attempt) => isCorrect(attempt.outcome)).length;
    const incorrectCount = finalAttempts.length - correctCount;
    const attemptCount = finalAttempts.length;
    const completedAt = session.endedAt ?? null;
    const durationSeconds = Math.max(
      0,
      Math.round(
        ((completedAt ? new Date(completedAt) : new Date()).getTime() - new Date(session.startedAt).getTime()) / 1000,
      ),
    );
    const sanitizedDurationSeconds = sanitizeSessionDurationSeconds(durationSeconds, {
      timeCapSeconds: session.timeCapSeconds,
      answeredCount: session.answeredCount,
      questionCap: session.questionCap,
    });

    return {
      session: {
        id: session.id,
        sourceId,
        mode: session.mode ?? "standard",
        questionCap: session.questionCap,
        answeredCount: session.answeredCount,
        correctCount,
        incorrectCount,
        startedAt: session.startedAt,
        endedAt: completedAt,
        pendingRetry: session.pendingRetryQuestionId != null,
      },
      currentQuestion: session.endedAt ? null : toClientQuestion(currentSessionQuestion(session, bucket)),
      summary: completedAt
        ? {
            sessionId: session.id,
            sourceId,
            sourceTitle,
            accuracy: attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0,
            correctCount,
            incorrectCount,
            durationSeconds: sanitizedDurationSeconds,
            completedAt,
            weakQuestions: finalAttempts
              .filter((attempt) => !isCorrect(attempt.outcome))
              .map((attempt) => ({
                question: bucket.questions[attempt.questionId]?.prompt ?? "Question",
                userAnswer: attempt.answer,
                correctAnswer: attempt.canonicalAnswer,
              })),
          }
        : null,
    };
  });
}

export async function getActiveSourceSession(
  userId: string,
  sourceId: string,
): Promise<{
  sessionId: string;
  sourceId: string;
  mode: "standard" | "focus" | "weak_review" | "fast_drill";
  answeredCount: number;
  questionCap: number;
  startedAt: string;
  updatedAt: string;
  pendingRetry: boolean;
  currentPosition: number | null;
} | null> {
  return mutateUserBucket(userId, async (bucket) => {
    const activeSession = (await closeExpiredSessionsForSource(bucket, sourceId))[0];

    if (!activeSession) {
      return null;
    }

    const currentQuestion = currentSessionQuestion(activeSession, bucket);

    return {
      sessionId: activeSession.id,
      sourceId,
      mode: activeSession.mode ?? "standard",
      answeredCount: activeSession.answeredCount,
      questionCap: activeSession.questionCap,
      startedAt: activeSession.startedAt,
      updatedAt: activeSession.updatedAt,
      pendingRetry: activeSession.pendingRetryQuestionId != null,
      currentPosition: currentQuestion?.position ?? null,
    };
  });
}

function getQuestionById(bucket: { questions: Record<string, Question> }, questionId: string): Question {
  const question = bucket.questions[questionId];
  if (!question) {
    throw new Error("Question not found");
  }

  return question;
}

function toClientQuestion(question: SessionQuestion | null): Omit<SessionQuestion, "answer"> | null {
  if (!question) {
    return null;
  }

  return {
    sessionId: question.sessionId,
    questionId: question.questionId,
    prompt: question.prompt,
    position: question.position,
    kind: question.kind,
  };
}

function isCorrect(outcome: AttemptOutcome): boolean {
  return outcome === "exact" || outcome === "accent_near" || outcome === "correct_after_retry";
}

type ProgressSummaryWindow = {
  attempts: number;
  correct: number;
  sessions: number;
  retention: number;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function deriveSessionSourceId(
  bucket: { attempts: Record<string, Attempt>; questions: Record<string, Question>; sessions: Record<string, Session> },
  sessionId: string,
): string | null {
  const session = bucket.sessions[sessionId];
  if (session?.sourceId) {
    return session.sourceId;
  }

  const counts = new Map<string, number>();
  for (const attempt of Object.values(bucket.attempts)) {
    if (attempt.sessionId !== sessionId || !attempt.final) {
      continue;
    }

    const sourceId = bucket.questions[attempt.questionId]?.sourceId;
    if (!sourceId) {
      continue;
    }

    counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
  }

  let strongest: { sourceId: string; count: number } | null = null;
  for (const [sourceId, count] of counts.entries()) {
    if (!strongest || count > strongest.count) {
      strongest = { sourceId, count };
    }
  }

  return strongest?.sourceId ?? null;
}

function computeWindow(
  attempts: Attempt[],
  sessions: Session[],
  startInclusive: Date,
  endExclusive: Date,
): ProgressSummaryWindow {
  const filteredAttempts = attempts.filter((attempt) => {
    const created = new Date(attempt.createdAt);
    return created >= startInclusive && created < endExclusive;
  });
  const filteredSessions = sessions.filter((session) => {
    const marker = new Date(session.endedAt ?? session.startedAt);
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

const AUTO_REVIEW_TITLE_PREFIX = "Auto Review ·";
const AUTO_REVIEW_TOPIC_MARKER = "AUTO_TOPIC:";
const AUTO_REVIEW_MIN_ERROR_SCORE = 3;
const AUTO_REVIEW_MAX_QUESTIONS = 16;

function parseAutoReviewTopic(source: StudySource): string | null {
  const firstLine = source.content.split("\n", 1)[0] ?? "";
  if (!firstLine.startsWith(AUTO_REVIEW_TOPIC_MARKER)) {
    return null;
  }

  return firstLine.slice(AUTO_REVIEW_TOPIC_MARKER.length).trim() || null;
}

function isAutoReviewSource(source: StudySource): boolean {
  return source.title.startsWith(AUTO_REVIEW_TITLE_PREFIX);
}

function classifyTopic(text: string): string {
  const normalized = text.toLowerCase();
  const score = (signals: string[]) => signals.reduce((sum, signal) => sum + (normalized.includes(signal) ? 1 : 0), 0);

  const spanishScore = score(["spanish", "espanol", "español", "verb", "conjug", "vocabulario", "vocabulary", "hola", "gracias", "¿", "¡"]);
  const scienceScore = score(["biology", "chemistry", "physics", "science", "cell", "atom", "molecule", "enzyme", "photosynthesis", "genetics"]);
  const mathScore = score(["math", "algebra", "geometry", "calculus", "equation", "derivative", "integral", "theorem"]);
  const historyScore = score(["history", "century", "empire", "revolution", "war", "civilization", "dynasty"]);

  const ranked = [
    { topic: "spanish", value: spanishScore },
    { topic: "science", value: scienceScore },
    { topic: "math", value: mathScore },
    { topic: "history", value: historyScore },
  ].sort((a, b) => b.value - a.value);

  if ((ranked[0]?.value ?? 0) <= 0) {
    return "general";
  }

  return ranked[0].topic;
}

function topicLabel(topic: string): string {
  if (topic === "spanish") return "Spanish";
  if (topic === "science") return "Science";
  if (topic === "math") return "Math";
  if (topic === "history") return "History";
  return "General";
}

function sourceTopic(source: StudySource): string {
  const autoTopic = parseAutoReviewTopic(source);
  if (autoTopic) {
    return autoTopic;
  }

  return classifyTopic(`${source.title}\n${source.content.slice(0, 4_000)}`);
}

function topicForQuestion(
  bucket: { sources: Record<string, StudySource> },
  question: Question,
): string {
  const source = bucket.sources[question.sourceId];
  if (!source) {
    return "general";
  }

  return sourceTopic(source);
}

function maybeUpsertAutoReviewKitForTopic(
  bucket: {
    sources: Record<string, StudySource>;
    questions: Record<string, Question>;
    reviewStates: Record<string, ReviewState>;
  },
  userId: string,
  topic: string,
): void {
  const activeNonAutoQuestions = Object.values(bucket.questions).filter((question) => {
    if (question.status !== "active") {
      return false;
    }

    const source = bucket.sources[question.sourceId];
    if (!source || isAutoReviewSource(source)) {
      return false;
    }

    return topicForQuestion(bucket, question) === topic;
  });

  const scored = activeNonAutoQuestions
    .map((question) => {
      const review = bucket.reviewStates[question.id];
      const recentError = review?.recentErrorCount ?? 0;
      const nearMiss = review?.nearMissCount ?? 0;
      return {
        question,
        score: recentError * 2 + nearMiss,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const topicErrorScore = scored.reduce((sum, entry) => sum + entry.score, 0);
  if (topicErrorScore < AUTO_REVIEW_MIN_ERROR_SCORE) {
    return;
  }

  const picks = scored.slice(0, AUTO_REVIEW_MAX_QUESTIONS).map((entry) => entry.question);
  if (picks.length === 0) {
    return;
  }

  const existingAutoSource = Object.values(bucket.sources).find((source) =>
    isAutoReviewSource(source) && parseAutoReviewTopic(source) === topic,
  );

  const now = nowIso();
  const autoSource = existingAutoSource ?? {
    id: createId("src"),
    userId,
    title: `${AUTO_REVIEW_TITLE_PREFIX} ${topicLabel(topic)}`,
    content: "",
    kind: "paste" as const,
    visibility: "private" as const,
    extractionStatus: "ready" as const,
    questionGenerationStatus: "ready" as const,
    questionCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  autoSource.content = `${AUTO_REVIEW_TOPIC_MARKER}${topic}\nAuto-generated from repeated mistakes in ${topicLabel(topic)}.`;
  autoSource.updatedAt = now;
  bucket.sources[autoSource.id] = autoSource;

  for (const question of Object.values(bucket.questions)) {
    if (question.sourceId === autoSource.id) {
      question.status = "archived";
      question.updatedAt = now;
    }
  }

  for (const weak of picks) {
    const id = createId("q");
    bucket.questions[id] = {
      id,
      userId,
      sourceId: autoSource.id,
      prompt: weak.prompt,
      answer: weak.answer,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    ensureReviewState(bucket, userId, id);
  }

  recomputeSourceQuestionCount(bucket, autoSource.id);
}

function insertRevisit(session: Session, questionId: string): void {
  const offset = pickRevisitOffset();
  const insertionIndex = Math.min(session.queue.length, session.pointer + offset);
  const alreadyNearby = session.queue
    .slice(Math.max(0, insertionIndex - 1), Math.min(session.queue.length, insertionIndex + 2))
    .some((entry) => entry.questionId === questionId);

  if (!alreadyNearby) {
    session.queue.splice(insertionIndex, 0, {
      questionId,
      kind: "revisit",
    });
  }
}

export async function submitAttempt(
  userId: string,
  sessionId: string,
  payload: { questionId: string; answer: string; isRetry?: boolean },
): Promise<{
  needsRetry: boolean;
  outcome: AttemptOutcome;
  feedback: string;
  correctAnswer: string;
  sessionEnded: boolean;
  nextQuestion: Omit<SessionQuestion, "answer"> | null;
}> {
  return mutateUserBucket(userId, async (bucket) => {
    const session = bucket.sessions[sessionId];
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.endedAt) {
      throw new Error("Session already ended");
    }

    const activeQuestion = currentSessionQuestion(session, bucket);
    if (!activeQuestion || activeQuestion.questionId !== payload.questionId) {
      throw new Error("Submitted question does not match current session position");
    }

    const question = getQuestionById(bucket, payload.questionId);
    const evaluation = evaluateAnswer(payload.answer, question.answer);
    const lexicalSemanticMatch =
      evaluation.outcome === "incorrect" && isLexicalSemanticEquivalent(payload.answer, question.answer);
    const shouldRunModelSemanticCheck = evaluation.outcome === "incorrect" && !lexicalSemanticMatch;
    const semanticResult = shouldRunModelSemanticCheck
      ? await semanticCheckAnswer({
          prompt: question.prompt,
          canonicalAnswer: question.answer,
          userAnswer: payload.answer,
        })
      : null;
    const semanticMatch = lexicalSemanticMatch || semanticPassesThreshold(semanticResult);

    const isRetry = Boolean(payload.isRetry);
    if (isRetry && session.pendingRetryQuestionId !== question.id) {
      throw new Error("Retry was not expected for this question");
    }

    if (!isRetry && evaluation.outcome === "typo_near") {
      const attemptId = createId("att");
      bucket.attempts[attemptId] = {
        id: attemptId,
        userId,
        sessionId: session.id,
        questionId: question.id,
        answer: payload.answer,
        canonicalAnswer: question.answer,
        outcome: "typo_near",
        isRetry: false,
        final: false,
        createdAt: nowIso(),
      };
      session.pendingRetryQuestionId = question.id;
      session.updatedAt = nowIso();

      const reviewState = ensureReviewState(bucket, userId, question.id);
      applyReviewUpdate(reviewState, "typo_near");

      return {
        needsRetry: true,
        outcome: "typo_near",
        feedback: "Almost there. Fix the typo and retry once.",
        correctAnswer: question.answer,
        sessionEnded: false,
        nextQuestion: toClientQuestion(activeQuestion),
      };
    }

    let finalOutcome: AttemptOutcome = semanticMatch ? "exact" : evaluation.outcome;
    if (isRetry) {
      finalOutcome = evaluation.outcome === "exact" || evaluation.outcome === "accent_near" || semanticMatch
        ? "correct_after_retry"
        : "incorrect";
      session.pendingRetryQuestionId = undefined;
    }

    const attemptId = createId("att");
    bucket.attempts[attemptId] = {
      id: attemptId,
      userId,
      sessionId: session.id,
      questionId: question.id,
      answer: payload.answer,
      canonicalAnswer: question.answer,
      outcome: finalOutcome,
      isRetry,
      final: true,
      createdAt: nowIso(),
    };

    const reviewState = ensureReviewState(bucket, userId, question.id);
    applyReviewUpdate(reviewState, finalOutcome);

    if (!isCorrect(finalOutcome)) {
      const topic = topicForQuestion(bucket, question);
      maybeUpsertAutoReviewKitForTopic(bucket, userId, topic);
      insertRevisit(session, question.id);
    }

    session.pointer += 1;
    session.answeredCount += 1;
    session.updatedAt = nowIso();

    const ended = maybeEndSession(session);
    if (ended) {
      const sessionAttempts = Object.values(bucket.attempts).filter((attempt) => attempt.sessionId === session.id);
      const correctCount = sessionAttempts.filter((attempt) => attempt.final && isCorrect(attempt.outcome)).length;
      const incorrectCount = sessionAttempts.filter((attempt) => attempt.final).length - correctCount;
      await recordProductEvent({
        name: "session_completed",
        userId,
        sourceId: session.sourceId ?? question.sourceId,
        sessionId: session.id,
        properties: {
          mode: session.mode ?? "standard",
          answeredCount: session.answeredCount,
          correctCount,
          incorrectCount,
          durationSeconds: Math.max(
            0,
            Math.round((new Date(session.endedAt ?? nowIso()).getTime() - new Date(session.startedAt).getTime()) / 1000),
          ),
        },
      });
    }
    const next = ended ? null : currentSessionQuestion(session, bucket);

    const feedbackByOutcome: Record<AttemptOutcome, string> = {
      exact: "Correct.",
      accent_near: "Correct, but include accents/marks next time.",
      typo_near: "Almost right.",
      correct_after_retry: "Correct after retry.",
      incorrect: "Incorrect. You will see this again soon.",
    };
    const semanticUnavailable = shouldRunModelSemanticCheck && !semanticMatch && !semanticResult;
    const feedback = semanticMatch
      ? (isRetry ? "Correct after retry (semantic match)." : "Correct (semantic match).")
      : semanticUnavailable && finalOutcome === "incorrect"
      ? "Incorrect. Semantic check was unavailable, so this was graded with strict matching."
      : feedbackByOutcome[finalOutcome];

    return {
      needsRetry: false,
      outcome: finalOutcome,
      feedback,
      correctAnswer: question.answer,
      sessionEnded: ended,
      nextQuestion: toClientQuestion(next),
    };
  });
}

export async function getProgress(userId: string): Promise<{
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
}> {
  return readUserBucket(userId, async (bucket) => {
    const sourceCount = Object.keys(bucket.sources).length;
    const activeQuestionCount = Object.values(bucket.questions).filter((question) => question.status === "active").length;
    const hasStoredStudySignal =
      Object.keys(bucket.sessions).length > 0 ||
      Object.keys(bucket.attempts).length > 0 ||
      Object.keys(bucket.reviewStates).length > 0;
    const analyticsProgress = await getAnalyticsProgress(userId, sourceCount, activeQuestionCount);
    if (analyticsProgress) {
      return analyticsProgress;
    }

    const fallbackProgress = hasStoredStudySignal
      ? buildFallbackProgressFromBucket(userId, bucket, sourceCount, activeQuestionCount)
      : null;
    if (fallbackProgress) {
      return fallbackProgress;
    }

    if (hasStoredStudySignal) {
      return buildEmptyProgress(sourceCount, activeQuestionCount);
    }

    return buildEmptyProgress(sourceCount, activeQuestionCount);
  });
}

function buildEmptyProgress(sourceCount: number, activeQuestionCount: number): {
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
} {
  return {
    totals: {
      sources: sourceCount,
      questions: activeQuestionCount,
      sessions: 0,
      attempts: 0,
    },
    outcomes: {
      exact: 0,
      accent_near: 0,
      typo_near: 0,
      correct_after_retry: 0,
      incorrect: 0,
    },
    weakQuestions: [],
    recentSessions: [],
    timeSeries: [],
    kitBreakdown: [],
    comparisons: {
      current: {
        attempts: 0,
        sessions: 0,
        retention: 0,
      },
      previous: {
        attempts: 0,
        sessions: 0,
        retention: 0,
      },
      deltas: {
        attempts: 0,
        sessions: 0,
        retention: 0,
      },
    },
    recommendations:
      sourceCount === 0
        ? {
            headline: "Start your first signal loop",
            summary: "Create a study kit so Snaplet can begin tracking retention, weak spots, and momentum.",
            actionLabel: "Create your first kit",
            actionType: "create_kit" as const,
            sourceId: null,
            mode: null,
          }
        : {
            headline: "Turn your first kit into a real study signal",
            summary: "You already have study material in Snaplet. Complete a session and this page will start showing retention, weak spots, and per-kit momentum.",
            actionLabel: "Open study kits",
            actionType: "open_kits" as const,
            sourceId: null,
            mode: null,
          },
  };
}
