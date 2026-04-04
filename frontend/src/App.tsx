import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { CreateKit } from './pages/CreateKit';
import { Processing } from './pages/Processing';
import { ReviewKit } from './pages/ReviewKit';
import { StudySession } from './pages/StudySession';
import { StudyModeSelection } from './pages/StudyModeSelection';
import { SessionComplete } from './pages/SessionComplete';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { KitsPage } from './pages/KitsPage';
import { HelpPage } from './pages/HelpPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Session } from '@supabase/supabase-js';
import { Kit, ProgressData, Question, SessionResult } from './types';
import {
  BackendQuestion,
  BackendSource,
  StudyMode,
  createSourceFromText,
  deleteQuestion,
  deleteSource,
  getProgress,
  listSourceQuestions,
  listSources,
  uploadSourceFile,
  updateQuestion,
} from './lib/api';
import { logDebug, logError } from './lib/debug';
import { supabase } from './lib/supabase';

const MASTERY_KEY = 'nimble_kit_mastery_map';
const LAST_SESSION_KEY = 'nimble_kit_last_session_map';
const USER_CACHE_PREFIX = 'nimble_user_cache_v1';
const SESSION_RESULT_PREFIX = 'nimble_session_result_v1';

const APP_TAB_PATHS: Record<string, string> = {
  dashboard: '/app/dashboard',
  kits: '/app/kits',
  progress: '/app/progress',
  help: '/app/help',
  settings: '/app/settings',
  create: '/app/create',
  processing: '/app/create/processing',
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

type SerializedKit = Omit<Kit, 'lastSession'> & {
  lastSession?: string;
};

type UserCachePayload = {
  kits: SerializedKit[];
  progress: ProgressData | null;
  currentKitId: string | null;
  updatedAt: string;
};

type SerializedSessionResult = Omit<SessionResult, 'date'> & {
  date: string;
};

function userCacheKey(userId: string): string {
  return `${USER_CACHE_PREFIX}:${userId}`;
}

function sessionResultKey(sessionId: string): string {
  return `${SESSION_RESULT_PREFIX}:${sessionId}`;
}

function serializeKits(kits: Kit[]): SerializedKit[] {
  return kits.map((kit) => ({
    ...kit,
    lastSession: kit.lastSession ? kit.lastSession.toISOString() : undefined,
  }));
}

function deserializeKits(kits: SerializedKit[]): Kit[] {
  return kits.map((kit) => ({
    ...kit,
    lastSession: kit.lastSession ? new Date(kit.lastSession) : undefined,
  }));
}

function deserializeSessionResult(result: SerializedSessionResult): SessionResult {
  return {
    ...result,
    date: new Date(result.date),
  };
}

function loadUserCache(userId: string): UserCachePayload | null {
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

function saveUserCache(userId: string, payload: UserCachePayload): void {
  window.localStorage.setItem(userCacheKey(userId), JSON.stringify(payload));
}

function guessIcon(source: BackendSource, idx: number): string {
  const text = `${source.title} ${source.content}`.toLowerCase();
  if (text.includes('spanish') || text.includes('vocab') || text.includes('language')) return 'translate';
  if (text.includes('chem') || text.includes('biology') || text.includes('physics')) return 'science';
  return idx % 2 === 0 ? 'auto_awesome' : 'book';
}

function guessColor(idx: number): string {
  const colors = [
    'bg-orange-500/20 text-orange-400',
    'bg-indigo-500/20 text-indigo-400',
    'bg-primary/20 text-primary',
    'bg-secondary/20 text-secondary',
  ];
  return colors[idx % colors.length];
}

function mapQuestions(questions: BackendQuestion[]): Question[] {
  return questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    answer: q.answer,
    category: 'General',
  }));
}

function mapSourceToKit(
  source: BackendSource,
  questions: BackendQuestion[],
  idx: number,
  masteryMap: Record<string, number>,
  lastSessionMap: Record<string, number>,
): Kit {
  return {
    id: source.id,
    title: source.title,
    description: `Type: ${source.kind.toUpperCase()} • ${source.questionGenerationStatus}`,
    questions: mapQuestions(questions),
    mastery: masteryMap[source.id] ?? 0,
    lastSession: lastSessionMap[source.id] ? new Date(lastSessionMap[source.id]) : undefined,
    cardCount: source.questionCount,
    icon: guessIcon(source, idx),
    color: guessColor(idx),
  };
}

