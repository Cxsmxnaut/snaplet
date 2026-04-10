import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { Apple, Bolt, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logDebug, logError } from '../lib/debug';

export const AuthPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
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
    return `${trimmed}@snaplet.local`;
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

  const handleResetPassword = async () => {
    const email = identifier.trim();
    if (!email.includes('@')) {
      setError('Enter your email address first to reset your password.');
      setMessage(null);
      return;
    }

    setPending('magic');
    setError(null);
    setMessage(null);

    const normalizedConfiguredRedirect = configuredRedirect.replace(/\/+$/, '');
    const normalizedOrigin = window.location.origin.replace(/\/+$/, '');
    const redirectTarget = normalizedConfiguredRedirect ? `${normalizedConfiguredRedirect}/auth` : `${normalizedOrigin}/auth`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTarget,
    });

    setPending(null);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('Password reset email sent. Check your inbox for the reset link.');
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
    if (authMode === 'login') {
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
      return;
    }

    const signUpResult = await supabase.auth.signUp({
      email,
      password,
    });

    setPending(null);

    if (signUpResult.error) {
      logError('auth', 'Sign-up failed', signUpResult.error);
      setError(signUpResult.error.message);
      return;
    }

    if (signUpResult.data.session) {
      logDebug('auth', 'Sign-up succeeded with session', { email });
      return;
    }

    setMessage('Account created. Please confirm your email before signing in.');
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex w-[44%] relative items-stretch">
        <div className="absolute inset-0 bg-[#C7ADF6]" />
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface text-primary flex items-center justify-center font-black">S</div>
              <span className="text-3xl font-black font-headline text-surface">Snaplet</span>
            </div>
          </div>
          <div className="max-w-xl">
            <h2 className="text-6xl font-black font-headline leading-[0.98] tracking-tight text-on-surface mb-8">
              Study in a space built for focus.
            </h2>
            <p className="text-xl text-on-surface/75 leading-relaxed">
              Sign in to turn your notes into structured kits, run faster review sessions, and keep your progress in one place.
            </p>
          </div>
          <div className="h-[380px] relative overflow-hidden select-none pointer-events-none" aria-hidden="true">
            <div className="relative h-full w-full">
              <div className="absolute left-6 top-8 w-56 rounded-[28px] bg-surface p-5 ambient-shadow rotate-[-6deg]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary mb-3">Source</p>
                <p className="text-lg font-headline font-bold text-on-surface leading-snug">
                  Week 4 biology notes
                </p>
                <div className="mt-5 space-y-3">
                  <div className="h-3 rounded-full bg-surface-container-high w-5/6" />
                  <div className="h-3 rounded-full bg-surface-container-high w-4/6" />
                  <div className="h-3 rounded-full bg-surface-container-high w-3/4" />
                </div>
              </div>
              <div className="absolute right-6 top-16 w-64 rounded-[28px] bg-surface p-5 ambient-shadow rotate-[5deg]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary mb-3">Question</p>
                <p className="text-xl font-headline font-bold text-on-surface leading-snug">
                  What process turns light into stored chemical energy?
                </p>
                <div className="mt-6 rounded-2xl bg-secondary-container px-4 py-3">
                  <p className="text-sm font-bold text-on-secondary-container">Photosynthesis</p>
                </div>
              </div>
              <div className="absolute bottom-8 left-16 right-16 rounded-[30px] bg-surface/92 backdrop-blur-xl p-6 ambient-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-tertiary mb-2">Progress</p>
                    <p className="text-2xl font-headline font-black text-on-surface">12 questions reviewed</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="text-lg font-black text-primary">84%</span>
                  </div>
                </div>
                <div className="mt-5 h-3 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-primary to-secondary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full lg:w-[56%] flex flex-col justify-center items-center p-6 sm:p-12 lg:p-20 bg-surface">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-2 mb-12 justify-center">
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-on-primary">
              <Bolt className="w-4 h-4" />
            </div>
            <span className="font-headline font-extrabold text-xl tracking-tighter text-primary">Snaplet</span>
          </div>

          <header className="mb-10 text-center">
            <div className="inline-flex bg-surface-container-low rounded-full p-1 mb-8 relative">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setMessage(null);
                  setError(null);
                }}
                className={`relative px-6 py-2 rounded-full font-bold transition-colors ${authMode === 'signup' ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {authMode === 'signup' ? (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 rounded-full bg-surface ambient-shadow"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">Sign up</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setMessage(null);
                  setError(null);
                }}
                className={`relative px-6 py-2 rounded-full font-bold transition-colors ${authMode === 'login' ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {authMode === 'login' ? (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 rounded-full bg-surface ambient-shadow"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">Log in</span>
              </button>
            </div>
          </header>

          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => { void startOAuth('google'); }}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-3 bg-surface-container-low ghost-border py-4 rounded-full hover:bg-surface-container-high transition-all"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                <span className="font-semibold text-on-surface text-base">{pending === 'google' ? 'Redirecting...' : 'Continue with Google'}</span>
              </button>
              <button 
                onClick={() => { void startOAuth('apple'); }}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-3 bg-surface-container-low ghost-border py-4 rounded-full hover:bg-surface-container-high transition-all"
              >
                <Apple className="text-on-surface w-5 h-5 fill-on-surface" />
                <span className="font-semibold text-on-surface text-base">{pending === 'apple' ? 'Redirecting...' : 'Continue with Apple'}</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-outline-variant/40"></div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">or use email</span>
            <div className="h-px flex-1 bg-outline-variant/40"></div>
          </div>

          <form className="space-y-6" onSubmit={(e) => { void handlePasswordAuth(e); }}>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface-variant">Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                <input 
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full bg-surface-container-low border border-outline-variant/25 py-4 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/35 focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-surface transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-on-surface-variant">Password</label>
                <button type="button" onClick={() => { void handleResetPassword(); }} className="text-sm font-semibold text-primary">
                  {pending === 'magic' ? 'Sending...' : 'Forgot password'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant/25 py-4 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/35 focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-surface transition-all text-sm font-medium"
                />
              </div>
            </div>
            <Button size="lg" className="w-full py-4 rounded-full" type="submit" disabled={pending !== null}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {message ? <p className="mt-4 text-sm text-secondary">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

          <div className="mt-10 text-center">
            <p className="text-sm text-on-surface-variant/80">
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setAuthMode((current) => (current === 'login' ? 'signup' : 'login'));
                  setMessage(null);
                  setError(null);
                }}
                className="text-primary font-bold hover:underline ml-1"
              >
                {authMode === 'login' ? 'Create an account' : 'Log in instead'}
              </button>
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/45">
            <a href="/legal/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/legal/terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/legal/contact" className="hover:text-primary transition-colors">Contact Support</a>
          </div>
        </div>
      </main>
    </div>
  );
};
