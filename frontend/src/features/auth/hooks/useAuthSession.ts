import { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import { logDebug } from '../../../lib/debug';
import { supabase } from '../../../lib/supabase';

export type UserProfile = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

export function useAuthSession() {
  const [authReady, setAuthReady] = useState(false);
  const [authSession, setAuthSession] = useState<Session | null>(null);

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
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userProfile = useMemo<UserProfile>(() => {
    const user = authSession?.user;
    if (!user) {
      return {
        displayName: 'Learner',
        email: '',
        avatarUrl: null,
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
    };
  }, [authSession]);

  return {
    authReady,
    authSession,
    userProfile,
  };
}