function deriveRoute(pathname: string): {
  view: 'landing' | 'auth' | 'app';
  tab: string;
  kitId: string | null;
  sessionId: string | null;
} {
  if (pathname === '/' || pathname === '') {
    return { view: 'landing', tab: 'dashboard', kitId: null, sessionId: null };
  }
  if (pathname === '/auth') {
    return { view: 'auth', tab: 'dashboard', kitId: null, sessionId: null };
  }
  if (pathname.startsWith('/legal/')) {
    return { view: 'landing', tab: 'dashboard', kitId: null, sessionId: null };
  }

  const reviewMatch = pathname.match(/^\/app\/kits\/([^/]+)\/review$/);
  if (reviewMatch) {
    return { view: 'app', tab: 'review', kitId: reviewMatch[1], sessionId: null };
  }

  const modeMatch = pathname.match(/^\/app\/kits\/([^/]+)\/study-mode$/);
  if (modeMatch) {
    return { view: 'app', tab: 'study-mode', kitId: modeMatch[1], sessionId: null };
  }

  const studyMatch = pathname.match(/^\/app\/kits\/([^/]+)\/study$/);
  if (studyMatch) {
    return { view: 'app', tab: 'study', kitId: studyMatch[1], sessionId: null };
  }

  const completeMatch = pathname.match(/^\/app\/session\/([^/]+)\/complete$/);
  if (completeMatch) {
    return { view: 'app', tab: 'complete', kitId: null, sessionId: completeMatch[1] };
  }

  const staticTab = Object.entries(APP_TAB_PATHS).find(([, value]) => value === pathname)?.[0] ?? null;
  if (staticTab) {
    return { view: 'app', tab: staticTab, kitId: null, sessionId: null };
  }

  return { view: 'landing', tab: 'dashboard', kitId: null, sessionId: null };
}

function buildAppPath(tab: string, kitId: string | null, sessionId: string | null, mode: StudyMode): string {
  if (tab === 'review' && kitId) {
    return `/app/kits/${kitId}/review`;
  }
  if (tab === 'study-mode' && kitId) {
    return `/app/kits/${kitId}/study-mode`;
  }
  if (tab === 'study' && kitId) {
    return `/app/kits/${kitId}/study?mode=${mode}`;
  }
  if (tab === 'complete' && sessionId) {
    return `/app/session/${sessionId}/complete`;
  }
  return APP_TAB_PATHS[tab] ?? '/app/dashboard';
}

