import {
  type Attempt,
  type Question,
  type ReviewQueueConfig,
  type ReviewState,
  type SessionQueueItem,
} from "../domain/types.js";

const DEFAULT_CONFIG: ReviewQueueConfig = {
  questionCap: 10,
  maxReviewStreak: 2,
  revisitCooldownRange: [2, 3],
};

export interface QueueInputs {
  questions: Question[];
  reviewStates: Record<string, ReviewState>;
  attempts: Attempt[];
  config?: Partial<ReviewQueueConfig>;
}

interface Candidate {
  question: Question;
  score: number;
  kind: "new" | "review";
}

function scoreReviewCandidate(question: Question, reviewState: ReviewState, now: Date): number {
  const nowMs = now.getTime();
  const dueMs = new Date(reviewState.nextDueAt).getTime();
  const overdueHours = Math.max(0, (nowMs - dueMs) / 3_600_000);
  const errorWeight =
    reviewState.recentErrorCount * 1.8 +
    reviewState.nearMissCount * 0.75 +
    reviewState.retrySuccessCount * 0.5;
  const difficultyWeight = reviewState.difficulty * 2;
  const stabilityWeight = 1 / Math.max(1, reviewState.stability);
  const recencyPenalty =
    reviewState.lastSeenAt && nowMs - new Date(reviewState.lastSeenAt).getTime() < 120_000 ? 2 : 0;

  return overdueHours * 1.4 + errorWeight + difficultyWeight + stabilityWeight - recencyPenalty;
}

function rollingAccuracy(attempts: Attempt[]): number {
  const recentAttempts = attempts.slice(-30).filter((item) => item.final);
  if (recentAttempts.length === 0) {
    return 1;
  }

  const correct = recentAttempts.filter((attempt) =>
    ["exact", "accent_near", "correct_after_retry"].includes(attempt.outcome),
  ).length;

  return correct / recentAttempts.length;
}

function mixTarget(accuracy: number): { newTarget: number; reviewTarget: number } {
  if (accuracy < 0.7) {
    return { newTarget: 0.2, reviewTarget: 0.8 };
  }

  if (accuracy <= 0.85) {
    return { newTarget: 0.3, reviewTarget: 0.7 };
  }

  return { newTarget: 0.4, reviewTarget: 0.6 };
}

function withJitter(value: number): number {
  return value + (Math.random() * 0.16 - 0.08);
}

export function buildSessionQueue(inputs: QueueInputs): SessionQueueItem[] {
  const now = new Date();
  const config: ReviewQueueConfig = {
    ...DEFAULT_CONFIG,
    ...(inputs.config ?? {}),
  };

  const candidates = inputs.questions
    .map((question) => {
      const reviewState = inputs.reviewStates[question.id];
      if (!reviewState || reviewState.totalAttempts === 0) {
        return {
          question,
          score: withJitter(1),
          kind: "new" as const,
        };
      }

      return {
        question,
        score: withJitter(scoreReviewCandidate(question, reviewState, now)),
        kind: "review" as const,
      };
    })
    .sort((a, b) => b.score - a.score);

  const reviewCandidates = candidates.filter((candidate) => candidate.kind === "review");
  const newCandidates = candidates.filter((candidate) => candidate.kind === "new");

  const accuracy = rollingAccuracy(inputs.attempts);
  const target = mixTarget(accuracy);
  const targetReviewCount = Math.round(config.questionCap * target.reviewTarget);
  const targetNewCount = config.questionCap - targetReviewCount;

  const queue: SessionQueueItem[] = [];
  let reviewCursor = 0;
  let newCursor = 0;
  let reviewStreak = 0;

  while (queue.length < config.questionCap && (reviewCursor < reviewCandidates.length || newCursor < newCandidates.length)) {
    const queuedReviewCount = queue.filter((item) => item.kind !== "new").length;
    const queuedNewCount = queue.length - queuedReviewCount;
    const shouldPreferReview =
      queuedReviewCount < targetReviewCount &&
      (queuedNewCount >= targetNewCount || reviewStreak < config.maxReviewStreak);

    let chosen: Candidate | undefined;

    if (shouldPreferReview && reviewCursor < reviewCandidates.length && reviewStreak < config.maxReviewStreak) {
      chosen = reviewCandidates[reviewCursor];
      reviewCursor += 1;
    } else if (newCursor < newCandidates.length) {
      chosen = newCandidates[newCursor];
      newCursor += 1;
    } else if (reviewCursor < reviewCandidates.length) {
      chosen = reviewCandidates[reviewCursor];
      reviewCursor += 1;
    }

    if (!chosen) {
      break;
    }

    const previous = queue.at(-1);
    if (previous && previous.questionId === chosen.question.id) {
      continue;
    }

    queue.push({
      questionId: chosen.question.id,
      kind: chosen.kind,
    });

    reviewStreak = chosen.kind === "new" ? 0 : reviewStreak + 1;
  }

  return queue;
}

export function pickRevisitOffset(config?: Partial<ReviewQueueConfig>): number {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...(config ?? {}),
  };

  const [minOffset, maxOffset] = finalConfig.revisitCooldownRange;
  return Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
}
