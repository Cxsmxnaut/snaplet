const AVATAR_PRESET_KEY = 'snaplet_avatar_preset_v1';
export const PROFILE_PREFERENCES_EVENT = 'snaplet:profile-preferences-changed';

export function loadAvatarPreset(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(AVATAR_PRESET_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export function saveAvatarPreset(preset: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (preset) {
    window.localStorage.setItem(AVATAR_PRESET_KEY, preset);
  } else {
    window.localStorage.removeItem(AVATAR_PRESET_KEY);
  }

  window.dispatchEvent(new CustomEvent(PROFILE_PREFERENCES_EVENT));
}
