export interface Question {
  id: string;
  question: string;
  answer: string;
  category: string;
  lastRecall?: Date;
  recallRate?: 'Low' | 'Medium' | 'High';
}

export interface Kit {
  id: string;
  title: string;
  description: string;
  kind: 'paste' | 'upload' | 'csv';
  visibility: 'private' | 'public';
  extractionStatus: 'extracting' | 'ready' | 'needs_attention' | 'failed';
  questionGenerationStatus: 'pending' | 'generating' | 'ready' | 'failed';
  questions: Question[];
  mastery: number;
  lastSession?: Date;
  cardCount: number;
  icon: string;
  color: string;
  isAutoReview: boolean;
}

export interface SessionResult {
  id: string;
  kitId: string;
  date: Date;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  durationSeconds: number;
  weakQuestions: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }[];
}

export interface ProgressData {
  totals: {
    sources: number;
    questions: number;
    sessions: number;
    attempts: number;
  };
  outcomes: {
    exact: number;
    accent_near: number;
    typo_near: number;
    correct_after_retry: number;
    incorrect: number;
  };
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
    mode: 'standard' | 'focus' | 'weak_review' | 'fast_drill';
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
    actionType: 'create_kit' | 'open_kits' | 'review_weak_kit';
    sourceId: string | null;
    mode: 'standard' | 'focus' | 'weak_review' | 'fast_drill' | null;
  };
}
