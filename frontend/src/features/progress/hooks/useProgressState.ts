import { useState } from 'react';
import { getProgress, trackProductEvent } from '../../../lib/api';
import { ProgressData } from '../../../types';

export function useProgressState() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const refreshProgress = async () => {
    setProgressLoading(true);
    setProgressError(null);
    try {
      const backendProgress = await getProgress();
      setProgress(backendProgress);
    } catch (error) {
      void trackProductEvent('progress_load_failed', {
        properties: {
          message: error instanceof Error ? error.message : 'unknown_error',
        },
      });
      setProgressError(error instanceof Error ? error.message : 'Failed to load progress.');
    } finally {
      setProgressLoading(false);
    }
  };

  return {
    progress,
    setProgress,
    progressLoading,
    progressError,
    refreshProgress,
  };
}
