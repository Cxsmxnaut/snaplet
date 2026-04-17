import { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAvatarPreset, PROFILE_PREFERENCES_EVENT } from '../services/profilePreferences';
import { logDebug } from '../../../lib/debug';
import { trackProductEvent } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';

export type UserProfile = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
};

export function useAuthSession() {
  const [authReady, setAuthReady] = useState(false);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [profilePreferencesVersion, setProfilePreferencesVersion] = useState(0);
  const lastTrackedSignIn = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setAuthSession(session);
      setAuthReady(true);
      logDebug('auth', 'Initial session loaded', { hasSession: Boolean(session), userId: session?.user.id });
    };

    void loadSession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      logDebug('auth', 'Auth state changed', { event, hasSession: Boolean(session), userId: session?.user.id });
      setAuthSession(session);

      if (event === 'SIGNED_OUT') {
        lastTrackedSignIn.current = null;
        return;
      }

      if (event !== 'SIGNED_IN' || !session?.user) {
        return;
      }

      const provider =
        typeof session.user.app_metadata?.provider === 'string' && session.user.app_metadata.provider.trim().length > 0
          ? session.user.app_metadata.provider.trim()
          : 'unknown';

      // Password sign-ins are already tracked directly from the auth form.
      if (provider === 'email') {
        return;
      }

      const signInKey = `${session.user.id}:${provider}:${session.access_token ?? 'no-token'}`;
      if (lastTrackedSignIn.current === signInKey) {
        return;
      }

      lastTrackedSignIn.current = signInKey;
      void trackProductEvent('auth_signed_in', {
        properties: {
          method: provider,
        },
      });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handlePreferencesChanged = () => setProfilePreferencesVersion((current) => current + 1);
    window.addEventListener(PROFILE_PREFERENCES_EVENT, handlePreferencesChanged);
    return () => window.removeEventListener(PROFILE_PREFERENCES_EVENT, handlePreferencesChanged);
  }, []);

  const userProfile = useMemo<UserProfile>(() => {
    const user = authSession?.user;
    const avatarPreset = loadAvatarPreset();
    if (!user) {
      return {
        displayName: 'Learner',
        email: '',
        avatarUrl: null,
        avatarPreset,
      };
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayNameCandidates = [
      metadata.full_name,
      metadata.name,
      metadata.user_name,
      metadata.preferred_username,
      user.email?.split('@')[0],
    ];
    const avatarCandidates = [metadata.avatar_url, metadata.picture];

    const displayName =
      displayNameCandidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ??
      'Learner';
    const avatarUrl =
      avatarCandidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null;

    return {
      displayName,
      email: user.email ?? '',
      avatarUrl,
      avatarPreset,
    };
  }, [authSession, profilePreferencesVersion]);

  return {
    authReady,
    authSession,
    userProfile,
  };
}