function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-3xl mx-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8">
        <h1 className="text-3xl font-headline font-black text-on-surface mb-4">{title}</h1>
        <p className="text-on-surface-variant leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = useMemo(() => deriveRoute(location.pathname), [location.pathname]);
  const routeMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('mode');
    if (raw === 'focus' || raw === 'weak_review' || raw === 'fast_drill' || raw === 'standard') {
      return raw;
    }
    return null;
  }, [location.search]);

  const [view, setView] = useState<'landing' | 'auth' | 'app'>(route.view);
  const [authReady, setAuthReady] = useState(false);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState(route.tab);
  const [kits, setKits] = useState<Kit[]>([]);
  const [currentKitId, setCurrentKitId] = useState<string | null>(route.kitId);
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>(routeMode ?? 'standard');
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const userProfile = useMemo(() => {
    const user = authSession?.user;
    if (!user) {
      return {
        displayName: 'Learner',
        email: '',
        avatarUrl: null as string | null,
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

  useEffect(() => {
    logDebug('app', 'Mounted App');
  }, []);

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

  useEffect(() => {
    setView(route.view);
    setActiveTab(route.tab);
    if (route.kitId) {
      setCurrentKitId(route.kitId);
    }
    if (routeMode) {
      setSelectedStudyMode(routeMode);
    }
  }, [route.view, route.tab, route.kitId, routeMode]);

  useEffect(() => {
    logDebug('app', 'View changed', { view, activeTab });
  }, [view, activeTab]);

  useEffect(() => {
    logDebug('app', 'Kits/progress state updated', {
      kits: kits.length,
      hasProgress: Boolean(progress),
      currentKitId,
      hasError: Boolean(error),
    });
  }, [kits.length, progress, currentKitId, error]);

  const currentKit = useMemo(() => kits.find((kit) => kit.id === currentKitId) ?? null, [kits, currentKitId]);

  const filteredKits = useMemo(() => kits, [kits]);

  const navigateToTab = (tab: string, nextKitId: string | null = currentKitId, nextSessionId: string | null = sessionResult?.id ?? null) => {
    setActiveTab(tab);
    navigate(buildAppPath(tab, nextKitId, nextSessionId, selectedStudyMode));
  };

  const refreshProgress = async () => {
    try {
      const backendProgress = await getProgress();
      setProgress(backendProgress);
    } catch {
      // Keep existing UI responsive even if progress read fails.
    }
  };

  const refreshKits = async () => {
    const [sources, masteryMap, lastSessionMap] = await Promise.all([
      listSources(),
      Promise.resolve(loadJsonMap(MASTERY_KEY)),
      Promise.resolve(loadJsonMap(LAST_SESSION_KEY)),
    ]);

    const questionsBySource = await Promise.all(
      sources.map(async (source) => ({
        sourceId: source.id,
        questions: await listSourceQuestions(source.id),
      })),
    );

    const questionMap = new Map(questionsBySource.map((row) => [row.sourceId, row.questions]));
    const nextKits = sources.map((source, idx) => mapSourceToKit(source, questionMap.get(source.id) ?? [], idx, masteryMap, lastSessionMap));

    setKits(nextKits);
    setCurrentKitId((prev) => {
      if (route.kitId && nextKits.some((kit) => kit.id === route.kitId)) {
        return route.kitId;
      }
      return prev && nextKits.some((kit) => kit.id === prev) ? prev : nextKits[0]?.id ?? null;
    });
  };

  const enterApp = async () => {
    logDebug('app', 'Entering app mode');
    setView('app');
    setError(null);

    try {
      await Promise.all([refreshKits(), refreshProgress()]);
    } catch (err) {
      logError('app', 'Failed loading initial backend data', err);
      setError(err instanceof Error ? err.message : 'Failed to load data from backend.');
    }
  };

  useEffect(() => {
    if (!authSession?.user?.id) {
      return;
    }
    if (loadedUserId !== authSession.user.id) {
      return;
    }

    saveUserCache(authSession.user.id, {
      kits: serializeKits(kits),
      progress,
      currentKitId,
      updatedAt: new Date().toISOString(),
    });
  }, [authSession?.user?.id, loadedUserId, kits, progress, currentKitId]);

  useEffect(() => {
    if (!route.sessionId) {
      return;
    }

    const raw = window.localStorage.getItem(sessionResultKey(route.sessionId));
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SerializedSessionResult;
      setSessionResult(deserializeSessionResult(parsed));
    } catch {
      // ignore invalid persisted session payload
    }
  }, [route.sessionId]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!authSession) {
      setLoadedUserId(null);
      if (route.view === 'app') {
        navigate('/auth', { replace: true });
      }
      return;
    }

    if (loadedUserId === authSession.user.id) {
      if (route.view !== 'app') {
        navigate('/app/dashboard', { replace: true });
      }
      return;
    }

    const cache = loadUserCache(authSession.user.id);
    if (cache) {
      logDebug('app', 'Hydrating UI from user cache', {
        userId: authSession.user.id,
        kitCount: cache.kits.length,
        hasProgress: Boolean(cache.progress),
        updatedAt: cache.updatedAt,
      });
      const cachedKits = deserializeKits(cache.kits);
      setKits(cachedKits);
      setProgress(cache.progress);
      setCurrentKitId(cache.currentKitId ?? cachedKits[0]?.id ?? null);
    }

    setLoadedUserId(authSession.user.id);
    void enterApp();
  }, [authReady, authSession, loadedUserId, navigate, route.view]);

  const handleLogout = async () => {
    logDebug('auth', 'Signing out');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      logError('auth', 'Sign out failed', signOutError);
      setError(signOutError.message);
      return;
    }

    setView('landing');
    setAuthSession(null);
    setActiveTab('dashboard');
    navigate('/', { replace: true });
  };

  const handleGenerateKit = async (title: string, content: string) => {
    logDebug('app', 'Generating kit from text', {
      titleLength: title.length,
      contentLength: content.length,
    });
    setIsProcessing(true);
    navigateToTab('processing');
    setError(null);

    try {
      const source = await createSourceFromText(title, content);
      await refreshKits();
      await refreshProgress();
      setCurrentKitId(source.id);
      navigateToTab('review', source.id);
    } catch (err) {
      logError('app', 'Failed creating kit', err);
      setError(err instanceof Error ? err.message : 'Failed to create kit.');
      navigateToTab('create');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadKitFile = async (file: File) => {
    logDebug('app', 'Uploading source file', { fileName: file.name, size: file.size });
    setIsProcessing(true);
    navigateToTab('processing');
    setError(null);
    try {
      const source = await uploadSourceFile(file);
      await refreshKits();
      await refreshProgress();
      setCurrentKitId(source.id);
      navigateToTab('review', source.id);
    } catch (err) {
      logError('app', 'Failed uploading source file', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file.');
      navigateToTab('create');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteKit = async (kitId: string) => {
    logDebug('app', 'Deleting kit', { kitId });
    try {
      await deleteSource(kitId);
      await refreshKits();
      await refreshProgress();
      navigateToTab('dashboard');
    } catch (err) {
      logError('app', 'Failed deleting kit', err);
      setError(err instanceof Error ? err.message : 'Failed to delete kit.');
    }
  };

  const handleEditQuestion = async (kitId: string, questionId: string, question: string, answer: string) => {
    await updateQuestion(questionId, question, answer);

    setKits((prev) =>
      prev.map((kit) => {
        if (kit.id !== kitId) {
          return kit;
        }

        return {
          ...kit,
          questions: kit.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  question,
                  answer,
                }
              : q,
          ),
        };
      }),
    );
  };

  const handleDeleteQuestion = async (kitId: string, questionId: string) => {
    await deleteQuestion(questionId);

    setKits((prev) =>
      prev.map((kit) => {
        if (kit.id !== kitId) {
          return kit;
        }

        const nextQuestions = kit.questions.filter((q) => q.id !== questionId);
        return {
          ...kit,
          questions: nextQuestions,
          cardCount: nextQuestions.length,
        };
      }),
    );
    await refreshProgress();
  };

  const handleStudyKit = (kitId: string) => {
    logDebug('app', 'Opening study mode picker', { kitId });
    setCurrentKitId(kitId);
    navigateToTab('study-mode', kitId);
  };

  const handleStartStudyMode = (mode: StudyMode) => {
    setSelectedStudyMode(mode);
    navigate(buildAppPath('study', currentKitId, null, mode));
  };

  const handleRetryWeakItems = () => {
    setSelectedStudyMode('weak_review');
    navigate(buildAppPath('study', currentKitId, null, 'weak_review'));
  };

  const handleCompleteSession = (results: { correct: number; incorrect: number; weak: SessionResult['weakQuestions'] }) => {
    logDebug('app', 'Session completed', results);
    const attempts = results.correct + results.incorrect;
    const accuracy = attempts > 0 ? Math.round((results.correct / attempts) * 100) : 0;

    const result: SessionResult = {
      id: Math.random().toString(36).slice(2, 10),
      kitId: currentKit?.id || '',
      date: new Date(),
      accuracy,
      correctCount: results.correct,
      incorrectCount: results.incorrect,
      duration: 'Adaptive Session',
      weakQuestions: results.weak,
    };

    if (currentKit) {
      const masteryMap = loadJsonMap(MASTERY_KEY);
      masteryMap[currentKit.id] = Math.max(masteryMap[currentKit.id] ?? 0, accuracy);
      saveJsonMap(MASTERY_KEY, masteryMap);

      const lastSessionMap = loadJsonMap(LAST_SESSION_KEY);
      lastSessionMap[currentKit.id] = Date.now();
      saveJsonMap(LAST_SESSION_KEY, lastSessionMap);

      setKits((prev) =>
        prev.map((kit) =>
          kit.id === currentKit.id
            ? {
                ...kit,
                mastery: masteryMap[currentKit.id],
                lastSession: new Date(lastSessionMap[currentKit.id]),
              }
            : kit,
        ),
      );
    }

    const serializable: SerializedSessionResult = {
      ...result,
      date: result.date.toISOString(),
    };

    window.localStorage.setItem(sessionResultKey(result.id), JSON.stringify(serializable));
    setSessionResult(result);
    navigate(buildAppPath('complete', null, result.id, selectedStudyMode));
    void refreshProgress();
  };

  const renderMissingState = (title: string, message: string) => (
    <div className="max-w-2xl mx-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 text-center space-y-4">
      <h2 className="text-2xl font-headline font-black text-on-surface">{title}</h2>
      <p className="text-on-surface-variant">{message}</p>
      <button
        className="px-6 py-3 rounded-full bg-primary text-on-primary font-bold"
        onClick={() => navigate('/app/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Checking session...</div>;
  }

  if (location.pathname === '/legal/privacy') {
    return <LegalPage title="Privacy" body="Nimble stores your study data to run kit generation, adaptive review, and account features." />;
  }
  if (location.pathname === '/legal/terms') {
    return <LegalPage title="Terms" body="Use Nimble responsibly. You are responsible for uploaded content and account access security." />;
  }
  if (location.pathname === '/legal/methodology') {
    return <LegalPage title="Methodology" body="Nimble combines active recall, spaced repetition, and adaptive question sequencing based on your outcomes." />;
  }
  if (location.pathname === '/legal/contact') {
    return <LegalPage title="Contact" body="Support: support@nimble.app" />;
  }

  if (!authSession && view === 'landing') return <LandingPage onGetStarted={() => navigate('/auth')} />;
  if (!authSession) return <AuthPage />;

  const hideShell = activeTab === 'study' || activeTab === 'processing';

  return (
    <div className="min-h-screen bg-background">
      {!hideShell && <Sidebar activeTab={activeTab} onTabChange={(tab) => navigateToTab(tab)} />}

      <main className={!hideShell ? 'ml-64' : ''}>
        {!hideShell && (
          <TopBar
            onNavigate={(tab) => navigateToTab(tab)}
            onLogout={() => {
              void handleLogout();
            }}
            userProfile={userProfile}
          />
        )}

        <div className={!hideShell ? 'pt-22 pb-12 px-10' : ''}>
          {error ? <div className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</div> : null}

          {activeTab === 'dashboard' && (
            <Dashboard
              kits={filteredKits}
              onStudyKit={handleStudyKit}
              onCreateKit={() => navigateToTab('create')}
              onEditKit={(id) => {
                setCurrentKitId(id);
                navigateToTab('review', id);
              }}
              onViewAll={() => navigateToTab('kits')}
              onTabChange={(tab) => navigateToTab(tab)}
              progress={progress}
            />
          )}

          {activeTab === 'kits' && (
            <KitsPage
              kits={filteredKits}
              onStudyKit={handleStudyKit}
              onCreateKit={() => navigateToTab('create')}
              onEditKit={(id) => {
                setCurrentKitId(id);
                navigateToTab('review', id);
              }}
            />
          )}

          {activeTab === 'progress' && <ProgressPage progress={progress} onRefresh={() => { void refreshProgress(); }} />}
          {activeTab === 'help' && <HelpPage onCreateKit={() => navigateToTab('create')} onGoDashboard={() => navigateToTab('dashboard')} />}
          {activeTab === 'settings' && <SettingsPage onLogout={() => { void handleLogout(); }} userProfile={userProfile} />}
          {activeTab === 'create' && <CreateKit onGenerate={handleGenerateKit} onUploadFile={handleUploadKitFile} />}
          {activeTab === 'processing' && isProcessing && <Processing />}

          {activeTab === 'review' &&
            (currentKit ? (
              <ReviewKit
                kit={currentKit}
                onStart={() => handleStudyKit(currentKit.id)}
                onStartRapid={() => {
                  setSelectedStudyMode('fast_drill');
                  navigate(buildAppPath('study', currentKit.id, null, 'fast_drill'));
                }}
                onBack={() => navigateToTab('dashboard')}
                onDelete={() => {
                  void handleDeleteKit(currentKit.id);
                }}
                onUpdateQuestion={(questionId, question, answer) => {
                  return handleEditQuestion(currentKit.id, questionId, question, answer).catch((err) => {
                    setError(err instanceof Error ? err.message : 'Failed to update question.');
                    throw err;
                  });
                }}
                onDeleteQuestion={(questionId) => {
                  return handleDeleteQuestion(currentKit.id, questionId).catch((err) => {
                    setError(err instanceof Error ? err.message : 'Failed to delete question.');
                    throw err;
                  });
                }}
              />
            ) : (
              renderMissingState('Kit Not Found', 'This kit is unavailable. Select another kit to continue.')
            ))}

          {activeTab === 'study-mode' &&
            (currentKit ? (
              <StudyModeSelection
                kit={currentKit}
                progress={progress}
                onStart={handleStartStudyMode}
                onBack={() => navigateToTab('dashboard')}
              />
            ) : (
              renderMissingState('No Kit Selected', 'Pick a kit first, then choose your study mode.')
            ))}

          {activeTab === 'study' &&
            (currentKit ? (
              <StudySession
                kit={currentKit}
                mode={selectedStudyMode}
                onComplete={handleCompleteSession}
                onQuit={() => navigateToTab('dashboard')}
              />
            ) : (
              renderMissingState('Session Not Ready', 'We could not restore this study session. Start from your kit list.')
            ))}

          {activeTab === 'complete' &&
            (sessionResult ? (
              <SessionComplete
                result={sessionResult}
                onBack={() => navigateToTab('dashboard')}
                onRetry={handleRetryWeakItems}
                onNew={() => navigateToTab('create')}
              />
            ) : (
              renderMissingState('Session Summary Missing', 'This completion page expired. Start a fresh session from your dashboard.')
            ))}
        </div>
      </main>
    </div>
  );
}
