import { Kit } from '../../../types';

const USER_CACHE_PREFIX = 'snaplet_user_cache_v1';
const CREATE_DRAFT_PREFIX = 'snaplet_create_draft_v1';
const LEGACY_CREATE_DRAFT_KEY = 'snaplet_create_draft';
const LEGACY_MASTERY_KEY = 'snaplet_kit_mastery_map';
const LEGACY_LAST_SESSION_KEY = 'snaplet_kit_last_session_map';
const LEGACY_SOURCE_CACHE_KEY = 'snaplet_backend_sources_cache_v1';
const LEGACY_QUESTION_CACHE_KEY = 'snaplet_backend_questions_cache_v1';

export type SerializedKit = Omit<Kit, 'lastSession'> & {
  lastSession?: string;
};

export type UserCachePayload = {
  currentKitId: string | null;
  updatedAt: string;
};

function userCacheKey(userId: string): string {
  return `${USER_CACHE_PREFIX}:${userId}`;
}

function createDraftKey(userId: string): string {
  return `${CREATE_DRAFT_PREFIX}:${userId}`;
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
    return parsed;
  } catch {
    return null;
  }
}

export function saveUserCache(userId: string, payload: UserCachePayload): void {
  window.localStorage.setItem(userCacheKey(userId), JSON.stringify(payload));
}

export function loadCreateDraft(
  userId: string,
): { title?: string; description?: string; content?: string; visibility?: 'private' | 'public' } | null {
  const raw = window.localStorage.getItem(createDraftKey(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { title?: string; description?: string; content?: string; visibility?: 'private' | 'public' };
  } catch {
    window.localStorage.removeItem(createDraftKey(userId));
    return null;
  }
}

export function saveCreateDraft(
  userId: string,
  draft: { title: string; description: string; content: string; visibility: 'private' | 'public'; updatedAt: string },
): void {
  window.localStorage.setItem(createDraftKey(userId), JSON.stringify(draft));
}

export function purgeSensitiveLocalState(userId: string | null): void {
  if (userId) {
    window.localStorage.removeItem(userCacheKey(userId));
    window.localStorage.removeItem(createDraftKey(userId));
  }

  window.localStorage.removeItem(LEGACY_CREATE_DRAFT_KEY);
  window.localStorage.removeItem(LEGACY_MASTERY_KEY);
  window.localStorage.removeItem(LEGACY_LAST_SESSION_KEY);
  window.localStorage.removeItem(LEGACY_SOURCE_CACHE_KEY);
  window.localStorage.removeItem(LEGACY_QUESTION_CACHE_KEY);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }

    if (key.startsWith(`${USER_CACHE_PREFIX}:`) || key.startsWith(`${CREATE_DRAFT_PREFIX}:`)) {
      window.localStorage.removeItem(key);
    }
  }
}
