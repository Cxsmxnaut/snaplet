import { useEffect, useState } from 'react';
import { StudyMode } from '../../../lib/api';
import { Kit, SessionResult } from '../../../types';
import { loadLastSessionMap, loadMasteryMap, saveLastSessionMap, saveMasteryMap } from '../../kits/services/kitStorage';
import { loadPersistedSessionResult, savePersistedSessionResult } from '../services/sessionStorage';

type CompleteSessionOptions = {
  currentKit: Kit | null;
  onUpdateKitStats: (kitId: string, mastery: number, lastSession: Date) => void;
  onNavigateToComplete: (sessionId: string) => void;
  onRefreshProgress: () => Promise<void> | void;
};

export function useStudyFlow(routeMode: StudyMode | null, routeSessionId: string | null) {
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>(routeMode ?? 'standard');
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    if (routeMode) {
      setSelectedStudyMode(routeMode);
    }
  }, [routeMode]);

  useEffect(() => {
    if (!routeSessionId) {
      return;
    }

    const persisted = loadPersistedSessionResult(routeSessionId);
    if (persisted) {
      setSessionResult(persisted);
    }
  }, [routeSessionId]);

  const handleCompleteSession = (
    results: { correct: number; incorrect: number; weak: SessionResult['weakQuestions'] },
    options: CompleteSessionOptions,
  ) => {
    const attempts = results.correct + results.incorrect;
    const accuracy = attempts > 0 ? Math.round((results.correct / attempts) * 100) : 0;

    const result: SessionResult = {
      id: Math.random().toString(36).slice(2, 10),
      kitId: options.currentKit?.id || '',
      date: new Date(),
      accuracy,
      correctCount: results.correct,
      incorrectCount: results.incorrect,
      duration: 'Adaptive Session',
      weakQuestions: results.weak,
    };

    if (options.currentKit) {
      const masteryMap = loadMasteryMap();
      masteryMap[options.currentKit.id] = Math.max(masteryMap[options.currentKit.id] ?? 0, accuracy);
      saveMasteryMap(masteryMap);

      const lastSessionMap = loadLastSessionMap();
      lastSessionMap[options.currentKit.id] = Date.now();
      saveLastSessionMap(lastSessionMap);

      options.onUpdateKitStats(
        options.currentKit.id,
        masteryMap[options.currentKit.id],
        new Date(lastSessionMap[options.currentKit.id]),
      );
    }

    savePersistedSessionResult(result);
    setSessionResult(result);
    options.onNavigateToComplete(result.id);
    void options.onRefreshProgress();
  };

  return {
    selectedStudyMode,
    setSelectedStudyMode,
    sessionResult,
    handleCompleteSession,
  };
}
