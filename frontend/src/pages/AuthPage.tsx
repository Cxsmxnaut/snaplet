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
    <div className="flex min-h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-16 xl:p-24 surface-stack">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(66,85,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(78,222,163,0.12),_transparent_30%)]"></div>
        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bolt className="text-on-primary font-bold w-5 h-5" />
            </div>
            <span className="text-2xl font-black font-headline tracking-tighter text-on-surface">Snaplet AI</span>
          </div>
          <h2 className="text-5xl xl:text-7xl font-extrabold font-headline leading-[1.05] tracking-tight mb-6 text-on-surface">
            The Future of <span className="text-primary">Focused</span> Learning.
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-xl">
            Transform your study material into intelligent artifacts with research-grade clarity and calm, architectural precision.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 mb-6">Trusted by Researchers at</p>
          <div className="flex flex-wrap gap-8 text-on-surface-variant/50 font-headline font-bold">
            <span>Harvard</span>
            <span>Stanford</span>
            <span>Oxford</span>
          </div>
        </div>
      </div>

      <main className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 bg-surface-container-lowest">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-2 mb-12 justify-center">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-on-primary">
              <Bolt className="w-4 h-4" />
            </div>
            <span className="font-headline font-extrabold text-xl tracking-tighter">Snaplet AI</span>
          </div>
          <header className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tight text-on-surface mb-3">
              Welcome Back
            </h1>
            <p className="text-on-surface-variant text-base">
              Access your digital curator and resume your learning.
            </p>
          </header>

          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { void startOAuth('google'); }}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-3 bg-white ghost-border py-3 rounded-xl hover:bg-surface-container-low transition-all"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                <span className="font-semibold text-on-surface text-sm">{pending === 'google' ? 'Redirecting...' : 'Google'}</span>
              </button>
              <button 
                onClick={() => { void startOAuth('apple'); }}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-3 bg-white ghost-border py-3 rounded-xl hover:bg-surface-container-low transition-all"
              >
                <Apple className="text-on-surface w-5 h-5 fill-on-surface" />
                <span className="font-semibold text-on-surface text-sm">{pending === 'apple' ? 'Redirecting...' : 'Apple'}</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-outline-variant/40"></div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">or use email</span>
            <div className="h-px flex-1 bg-outline-variant/40"></div>
          </div>

          <form className="space-y-6" onSubmit={(e) => { void handlePasswordAuth(e); }}>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/80 mb-2 ml-1">Email or Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                <input 
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@university.edu or alex"
                  className="w-full bg-surface-container-low border border-outline-variant/30 py-3.5 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/35 focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/80 mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant/30 py-3.5 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/35 focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>
            <Button size="lg" className="w-full py-4" type="submit" disabled={pending !== null}>
              Sign In
            </Button>
          </form>

          {message ? <p className="mt-4 text-sm text-secondary">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

          <div className="mt-10 text-center">
            <p className="text-sm text-on-surface-variant/80">
              Don&apos;t have an account?
              <a href="#" className="text-primary font-bold hover:underline ml-1">Create an account</a>
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">
            <a href="/legal/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/legal/terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/legal/contact" className="hover:text-primary transition-colors">Contact Support</a>
          </div>
        </div>
      </main>
    </div>
  );
};
