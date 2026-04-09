import { useEffect, useMemo, useState } from 'react';
import { listSourceQuestions, listSources } from '../../../lib/api';
import { Kit } from '../../../types';
import { mapSourceToKit } from '../services/kitMapper';
import { loadLastSessionMap, loadMasteryMap } from '../services/kitStorage';

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

  useEffect(() => {
    if (routeKitId) {
      setCurrentKitId(routeKitId);
    }
  }, [routeKitId]);

  const currentKit = useMemo(() => kits.find((kit) => kit.id === currentKitId) ?? null, [kits, currentKitId]);

  const refreshKits = async (preferredKitId: string | null = null) => {
    const [sources, masteryMap, lastSessionMap] = await Promise.all([
      listSources(),
      Promise.resolve(loadMasteryMap()),
      Promise.resolve(loadLastSessionMap()),
    ]);

    const questionsBySource = await Promise.all(
      sources.map(async (source) => ({
        sourceId: source.id,
        questions: await listSourceQuestions(source.id),
      })),
    );

    const questionMap = new Map(questionsBySource.map((row) => [row.sourceId, row.questions]));
    const nextKits = sources.map((source, idx) => mapSourceToKit(source, questionMap.get(source.id) ?? [], idx, masteryMap, lastSessionMap));

    setKits(nextKits);
    setCurrentKitId((prev) => resolveCurrentKitId(nextKits, preferredKitId, routeKitId, prev));
  };

  const hydrateKits = (nextKits: Kit[], preferredKitId: string | null) => {
    setKits(nextKits);
    setCurrentKitId((prev) => resolveCurrentKitId(nextKits, preferredKitId, routeKitId, prev));
  };

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

  const updateKitStudyStats = (kitId: string, mastery: number, lastSession: Date) => {
    setKits((prev) =>
      prev.map((kit) =>
        kit.id === kitId
          ? {
              ...kit,
              mastery,
              lastSession,
            }
          : kit,
      ),
    );
  };

  return {
    kits,
    setKits,
    currentKit,
    currentKitId,
    setCurrentKitId,
    refreshKits,
    hydrateKits,
    updateQuestionInKit,
    removeQuestionFromKit,
    updateKitStudyStats,
  };
}
