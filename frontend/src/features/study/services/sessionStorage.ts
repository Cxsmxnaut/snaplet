import { SessionResult } from '../../../types';

const SESSION_RESULT_PREFIX = 'snaplet_session_result_v1';

type SerializedSessionResult = Omit<SessionResult, 'date'> & {
  date: string;
};

function sessionResultKey(sessionId: string): string {
  return `${SESSION_RESULT_PREFIX}:${sessionId}`;
}

export function loadPersistedSessionResult(sessionId: string): SessionResult | null {
  const raw = window.localStorage.getItem(sessionResultKey(sessionId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SerializedSessionResult;
    return {
      ...parsed,
      date: new Date(parsed.date),
    };
  } catch {
    return null;
  }
}

export function savePersistedSessionResult(result: SessionResult): void {
  const serialized: SerializedSessionResult = {
    ...result,
    date: result.date.toISOString(),
  };

  window.localStorage.setItem(sessionResultKey(result.id), JSON.stringify(serialized));
}
