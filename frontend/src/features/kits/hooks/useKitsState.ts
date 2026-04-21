import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listSourceQuestions, listSources } from '../../../lib/api';
import { Kit, ProgressData } from '../../../types';
import { mapSourceToKit } from '../services/kitMapper';

function resolveCurrentKitId(
  nextKits: Kit[],
  preferredKitId: string | null,
  routeKitId: string | null,
  previousKitId: string | null,
): string | null {
  if (preferredKitId && nextKits.some((kit) => kit.id === preferredKitId)) {
    return preferredKitId;
  }
  if (routeKitId && nextKits.some((kit) => kit.id === routeKitId)) {
    return routeKitId;
  }
  if (previousKitId && nextKits.some((kit) => kit.id === previousKitId)) {
    return previousKitId;
  }
  return nextKits[0]?.id ?? null;
}

export function useKitsState(routeKitId: string | null) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [currentKitId, setCurrentKitId] = useState<string | null>(routeKitId);
  const refreshRequestIdRef = useRef(0);

  useEffect(() => {
    if (routeKitId) {
      setCurrentKitId(routeKitId);
    }
  }, [routeKitId]);

  const currentKit = useMemo(() => kits.find((kit) => kit.id === currentKitId) ?? null, [kits, currentKitId]);

  const refreshKits = useCallback(async (preferredKitId: string | null = null, progress: ProgressData | null = null) => {
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    const sources = await listSources();

    const questionsBySource = await Promise.all(
      sources.map(async (source) => ({
        sourceId: source.id,
        questions: await listSourceQuestions(source.id),
      })),
    );

    const questionMap = new Map(questionsBySource.map((row) => [row.sourceId, row.questions]));
    const nextKits = sources.map((source, idx) => mapSourceToKit(source, questionMap.get(source.id) ?? [], idx, progress));

    if (refreshRequestIdRef.current !== requestId) {
      return;
    }

    setKits(nextKits);
    setCurrentKitId((prev) => resolveCurrentKitId(nextKits, preferredKitId, routeKitId, prev));
  }, [routeKitId]);

  const updateQuestionInKit = (kitId: string, questionId: string, question: string, answer: string) => {
    setKits((prev) =>
      prev.map((kit) => {
        if (kit.id !== kitId) {
          return kit;
        }

        return {
          ...kit,
          questions: kit.questions.map((item) =>
            item.id === questionId
              ? {
                  ...item,
                  question,
                  answer,
                }
              : item,
          ),
        };
      }),
    );
  };

  const removeQuestionFromKit = (kitId: string, questionId: string) => {
    setKits((prev) =>
      prev.map((kit) => {
        if (kit.id !== kitId) {
          return kit;
        }

        const nextQuestions = kit.questions.filter((item) => item.id !== questionId);
        return {
          ...kit,
          questions: nextQuestions,
          cardCount: nextQuestions.length,
        };
      }),
    );
  };

  const syncKitProgress = useCallback((progress: ProgressData | null) => {
    if (!progress) {
      return;
    }

    const breakdownBySourceId = new Map(progress.kitBreakdown.map((item) => [item.sourceId, item]));
    setKits((prev) =>
      prev.map((kit) => {
        const breakdown = breakdownBySourceId.get(kit.id);
        return {
          ...kit,
          mastery: breakdown?.mastery ?? 0,
          lastSession: breakdown?.lastStudiedAt ? new Date(breakdown.lastStudiedAt) : undefined,
        };
      }),
    );
  }, []);

  return {
    kits,
    setKits,
    currentKit,
    currentKitId,
    setCurrentKitId,
    refreshKits,
    updateQuestionInKit,
    removeQuestionFromKit,
    syncKitProgress,
  };
}
