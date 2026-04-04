import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/Button';
import {
  Brain,
  CheckCircle2,
  ArrowRight,
  Timer,
  Flame,
  X,
  XCircle,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { Kit, SessionResult } from '../types';
import { StudyMode, startSession, submitAttempt } from '../lib/api';
import { logDebug, logError } from '../lib/debug';

interface StudySessionProps {
  kit: Kit;
  mode: StudyMode;
  onComplete: (results: { correct: number; incorrect: number; weak: SessionResult['weakQuestions'] }) => void;
  onQuit: () => void;
}

type ActiveQuestion = {
  sessionId: string;
  questionId: string;
  prompt: string;
  position: number;
  kind: 'new' | 'review' | 'revisit';
};

function isCorrectOutcome(outcome: string): boolean {
  return outcome === 'exact' || outcome === 'accent_near' || outcome === 'correct_after_retry';
}

function modeLabel(mode: StudyMode): string {
  if (mode === 'standard') return 'Standard';
  if (mode === 'focus') return 'Focus';
  if (mode === 'weak_review') return 'Weak Review';
  return 'Fast Drill';
}

export const StudySession = ({ kit, mode, onComplete, onQuit }: StudySessionProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ActiveQuestion | null>(null);
  const [queuedNextQuestion, setQueuedNextQuestion] = useState<ActiveQuestion | null>(null);
  const [sessionQuestionCap, setSessionQuestionCap] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [results, setResults] = useState<{ correct: number; incorrect: number; weak: SessionResult['weakQuestions'] }>({
    correct: 0,
    incorrect: 0,
    weak: [],
  });

  const totalQuestions = useMemo(
    () => sessionQuestionCap ?? Math.max(kit.questions.length, 10),
    [kit.questions.length, sessionQuestionCap],
  );
  const progress = currentQuestion ? ((currentQuestion.position - 1) / totalQuestions) * 100 : 0;

  useEffect(() => {
    let mounted = true;

    const begin = async () => {
      if (kit.questions.length === 0) {
        setRequestError('This kit has no questions yet. Add content or regenerate questions first.');
        setLoading(false);
        return;
      }
      logDebug('study', 'Starting backend session', { sourceId: kit.id, mode });
      setLoading(true);
      setRequestError(null);

      try {
        const started = await startSession(kit.id, mode);
        if (!mounted) {
          return;
        }

        setSessionId(started.session.id);
        setSessionQuestionCap(started.session.questionCap);
        setCurrentQuestion(started.currentQuestion);
        setQueuedNextQuestion(null);
        logDebug('study', 'Session started', {
          sessionId: started.session.id,
          hasCurrentQuestion: Boolean(started.currentQuestion),
          questionCap: started.session.questionCap,
        });
        setResults({ correct: 0, incorrect: 0, weak: [] });
      } catch (err) {
        if (!mounted) {
          return;
        }
        logError('study', 'Failed to start backend session', err);
        setRequestError(err instanceof Error ? err.message : 'Failed to start session.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void begin();

    return () => {
      mounted = false;
    };
  }, [kit.id, mode]);

  useEffect(() => {
    if (mode !== 'fast_drill' || !showFeedback || needsRetry) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowFeedback(false);
      setLastOutcome(null);
      setAnswer('');
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mode, needsRetry, showFeedback, currentQuestion?.questionId]);

  const handleSubmit = async () => {
    if (!answer.trim() || !sessionId || !currentQuestion || submitting) {
      return;
    }

    setSubmitting(true);
    setRequestError(null);
    logDebug('study', 'Submitting attempt', {
      sessionId,
      questionId: currentQuestion.questionId,
      isRetry: needsRetry,
      answerLength: answer.length,
    });

    try {
      const result = await submitAttempt(sessionId, {
        questionId: currentQuestion.questionId,
        answer,
        isRetry: needsRetry,
      });

      setShowFeedback(true);
      setFeedbackMessage(result.feedback);
      setCorrectAnswer(result.correctAnswer);
      setLastOutcome(result.outcome);
      logDebug('study', 'Attempt result', result);

      if (result.needsRetry) {
        setNeedsRetry(true);
        return;
      }

      const correct = isCorrectOutcome(result.outcome);
      const nextResults = {
        correct: results.correct + (correct ? 1 : 0),
        incorrect: results.incorrect + (correct ? 0 : 1),
        weak: correct
          ? results.weak
          : [
              ...results.weak,
              {
                question: currentQuestion.prompt,
                userAnswer: answer,
                correctAnswer: result.correctAnswer,
              },
            ],
      };
      setResults(nextResults);

      if (result.sessionEnded || !result.nextQuestion) {
        onComplete(nextResults);
        return;
      }

      setNeedsRetry(false);
      setQueuedNextQuestion(result.nextQuestion);
    } catch (err) {
      logError('study', 'Failed to submit attempt', err);
      setRequestError(err instanceof Error ? err.message : 'Failed to submit answer.');
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (needsRetry) {
      setShowFeedback(false);
      setAnswer('');
      return;
    }

    if (queuedNextQuestion) {
      setCurrentQuestion(queuedNextQuestion);
      setQueuedNextQuestion(null);
    }
    setShowFeedback(false);
    setLastOutcome(null);
    setAnswer('');
  };

  const isIncorrectFeedback = lastOutcome === 'incorrect' && !needsRetry;
  const isRetryFeedback = needsRetry;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-16">
          <div className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="text-primary w-10 h-10" />
          </div>
          <div className="absolute -inset-4 border border-primary/20 rounded-full animate-pulse"></div>
        </div>

        <div className="space-y-3 max-w-lg">
          <h1 className="text-4xl font-black font-headline tracking-tight text-on-surface">Preparing your session...</h1>
          <p className="text-on-surface-variant font-medium text-lg opacity-80">Building an adaptive review queue from your weak items...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 w-full max-w-2xl text-left">
          <div className="bg-surface-container-low p-6 rounded-2xl deep-bloom border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="text-secondary w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">Phase 1 Complete</span>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed">Reading your kit and recent performance signals.</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl deep-bloom border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="text-primary w-5 h-5 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Phase 2 Active</span>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed">Ordering questions for focused recall and spaced revisit.</p>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-2 mt-12">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
            <span>Session Warmup</span>
            <span>Preparing</span>
          </div>
          <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: ['15%', '75%', '25%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_12px_rgba(78,222,163,0.3)]"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-on-surface-variant">
          {requestError ?? 'No question available for this session.'}
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={onQuit}>Back to Review</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-32 pb-24 px-6 relative">
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex flex-col gap-4 bg-background/80 backdrop-blur-md">
        <nav className="flex justify-between items-center max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-primary tracking-tighter font-headline">Nimble</span>
            <span className="h-4 w-[1px] bg-outline-variant/30"></span>
            <span className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">{kit.title}</span>
          </div>
          <button onClick={onQuit} className="group flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-error/20 hover:text-error transition-all duration-300">
            <X className="w-4 h-4" />
            <span className="text-sm font-semibold">Quit Session</span>
          </button>
        </nav>
        <div className="max-w-4xl mx-auto w-full px-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Progress</span>
            <span className="text-xs font-medium text-on-surface-variant">Question {currentQuestion.position} of {totalQuestions}</span>
          </div>
          <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" animate={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center relative z-10">
        <div className="w-full max-w-3xl flex flex-col gap-8">
          <motion.div key={currentQuestion.questionId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-low rounded-2xl p-10 md:p-14 deep-bloom border border-outline-variant/10 flex flex-col gap-10">
            <div className="space-y-4">
              <span className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Active Recall</span>
              <h1 className="text-3xl md:text-4xl font-headline font-bold leading-tight text-on-surface tracking-tight">{currentQuestion.prompt}</h1>
            </div>
            <div className="flex flex-col gap-6">
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={showFeedback || submitting} className="w-full bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/30 border-none rounded-xl p-6 text-lg md:text-xl resize-none focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all" placeholder="Type your answer here..." rows={4} />
              {!showFeedback && <Button size="lg" className="w-full py-5" onClick={() => { void handleSubmit(); }} disabled={!answer.trim() || submitting}>{submitting ? 'Submitting...' : 'Submit Answer'} <ArrowRight className="w-5 h-5" /></Button>}
            </div>
          </motion.div>

          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={
                  isIncorrectFeedback
                    ? "bg-error/10 border border-error/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                    : isRetryFeedback
                    ? "bg-tertiary/10 border border-tertiary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                    : "bg-secondary/10 border border-secondary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                }
              >
                <div className="flex gap-4">
                  <div
                    className={
                      isIncorrectFeedback
                        ? "h-12 w-12 rounded-full bg-error flex items-center justify-center shrink-0"
                        : isRetryFeedback
                        ? "h-12 w-12 rounded-full bg-tertiary flex items-center justify-center shrink-0"
                        : "h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0"
                    }
                  >
                    {isIncorrectFeedback ? (
                      <XCircle className="text-on-error w-6 h-6" />
                    ) : (
                      <CheckCircle2 className={isRetryFeedback ? "text-on-tertiary w-6 h-6" : "text-on-secondary w-6 h-6"} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={isIncorrectFeedback ? "text-error font-bold text-lg" : isRetryFeedback ? "text-tertiary font-bold text-lg" : "text-secondary font-bold text-lg"}>
                        {isIncorrectFeedback ? "Incorrect" : isRetryFeedback ? "Retry Needed" : "Feedback"}
                      </h3>
                      <span className={isIncorrectFeedback ? "bg-error/20 text-error text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter" : isRetryFeedback ? "bg-tertiary/20 text-tertiary text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter" : "bg-secondary/20 text-secondary text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter"}>
                        Evaluation
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-md"><span className="text-on-surface font-bold block mb-1">{feedbackMessage}</span>{correctAnswer}</p>
                  </div>
                </div>
                {mode !== 'fast_drill' || needsRetry ? (
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant={needsRetry ? 'secondary' : 'outline'} className="flex-1 md:flex-none" onClick={handleContinue}>
                      {needsRetry ? <RefreshCcw className="w-4 h-4" /> : null}
                      {needsRetry ? 'Retry Now' : 'Next'}
                    </Button>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {requestError ? <p className="text-sm text-error">{requestError}</p> : null}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 px-8 py-6 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="bg-surface-container-low/80 backdrop-blur-md px-5 py-3 rounded-full flex items-center gap-3 border border-outline-variant/10 pointer-events-auto">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-container"><Timer className="text-primary w-4 h-4" /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">Mode</span>
              <span className="text-sm font-headline font-bold text-on-surface">{modeLabel(mode)}</span>
            </div>
          </div>
          <div className="bg-surface-container-low/80 backdrop-blur-md px-5 py-3 rounded-full flex items-center gap-3 border border-outline-variant/10 pointer-events-auto">
            <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">Correct</span><span className="text-sm font-headline font-bold text-secondary">{results.correct} 🔥</span></div>
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-container"><Flame className="text-secondary w-4 h-4 fill-secondary" /></div>
          </div>
        </div>
      </footer>
    </div>
  );
};
