import { Kit, ProgressData } from '../../../types';

const MASTERY_KEY = 'snaplet_kit_mastery_map';
const LAST_SESSION_KEY = 'snaplet_kit_last_session_map';
const USER_CACHE_PREFIX = 'snaplet_user_cache_v1';

export type SerializedKit = Omit<Kit, 'lastSession'> & {
  lastSession?: string;
};

export type UserCachePayload = {
  kits: SerializedKit[];
  progress: ProgressData | null;
  currentKitId: string | null;
  updatedAt: string;
};

function loadJsonMap(key: string): Record<string, number> {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveJsonMap(key: string, value: Record<string, number>): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function userCacheKey(userId: string): string {
  return `${USER_CACHE_PREFIX}:${userId}`;
}

export function loadMasteryMap(): Record<string, number> {
  return loadJsonMap(MASTERY_KEY);
}

export function saveMasteryMap(value: Record<string, number>): void {
  saveJsonMap(MASTERY_KEY, value);
}

export function loadLastSessionMap(): Record<string, number> {
  return loadJsonMap(LAST_SESSION_KEY);
}

export function saveLastSessionMap(value: Record<string, number>): void {
  saveJsonMap(LAST_SESSION_KEY, value);
}

export function serializeKits(kits: Kit[]): SerializedKit[] {
  return kits.map((kit) => ({
    ...kit,
    lastSession: kit.lastSession ? kit.lastSession.toISOString() : undefined,
  }));
}

export function deserializeKits(kits: SerializedKit[]): Kit[] {
  return kits.map((kit) => ({
    ...kit,
    lastSession: kit.lastSession ? new Date(kit.lastSession) : undefined,
  }));
}

export function loadUserCache(userId: string): UserCachePayload | null {
  const raw = window.localStorage.getItem(userCacheKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as UserCachePayload;
    if (!Array.isArray(parsed.kits)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveUserCache(userId: string, payload: UserCachePayload): void {
  window.localStorage.setItem(userCacheKey(userId), JSON.stringify(payload));
}
