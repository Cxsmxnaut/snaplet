import { useRef, useState } from 'react';
import { getProgress, trackProductEvent } from '../../../lib/api';
import { ProgressData } from '../../../types';

export function useProgressState() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const refreshRequestIdRef = useRef(0);

  const refreshProgress = async () => {
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    setProgressLoading(true);
    setProgressError(null);
    try {
      const backendProgress = await getProgress();
      if (refreshRequestIdRef.current !== requestId) {
        return;
      }
      setProgress(backendProgress);
    } catch (error) {
      if (refreshRequestIdRef.current !== requestId) {
        return;
      }
      void trackProductEvent('progress_load_failed', {
        properties: {
          message: error instanceof Error ? error.message : 'unknown_error',
        },
      });
      setProgressError(error instanceof Error ? error.message : 'Failed to load progress.');
    } finally {
      if (refreshRequestIdRef.current === requestId) {
        setProgressLoading(false);
      }
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
