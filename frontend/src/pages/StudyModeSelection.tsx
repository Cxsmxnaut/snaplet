import { useMemo } from "react";
import { Brain, Rabbit, ShieldAlert, Sparkles, Target } from "lucide-react";
import { Button } from "../components/Button";
import { Kit, ProgressData } from "../types";
import { BackendActiveSourceSession, StudyMode } from "../lib/api";
import { cn } from "../lib/utils";

interface StudyModeSelectionProps {
  kit: Kit;
  progress: ProgressData | null;
  onStart: (mode: StudyMode) => void;
  activeSession: BackendActiveSourceSession | null;
  activeSessionLoading: boolean;
  onResumeSession: (session: BackendActiveSourceSession) => void;
  onBack: () => void;
}

type ModeCard = {
  id: StudyMode;
  label: string;
  description: string;
  icon: typeof Brain;
};

const MODE_CARDS: ModeCard[] = [
  {
    id: "standard",
    label: "Standard Mode",
    description: "Balanced mix of new and review questions.",
    icon: Sparkles,
  },
  {
    id: "focus",
    label: "Focus Mode",
    description: "Small chunks with about 10 items at a time.",
    icon: Target,
  },
  {
    id: "weak_review",
    label: "Weak Review",
    description: "Prioritize incorrect and low-performance items.",
    icon: ShieldAlert,
  },
  {
    id: "fast_drill",
    label: "Fast Drill",
    description: "Rapid-fire flow with minimal feedback delay.",
    icon: Rabbit,
  },
];

function getModeSuggestion(progress: ProgressData | null): {
  recommendedMode: StudyMode;
  reason: string;
  strategy: string;
} {
  if (!progress) {
    return {
      recommendedMode: "standard",
      reason: "You do not have enough session history yet.",
      strategy: "Start in Standard Mode, then switch after a short run if pace feels too slow or too fast.",
    };
  }

  const totalAttempts = Object.values(progress.outcomes).reduce((sum, value) => sum + value, 0);
  if (totalAttempts === 0) {
    return {
      recommendedMode: "focus",
      reason: "You are just getting started and have no attempts logged yet.",
      strategy: "Use Focus Mode for a short confidence-building block before moving to Standard Mode.",
    };
  }

  const strongOutcomes = progress.outcomes.exact + progress.outcomes.accent_near + progress.outcomes.correct_after_retry;
  const accuracy = strongOutcomes / totalAttempts;
  const weakCount = progress.weakQuestions.length;

  if (weakCount >= 3 || accuracy < 0.65) {
    return {
      recommendedMode: "weak_review",
      reason: "Your recent history shows repeated misses on similar prompts.",
      strategy: "Run Weak Review first to close gaps, then finish with a short Focus Mode set.",
    };
  }

  if (accuracy > 0.85 && weakCount === 0) {
    return {
      recommendedMode: "fast_drill",
      reason: "Your recent outcomes are strong with low error carryover.",
      strategy: "Use Fast Drill to increase speed, then switch back to Standard to keep coverage balanced.",
    };
  }

  return {
    recommendedMode: "focus",
    reason: "Your performance is mixed and would benefit from shorter cycles.",
    strategy: "Use Focus Mode to stabilize accuracy, then graduate to Standard for broader coverage.",
  };
}

export const StudyModeSelection = ({
  kit,
  progress,
  onStart,
  activeSession,
  activeSessionLoading,
  onResumeSession,
  onBack,
}: StudyModeSelectionProps) => {
  const assistant = useMemo(() => getModeSuggestion(progress), [progress]);
  const recommendedModeCard = MODE_CARDS.find((mode) => mode.id === assistant.recommendedMode) ?? MODE_CARDS[0];
  const secondaryModes = MODE_CARDS.filter((mode) => mode.id !== assistant.recommendedMode);
  const RecommendedIcon = recommendedModeCard.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary">Start Session</p>
        <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
          Start studying <span className="text-primary">{kit.title}</span>
        </h1>
        <p className="text-on-surface-variant font-medium">
          We picked the best next mode for you. You can still switch if you want a different pace.
        </p>
      </header>

      {activeSession ? (
        <section className="rounded-2xl p-5 border border-primary/20 bg-primary/8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-black text-primary mb-2">Resume available</p>
            <h2 className="text-xl font-headline font-black text-on-surface">You already have an active session for this kit.</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              {activeSession.answeredCount} answered of {activeSession.questionCap}
              {activeSession.currentPosition ? ` • next question ${activeSession.currentPosition}` : ''}
              {activeSession.pendingRetry ? ' • retry waiting' : ''} • mode {MODE_CARDS.find((mode) => mode.id === activeSession.mode)?.label ?? activeSession.mode}
            </p>
            <p className="text-xs text-on-surface-variant mt-2">
              Resume this run to continue the same server-backed session. Use the mode cards below only if you want to start a fresh one.
            </p>
          </div>
          <Button className="shrink-0" onClick={() => onResumeSession(activeSession)}>
            Resume Current Session
          </Button>
        </section>
      ) : activeSessionLoading ? (
        <section className="rounded-2xl p-5 border border-outline-variant/20 bg-surface-container-low text-sm text-on-surface-variant">
          Checking for an in-progress session...
        </section>
      ) : null}

      <section className="rounded-[28px] border border-primary/20 bg-primary/8 p-6 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-black text-primary">
              <Brain className="w-3.5 h-3.5" />
              Recommended mode
            </div>
            <div className="mt-4 flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <RecommendedIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-headline font-black text-on-surface">{recommendedModeCard.label}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">{recommendedModeCard.description}</p>
                <p className="mt-4 text-sm text-on-surface">{assistant.reason}</p>
                <p className="mt-2 text-sm text-on-surface-variant">{assistant.strategy}</p>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <Button onClick={() => onStart(recommendedModeCard.id)} disabled={activeSessionLoading} className="min-w-[190px]">
              {activeSessionLoading ? 'Checking session...' : 'Study now'}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-headline font-bold text-on-surface">Other ways to study</h2>
          <p className="text-sm text-on-surface-variant mt-1">Choose one of these if you want a different pace than the recommendation.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {secondaryModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => onStart(mode.id)}
                disabled={activeSessionLoading}
                className={cn(
                  "text-left rounded-2xl p-5 border transition-all duration-200 bg-surface-container-low hover:bg-surface-container-high border-outline-variant/20 disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-headline font-bold text-on-surface">{mode.label}</h3>
                <p className="text-sm text-on-surface-variant mt-2">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl p-5 border border-outline-variant/20 bg-surface-container-low">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-on-surface">How we picked this</p>
            <p className="text-sm text-on-surface-variant">The recommendation uses your recent outcomes and weak-question history.</p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
