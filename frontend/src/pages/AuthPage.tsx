import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { Apple, Bolt, CheckCircle, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logDebug, logError } from '../lib/debug';

export const AuthPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<null | 'google' | 'apple' | 'magic'>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configuredRedirect = (import.meta.env.VITE_SUPABASE_REDIRECT_URL ?? '').trim();

  const toSupabaseEmail = (value: string): string => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.includes('@')) {
      return trimmed;
    }

    // Username mode: map to deterministic internal email key.
    return `${trimmed}@nimble.local`;
  };

  const startOAuth = async (provider: 'google' | 'apple') => {
    setPending(provider);
    setMessage(null);
    setError(null);

    const normalizedConfiguredRedirect = configuredRedirect.replace(/\/+$/, '');
    const normalizedOrigin = window.location.origin.replace(/\/+$/, '');
    const redirectTarget = normalizedConfiguredRedirect ? `${normalizedConfiguredRedirect}/` : `${normalizedOrigin}/`;

    logDebug('auth', 'Starting OAuth flow', {
      provider,
      redirectTarget,
      configuredRedirect: normalizedConfiguredRedirect || null,
      currentOrigin: normalizedOrigin,
    });

    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTarget,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError) {
      logError('auth', `OAuth failed for ${provider}`, oauthError);
      setError(oauthError.message);
      setPending(null);
      return;
    }

    const providerUrl = oauthData?.url ?? null;
    if (!providerUrl) {
      setError('OAuth provider URL was not returned.');
      setPending(null);
      return;
    }

    const resolvedUrl = new URL(providerUrl);
    resolvedUrl.searchParams.set('redirect_to', redirectTarget);

    logDebug('auth', `OAuth redirect started for ${provider}`, {
      providerUrl,
      resolvedUrl: resolvedUrl.toString(),
    });

    window.location.assign(resolvedUrl.toString());
  };

  const handlePasswordAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Username/email and password are required.');
      return;
    }

    setPending('magic');
    setMessage(null);
    setError(null);

    const email = toSupabaseEmail(identifier);
    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInResult.error) {
      logDebug('auth', 'Signed in with password', { email });
      setPending(null);
      return;
    }

    logDebug('auth', 'Sign-in failed, trying auto-signup', {
      reason: signInResult.error.message,
      email,
    });

    const signUpResult = await supabase.auth.signUp({
      email,
      password,
    });

    setPending(null);

    if (signUpResult.error) {
      logError('auth', 'Auto-signup failed after sign-in failure', signUpResult.error);
      setError('Sign in failed. Check your password or try a different identifier.');
      return;
    }

    if (signUpResult.data.session) {
      logDebug('auth', 'Auto-signup succeeded with session', { email });
      return;
    }

    logDebug('auth', 'Auto-signup created account but needs confirmation', { email });
    setMessage('Account created. Please confirm your email before signing in.');
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Side */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center bg-surface-container-lowest">
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-tr from-surface via-transparent to-primary/10"></div>
          <img 
            src="https://picsum.photos/seed/abstract/1920/1080" 
            alt="Abstract" 
            className="w-full h-full object-cover mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 p-12 max-w-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
              <Bolt className="text-on-primary-container font-bold w-6 h-6" />
            </div>
            <span className="text-2xl font-black font-headline tracking-tighter text-primary">Kinetic Intelligence</span>
          </div>
          <h2 className="text-5xl font-extrabold font-headline leading-tight tracking-tight mb-6">
            Mastery is a <span className="text-secondary italic">rhythm</span>, not a race.
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
            Join a community of high-velocity learners leveraging biometric focus tracking and intelligent study kits to achieve flow state in half the time.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="px-4 py-2 rounded-full bg-surface-container-high/50 border border-outline-variant/10 flex items-center gap-2">
              <CheckCircle className="text-secondary w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Precision AI</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-surface-container-high/50 border border-outline-variant/10 flex items-center gap-2">
              <CheckCircle className="text-secondary w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Neural Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <main className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md relative z-10">
          <header className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tight text-on-surface mb-3">
              Welcome to Nimble
            </h1>
            <p className="text-on-surface-variant text-lg">
              Enter your flow state.
            </p>
          </header>

          <div className="space-y-4 mb-8">
            <button 
              onClick={() => { void startOAuth('google'); }}
              disabled={pending !== null}
              className="w-full flex items-center justify-center gap-4 bg-surface-container-high py-4 rounded-xl deep-bloom hover:bg-surface-bright transition-all active:scale-[0.98] group"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
              <span className="font-semibold text-on-surface">{pending === 'google' ? 'Redirecting...' : 'Continue with Google'}</span>
            </button>
            <button 
              onClick={() => { void startOAuth('apple'); }}
              disabled={pending !== null}
              className="w-full flex items-center justify-center gap-4 bg-on-background py-4 rounded-xl deep-bloom hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <Apple className="text-surface w-6 h-6 fill-surface" />
              <span className="font-semibold text-surface">{pending === 'apple' ? 'Redirecting...' : 'Continue with Apple'}</span>
            </button>
          </div>

          <div className="relative flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-outline-variant/30"></div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">or use password</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-outline-variant/30"></div>
          </div>

          <form className="space-y-6" onSubmit={(e) => { void handlePasswordAuth(e); }}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3 ml-1">Email or Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                <input 
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="alex@flowstate.com or alex"
                  className="w-full bg-surface-container-lowest border-none py-4 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/40 focus:bg-surface-container transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-surface-container-lowest border-none py-4 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/40 focus:bg-surface-container transition-all text-sm font-medium"
                />
              </div>
            </div>
            <Button size="lg" className="w-full py-5" type="submit" disabled={pending !== null}>
              Continue
              <Bolt className="w-5 h-5" />
            </Button>
          </form>

          {message ? <p className="mt-4 text-sm text-secondary">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

          <div className="mt-10 flex flex-col items-center gap-6">
            <p className="text-xs text-on-surface-variant/50 text-center max-w-[280px] leading-relaxed">
              By entering, you agree to our <a href="/legal/terms" className="underline hover:text-on-surface">Terms</a> and <a href="/legal/privacy" className="underline hover:text-on-surface">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
