export type ExtractionStatus = "extracting" | "ready" | "needs_attention" | "failed";

export type ExtractorMode = "direct" | "ocr_fallback" | "csv";

export type SourceKind = "paste" | "upload" | "csv";

export type AttemptOutcome =
  | "exact"
  | "accent_near"
  | "typo_near"
  | "correct_after_retry"
  | "incorrect";

export type QuestionStatus = "active" | "archived";

export type QueueItemKind = "new" | "review" | "revisit";

export interface StudySource {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: SourceKind;
  extractionStatus: ExtractionStatus;
  questionGenerationStatus: "pending" | "generating" | "ready" | "failed";
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourceFile {
  id: string;
  userId: string;
  sourceId: string;
  fileName: string;
  mimeType: string;
  size: number;
  extractorMode: ExtractorMode;
  extractionStatus: ExtractionStatus;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionRun {
  id: string;
  userId: string;
  sourceFileId: string;
  parserPath: string;
  ocrUsed: boolean;
  durationMs: number;
  qualityScore: number;
  status: ExtractionStatus;
  errorDetails?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  userId: string;
  sourceId: string;
  prompt: string;
  answer: string;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewState {
  userId: string;
  questionId: string;
  stability: number;
  difficulty: number;
  nextDueAt: string;
  lastSeenAt?: string;
  recentErrorCount: number;
  nearMissCount: number;
  retrySuccessCount: number;
  totalAttempts: number;
  correctAttempts: number;
  lastOutcome?: AttemptOutcome;
}

export interface SessionQueueItem {
  questionId: string;
  kind: QueueItemKind;
}

export interface Session {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  questionCap: number;
  timeCapSeconds: number;
  pointer: number;
  answeredCount: number;
  queue: SessionQueueItem[];
  pendingRetryQuestionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attempt {
  id: string;
  userId: string;
  sessionId: string;
  questionId: string;
  answer: string;
  canonicalAnswer: string;
  outcome: AttemptOutcome;
  isRetry: boolean;
  final: boolean;
  createdAt: string;
}

export interface CSVPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface CSVMapping {
  promptColumn: string;
  answerColumn: string;
}

export interface SessionQuestion {
  sessionId: string;
  questionId: string;
  prompt: string;
  answer: string;
  position: number;
  kind: QueueItemKind;
}

export interface UserBucket {
  sources: Record<string, StudySource>;
  sourceFiles: Record<string, SourceFile>;
  extractionRuns: Record<string, ExtractionRun>;
  questions: Record<string, Question>;
  reviewStates: Record<string, ReviewState>;
  sessions: Record<string, Session>;
  attempts: Record<string, Attempt>;
}

export interface SnapletState {
  users: Record<string, UserBucket>;
}

export interface ReviewQueueConfig {
  questionCap: number;
  maxReviewStreak: number;
  revisitCooldownRange: [number, number];
}

export interface AttemptEvaluation {
  outcome: AttemptOutcome;
  normalizedAnswer: string;
  normalizedCanonical: string;
  editDistance: number;
  similarity: number;
}
