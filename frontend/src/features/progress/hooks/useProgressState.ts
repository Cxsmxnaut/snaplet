import { useState } from 'react';
import { getProgress } from '../../../lib/api';
import { ProgressData } from '../../../types';

export function useProgressState() {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  const refreshProgress = async () => {
    try {
      const backendProgress = await getProgress();
      setProgress(backendProgress);
    } catch {
      // Keep existing UI responsive even if progress read fails.
    }
  };

  return {
    progress,
    setProgress,
    refreshProgress,
  };
}
