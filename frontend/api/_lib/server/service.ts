import {
  type Attempt,
  type AttemptOutcome,
  type CSVMapping,
  type CSVPreviewRow,
  type Question,
  type ReviewState,
  type Session,
  type SessionQuestion,
  type StudySource,
} from "../domain/types.js";
import { mapCsvRows, parseCsv, suggestCsvMapping, toPreviewRows } from "../domain/csv.js";
import { evaluateAnswer, isLexicalSemanticEquivalent } from "../domain/evaluation.js";
import { extractTextFromUpload } from "../domain/extraction.js";
import { generateQuestionPairs, generateStudyTitle } from "../domain/generation.js";
import { buildSessionQueue, pickRevisitOffset } from "../domain/queue.js";
import { semanticCheckAnswer, semanticPassesThreshold } from "./semantic-check.js";
import {
  ensureAnalyticsBackfill,
  getAnalyticsProgress,
  syncAttemptRecord,
  syncQuestionProgressRecord,
  syncSessionFinal,
  syncSessionStart,
} from "./analytics.js";
import { createId, mutateUserBucket, readUserBucket } from "./store.js";

function nowIso(): string {
  return new Date().toISOString();
}

function toSourceSummary(source: StudySource) {
  return {
    ...source,
  };
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

async function generateQuestionsForSource(userId: string, sourceId: string): Promise<{ questionCount: number }> {
  return mutateUserBucket(userId, async (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    source.questionGenerationStatus = "generating";
    source.updatedAt = nowIso();

    const generated = await generateQuestionPairs(source.content);
    if (generated.length === 0) {
      source.questionGenerationStatus = "failed";
      source.updatedAt = nowIso();
      return { questionCount: source.questionCount };
    }

    const existingForSource = Object.values(bucket.questions).filter((question) => question.sourceId === source.id);
    for (const question of existingForSource) {
      question.status = "archived";
      question.updatedAt = nowIso();
    }

    for (const pair of generated) {
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
    source.questionCount = generated.length;
    source.updatedAt = nowIso();

    return { questionCount: generated.length };
  });
}

export async function listSources(userId: string): Promise<StudySource[]> {
  return readUserBucket(userId, (bucket) =>
    Object.values(bucket.sources)
      .map((source) => toSourceSummary(source))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function createPasteSource(userId: string, title: string, content: string): Promise<StudySource> {
  const trimmedContent = content.trim();
  if (trimmedContent.length < 8) {
    throw new Error("Source content is too short");
  }

  const generatedTitle = await generateStudyTitle(trimmedContent);
  const resolvedTitle = title.trim() || generatedTitle.trim() || "Untitled notes";

  const source = await mutateUserBucket(userId, (bucket) => {
    const sourceId = createId("src");
    const createdAt = nowIso();

    const newSource: StudySource = {
      id: sourceId,
      userId,
      title: resolvedTitle,
      content: trimmedContent,
      kind: "paste",
      extractionStatus: "ready",
      questionGenerationStatus: "pending",
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

  return updated;
}

export async function uploadSource(userId: string, file: File): Promise<StudySource> {
  const bytes = new Uint8Array(await file.arrayBuffer());

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
      kind: file.name.toLowerCase().endsWith(".csv") ? "csv" : "upload",
      extractionStatus: "extracting",
      questionGenerationStatus: "pending",
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

  if (file.name.toLowerCase().endsWith(".csv")) {
    const csvText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const rows = parseCsv(csvText);
    const mapping = suggestCsvMapping(rows);
    if (!mapping) {
      await mutateUserBucket(userId, (bucket) => {
        const source = bucket.sources[initial.sourceId];
        const sourceFile = bucket.sourceFiles[initial.sourceFileId];
        const run = bucket.extractionRuns[initial.runId];

        source.extractionStatus = "failed";
        source.updatedAt = nowIso();
        source.questionGenerationStatus = "failed";

        sourceFile.extractionStatus = "failed";
        sourceFile.updatedAt = nowIso();

        run.status = "failed";
        run.parserPath = "csv_parse";
        run.errorDetails = "CSV mapping could not be determined";
        run.durationMs = Date.now() - initial.startedAt;
      });

      throw new Error("CSV mapping could not be determined");
    }

    await importCsvRows(userId, initial.sourceId, rows, mapping, initial.sourceFileId, initial.runId, initial.startedAt);
  } else {
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
      source.questionGenerationStatus = extraction.status === "failed" ? "failed" : "pending";

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

    if (extraction.status === "ready") {
      await generateQuestionsForSource(userId, initial.sourceId);
    }
  }

  const sources = await listSources(userId);
  const source = sources.find((item) => item.id === initial.sourceId);
  if (!source) {
    throw new Error("Source was not found after upload");
  }

  return source;
}

async function importCsvRows(
  userId: string,
  sourceId: string,
  rows: Array<Record<string, string>>,
  mapping: CSVMapping,
  sourceFileId: string,
  runId: string,
  startedAt: number,
): Promise<void> {
  const mapped = mapCsvRows(rows, mapping);

  await mutateUserBucket(userId, (bucket) => {
    const source = bucket.sources[sourceId];
    const sourceFile = bucket.sourceFiles[sourceFileId];
    const run = bucket.extractionRuns[runId];

    if (!source || !sourceFile || !run) {
      throw new Error("CSV state could not be found");
    }

    const serialized = mapped.map((row) => `${row.prompt}: ${row.answer}`).join("\n");
    source.content = serialized;
    source.extractionStatus = mapped.length > 0 ? "ready" : "failed";
    source.questionGenerationStatus = mapped.length > 0 ? "ready" : "failed";
    source.questionCount = mapped.length;
    source.updatedAt = nowIso();

    sourceFile.extractionStatus = source.extractionStatus;
    sourceFile.extractorMode = "csv";
    sourceFile.qualityScore = mapped.length > 0 ? 1 : 0;
    sourceFile.updatedAt = nowIso();

    run.status = source.extractionStatus;
    run.parserPath = "csv_parse";
    run.ocrUsed = false;
    run.qualityScore = sourceFile.qualityScore;
    run.durationMs = Date.now() - startedAt;

    for (const pair of mapped) {
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
  });
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
): Promise<StudySource> {
  const rows = parseCsv(csvText);
  const resolvedMapping = mapping ?? suggestCsvMapping(rows);
  if (!resolvedMapping) {
    throw new Error("CSV mapping is required");
  }

  const created = await mutateUserBucket(userId, (bucket) => {
    const sourceId = createId("src");
    const sourceFileId = createId("file");
    const runId = createId("xrun");
    const createdAt = nowIso();

    const record: StudySource = {
      id: sourceId,
      userId,
      title: title.trim() || "CSV import",
      content: "",
      kind: "csv",
      extractionStatus: "extracting",
      questionGenerationStatus: "pending",
      questionCount: 0,
      createdAt,
      updatedAt: createdAt,
    };

    bucket.sources[sourceId] = record;
    bucket.sourceFiles[sourceFileId] = {
      id: sourceFileId,
      userId,
      sourceId,
      fileName: `${record.title}.csv`,
      mimeType: "text/csv",
      size: csvText.length,
      extractorMode: "csv",
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
      source: record,
      sourceFileId,
      runId,
      startedAt: Date.now(),
    };
  });

  await importCsvRows(
    userId,
    created.source.id,
    rows,
    resolvedMapping,
    created.sourceFileId,
    created.runId,
    created.startedAt,
  );

  const sources = await listSources(userId);
  const updated = sources.find((item) => item.id === created.source.id);
  if (!updated) {
    throw new Error("CSV source could not be read");
  }

  return updated;
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

  return mutateUserBucket(userId, async (bucket) => {
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
}

export async function updateQuestion(
  userId: string,
  questionId: string,
  updates: { prompt?: string; answer?: string },
): Promise<Question> {
  return mutateUserBucket(userId, async (bucket) => {
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
}

export async function deleteQuestions(userId: string, questionIds: string[]): Promise<{ deleted: number }> {
  if (questionIds.length === 0) {
    return { deleted: 0 };
  }

  return mutateUserBucket(userId, (bucket) => {
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

    return { deleted };
  });
}

export async function archiveSource(userId: string, sourceId: string): Promise<void> {
  return mutateUserBucket(userId, (bucket) => {
    const source = bucket.sources[sourceId];
    if (!source) {
      throw new Error("Source not found");
    }

    for (const question of Object.values(bucket.questions)) {
      if (question.sourceId === sourceId) {
        question.status = "archived";
        question.updatedAt = nowIso();
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
  return mutateUserBucket(userId, async (bucket) => {
    const mode = options?.mode ?? "standard";
    const sourceId = options?.sourceId?.trim();
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
    await syncSessionStart(session, sourceId ? bucket.sources[sourceId] : undefined);

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
    const semanticResult = evaluation.outcome === "incorrect" && !lexicalSemanticMatch
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
      await syncAttemptRecord(
        bucket.attempts[attemptId],
        question,
        bucket.sources[question.sourceId],
      );
      await syncQuestionProgressRecord(
        userId,
        question,
        bucket.sources[question.sourceId],
        reviewState,
      );

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
    await syncAttemptRecord(
      bucket.attempts[attemptId],
      question,
      bucket.sources[question.sourceId],
    );
    await syncQuestionProgressRecord(
      userId,
      question,
      bucket.sources[question.sourceId],
      reviewState,
    );

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
      await syncSessionFinal(
        session,
        session.sourceId ? bucket.sources[session.sourceId] : undefined,
        Object.values(bucket.attempts).filter((attempt) => attempt.sessionId === session.id),
      );
    }
    const next = ended ? null : currentSessionQuestion(session, bucket);

    const feedbackByOutcome: Record<AttemptOutcome, string> = {
      exact: "Correct.",
      accent_near: "Correct, but include accents/marks next time.",
      typo_near: "Almost right.",
      correct_after_retry: "Correct after retry.",
      incorrect: "Incorrect. You will see this again soon.",
    };
    const semanticUnavailable =
      evaluation.outcome === "incorrect" &&
      !semanticMatch &&
      !semanticResult;
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
    await ensureAnalyticsBackfill(userId, bucket);
    const analyticsProgress = await getAnalyticsProgress(
      userId,
      Object.keys(bucket.sources).length,
      Object.values(bucket.questions).filter((question) => question.status === "active").length,
    );
    if (analyticsProgress) {
      return analyticsProgress;
    }

    return buildBucketProgress(bucket);
  });
}

function buildBucketProgress(bucket: UserBucket): {
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
    const attempts = listAttempts(bucket).filter((item) => item.final);
    const completedSessions = Object.values(bucket.sessions)
      .filter((session) => session.endedAt)
      .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt));

    const outcomes: Record<AttemptOutcome, number> = {
      exact: 0,
      accent_near: 0,
      typo_near: 0,
      correct_after_retry: 0,
      incorrect: 0,
    };

    for (const attempt of attempts) {
      outcomes[attempt.outcome] += 1;
    }

    const weakQuestions = Object.values(bucket.reviewStates)
      .filter((reviewState) => reviewState.recentErrorCount > 0 || reviewState.nearMissCount > 0)
      .sort((a, b) => b.recentErrorCount - a.recentErrorCount)
      .slice(0, 6)
      .map((reviewState) => ({
        questionId: reviewState.questionId,
        prompt: bucket.questions[reviewState.questionId]?.prompt ?? "",
        recentErrorCount: Number(reviewState.recentErrorCount.toFixed(2)),
        nearMissCount: reviewState.nearMissCount,
        sourceId: bucket.questions[reviewState.questionId]?.sourceId ?? null,
        sourceTitle: bucket.sources[bucket.questions[reviewState.questionId]?.sourceId ?? ""]?.title ?? null,
      }));

    const recentSessions = completedSessions.slice(0, 8).map((session) => {
      const sessionAttempts = attempts.filter((attempt) => attempt.sessionId === session.id);
      const correctCount = sessionAttempts.filter((attempt) => isCorrect(attempt.outcome)).length;
      const incorrectCount = sessionAttempts.length - correctCount;
      const accuracy = sessionAttempts.length > 0 ? Math.round((correctCount / sessionAttempts.length) * 100) : 0;
      const sourceId = deriveSessionSourceId(bucket, session.id);
      const startedAt = new Date(session.startedAt).getTime();
      const endedAt = new Date(session.endedAt ?? session.updatedAt).getTime();
      return {
        sessionId: session.id,
        sourceId,
        sourceTitle: sourceId ? bucket.sources[sourceId]?.title ?? "Study kit" : "Mixed review",
        mode: session.mode ?? "standard",
        accuracy,
        correctCount,
        incorrectCount,
        attemptCount: sessionAttempts.length,
        durationSeconds: Math.max(60, Math.round((endedAt - startedAt) / 1000)),
        completedAt: session.endedAt ?? session.updatedAt,
      };
    });

    const today = new Date();
    const currentWindowStart = addDays(today, -6);
    const previousWindowStart = addDays(today, -13);
    const previousWindowEnd = addDays(today, -6);

    const timeSeries = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(today, index - 13);
      const key = dayKey(date);
      const dayAttempts = attempts.filter((attempt) => dayKey(attempt.createdAt) === key);
      const daySessions = completedSessions.filter((session) => dayKey(session.endedAt ?? session.startedAt) === key);
      const correctCount = dayAttempts.filter((attempt) => isCorrect(attempt.outcome)).length;
      return {
        date: key,
        label: formatDayLabel(date),
        attempts: dayAttempts.length,
        sessions: daySessions.length,
        accuracy: dayAttempts.length > 0 ? Math.round((correctCount / dayAttempts.length) * 100) : 0,
      };
    });

    const currentWindow = computeWindow(attempts, completedSessions, currentWindowStart, addDays(today, 1));
    const previousWindow = computeWindow(attempts, completedSessions, previousWindowStart, previousWindowEnd);

    const sourceGroups = new Map<string, {
      attempts: Attempt[];
      sessionIds: Set<string>;
      lastStudiedAt: string | null;
      weakPressure: number;
      mastery: number;
      masteryDelta: number;
    }>();

    for (const source of Object.values(bucket.sources)) {
      const sourceAttempts = attempts.filter((attempt) => bucket.questions[attempt.questionId]?.sourceId === source.id);
      if (sourceAttempts.length === 0) {
        continue;
      }

      const sourceQuestions = Object.values(bucket.questions).filter((question) => question.sourceId === source.id && question.status === "active");
      const reviewStates = sourceQuestions.map((question) => bucket.reviewStates[question.id]).filter(Boolean);
      const mastery = reviewStates.length > 0
        ? Math.round(
            (reviewStates.reduce((sum, state) => sum + (state.totalAttempts > 0 ? state.correctAttempts / state.totalAttempts : 0), 0) /
              reviewStates.length) *
              100,
          )
        : 0;
      const weakPressure = reviewStates.reduce((sum, state) => sum + state.recentErrorCount + state.nearMissCount * 0.5, 0);
      const sourceCurrent = computeWindow(
        sourceAttempts,
        completedSessions.filter((session) => deriveSessionSourceId(bucket, session.id) === source.id),
        currentWindowStart,
        addDays(today, 1),
      );
      const sourcePrevious = computeWindow(
        sourceAttempts,
        completedSessions.filter((session) => deriveSessionSourceId(bucket, session.id) === source.id),
        previousWindowStart,
        previousWindowEnd,
      );

      sourceGroups.set(source.id, {
        attempts: sourceAttempts,
        sessionIds: new Set(sourceAttempts.map((attempt) => attempt.sessionId)),
        lastStudiedAt: sourceAttempts[sourceAttempts.length - 1]?.createdAt ?? null,
        weakPressure: Number(weakPressure.toFixed(2)),
        mastery,
        masteryDelta: sourceCurrent.retention - sourcePrevious.retention,
      });
    }

    const kitBreakdown = [...sourceGroups.entries()]
      .map(([sourceId, entry]) => {
        const correctCount = entry.attempts.filter((attempt) => isCorrect(attempt.outcome)).length;
        return {
          sourceId,
          sourceTitle: bucket.sources[sourceId]?.title ?? "Untitled kit",
          attempts: entry.attempts.length,
          accuracy: entry.attempts.length > 0 ? Math.round((correctCount / entry.attempts.length) * 100) : 0,
          mastery: entry.mastery,
          masteryDelta: entry.masteryDelta,
          weakPressure: entry.weakPressure,
          sessionCount: entry.sessionIds.size,
          lastStudiedAt: entry.lastStudiedAt,
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
    const recommendations = Object.keys(bucket.sources).length === 0
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
            sourceId: weakestKit.sourceId,
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
        sources: Object.keys(bucket.sources).length,
        questions: Object.values(bucket.questions).filter((question) => question.status === "active").length,
        sessions: Object.keys(bucket.sessions).length,
        attempts: attempts.length,
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
