import { useEffect, useState } from 'react';
import { getSessionDetails, StudyMode } from '../../../lib/api';
import { Kit, SessionResult } from '../../../types';

type CompleteSessionOptions = {
  currentKit: Kit | null;
  onNavigateToComplete: (sessionId: string) => void;
  onRefreshProgress: () => Promise<void> | void;
};

export function useStudyFlow(routeMode: StudyMode | null, routeSessionId: string | null) {
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>(routeMode ?? 'standard');
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [sessionResultLoading, setSessionResultLoading] = useState(false);

  useEffect(() => {
    if (routeMode) {
      setSelectedStudyMode(routeMode);
    }
  }, [routeMode]);

  useEffect(() => {
    if (!routeSessionId) {
      return;
    }

    let cancelled = false;
    setSessionResult((current) => (current?.id === routeSessionId ? current : null));
    setSessionResultLoading(true);

    const loadSessionSummary = async () => {
      try {
        const details = await getSessionDetails(routeSessionId);
        if (cancelled) {
          return;
        }

        if (!details.summary) {
          setSessionResult(null);
          return;
        }

        setSessionResult({
          id: details.summary.sessionId,
          kitId: details.summary.sourceId ?? '',
          date: new Date(details.summary.completedAt),
          accuracy: details.summary.accuracy,
          correctCount: details.summary.correctCount,
          incorrectCount: details.summary.incorrectCount,
          durationSeconds: details.summary.durationSeconds,
          weakQuestions: details.summary.weakQuestions,
        });
      } catch {
        if (!cancelled) {
          setSessionResult(null);
        }
      } finally {
        if (!cancelled) {
          setSessionResultLoading(false);
        }
      }
    };

    void loadSessionSummary();

    return () => {
      cancelled = true;
    };
  }, [routeSessionId]);

  const handleCompleteSession = (
    results: {
      sessionId: string;
      correct: number;
      incorrect: number;
      durationSeconds: number;
      weak: SessionResult['weakQuestions'];
    },
    options: CompleteSessionOptions,
  ) => {
    const attempts = results.correct + results.incorrect;
    const accuracy = attempts > 0 ? Math.round((results.correct / attempts) * 100) : 0;

    const result: SessionResult = {
      id: results.sessionId,
      kitId: options.currentKit?.id || '',
      date: new Date(),
      accuracy,
      correctCount: results.correct,
      incorrectCount: results.incorrect,
      durationSeconds: results.durationSeconds,
      weakQuestions: results.weak,
    };

    setSessionResult(result);
    options.onNavigateToComplete(result.id);
    void options.onRefreshProgress();
  };

  return {
    selectedStudyMode,
    setSelectedStudyMode,
    sessionResult,
    sessionResultLoading,
    handleCompleteSession,
  };
}
