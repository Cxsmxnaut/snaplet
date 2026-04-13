import { useMemo, useState } from "react";
import { Brain, ChevronDown, Rabbit, ShieldAlert, Sparkles, Target } from "lucide-react";
import { Button } from "../components/Button";
import { Kit, ProgressData } from "../types";
import { StudyMode } from "../lib/api";
import { cn } from "../lib/utils";

interface StudyModeSelectionProps {
  kit: Kit;
  progress: ProgressData | null;
  onStart: (mode: StudyMode) => void;
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

export const StudyModeSelection = ({ kit, progress, onStart, onBack }: StudyModeSelectionProps) => {
  const [showAssistant, setShowAssistant] = useState(false);
  const assistant = useMemo(() => getModeSuggestion(progress), [progress]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary">Start Session</p>
        <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
          Choose how to study <span className="text-primary">{kit.title}</span>
        </h1>
        <p className="text-on-surface-variant font-medium">
          Pick a mode in one click. Your session starts immediately.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODE_CARDS.map((mode) => {
          const Icon = mode.icon;
          const recommended = assistant.recommendedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onStart(mode.id)}
              className={cn(
                "text-left rounded-2xl p-6 border transition-all duration-200 bg-surface-container-low hover:bg-surface-container-high",
                recommended ? "border-primary/40" : "border-outline-variant/20",
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                {recommended ? (
                  <span className="text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-full bg-primary/15 text-primary">
                    Recommended
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg font-headline font-bold text-on-surface">{mode.label}</h2>
              <p className="text-sm text-on-surface-variant mt-1">{mode.description}</p>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl p-5 border border-outline-variant/20 bg-surface-container-low">
        <button
          onClick={() => setShowAssistant((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-on-surface">Need a recommendation?</p>
              <p className="text-sm text-on-surface-variant">Open Snaplet's suggested study mode</p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-on-surface-variant transition-transform", showAssistant && "rotate-180")} />
        </button>

        {showAssistant ? (
          <div className="mt-4 p-4 rounded-xl bg-surface-container-high border border-outline-variant/20 space-y-2">
            <p className="text-sm text-on-surface">
              <span className="font-black">Recommended:</span>{" "}
              {MODE_CARDS.find((mode) => mode.id === assistant.recommendedMode)?.label}
            </p>
            <p className="text-sm text-on-surface-variant">{assistant.reason}</p>
            <p className="text-sm text-on-surface-variant">{assistant.strategy}</p>
            <div className="pt-2">
              <Button onClick={() => onStart(assistant.recommendedMode)}>Start Recommended Mode</Button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
