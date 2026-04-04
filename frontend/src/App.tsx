import { useEffect, useMemo, useState } from 'react';
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
const APP_TABS = new Set([
  'dashboard',
  'kits',
  'progress',
  'help',
  'settings',
  'create',
  'processing',
  'review',
  'study-mode',
  'study',
  'complete',
]);

function readHashRoute(): { view: 'landing' | 'auth' | 'app'; tab: string } {
  if (typeof window === 'undefined') {
    return { view: 'landing', tab: 'dashboard' };
  }

  const raw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (!raw || raw === 'landing') {
    return { view: 'landing', tab: 'dashboard' };
  }
  if (raw === 'auth') {
    return { view: 'auth', tab: 'dashboard' };
  }
  if (APP_TABS.has(raw)) {
    return { view: 'app', tab: raw };
  }
  return { view: 'landing', tab: 'dashboard' };
}

function writeHashRoute(view: 'landing' | 'auth' | 'app', activeTab: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const nextRoute = view === 'app' ? activeTab : view;
  const nextHash = `#/${nextRoute}`;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

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

function userCacheKey(userId: string): string {
  return `${USER_CACHE_PREFIX}:${userId}`;
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

export default function App() {
  const initialRoute = readHashRoute();
  const [view, setView] = useState<'landing' | 'auth' | 'app'>(initialRoute.view);
  const [authReady, setAuthReady] = useState(false);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [kits, setKits] = useState<Kit[]>([]);
  const [currentKitId, setCurrentKitId] = useState<string | null>(null);
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>('standard');
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
    const avatarCandidates = [
      metadata.avatar_url,
      metadata.picture,
    ];

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
    logDebug('app', 'View changed', { view, activeTab });
  }, [view, activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const route = readHashRoute();
      if (route.view === 'app') {
        setActiveTab(route.tab);
        setView(authSession ? 'app' : 'auth');
        return;
      }
      setView(route.view);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [authSession]);

  useEffect(() => {
    logDebug('app', 'Kits/progress state updated', {
      kits: kits.length,
      hasProgress: Boolean(progress),
      currentKitId,
      hasError: Boolean(error),
    });
  }, [kits.length, progress, currentKitId, error]);

  const currentKit = useMemo(
    () => kits.find((kit) => kit.id === currentKitId) ?? null,
    [kits, currentKitId],
  );

  const filteredKits = useMemo(() => kits, [kits]);

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
    const nextKits = sources.map((source, idx) =>
      mapSourceToKit(source, questionMap.get(source.id) ?? [], idx, masteryMap, lastSessionMap),
    );

    setKits(nextKits);
    setCurrentKitId((prev) => (prev && nextKits.some((k) => k.id === prev) ? prev : nextKits[0]?.id ?? null));
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
    if (!authReady) {
      return;
    }

    if (!authSession) {
      setLoadedUserId(null);
      setView((current) => (current === 'app' ? 'auth' : current));
      return;
    }

    if (loadedUserId === authSession.user.id) {
      setView('app');
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
  }, [authReady, authSession, loadedUserId]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    writeHashRoute(view, activeTab);
  }, [authReady, view, activeTab]);

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
  };

  const handleGenerateKit = async (title: string, content: string) => {
    logDebug('app', 'Generating kit from text', {
      titleLength: title.length,
      contentLength: content.length,
    });
    setIsProcessing(true);
    setActiveTab('processing');
    setError(null);

    try {
      const source = await createSourceFromText(title, content);
      await refreshKits();
      await refreshProgress();
      setCurrentKitId(source.id);
      setActiveTab('review');
    } catch (err) {
      logError('app', 'Failed creating kit', err);
      setError(err instanceof Error ? err.message : 'Failed to create kit.');
      setActiveTab('create');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadKitFile = async (file: File) => {
    logDebug('app', 'Uploading source file', { fileName: file.name, size: file.size });
    setIsProcessing(true);
    setActiveTab('processing');
    setError(null);
    try {
      const source = await uploadSourceFile(file);
      await refreshKits();
      await refreshProgress();
      setCurrentKitId(source.id);
      setActiveTab('review');
    } catch (err) {
      logError('app', 'Failed uploading source file', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file.');
      setActiveTab('create');
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
      setActiveTab('dashboard');
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
    setActiveTab('study-mode');
  };

  const handleStartStudyMode = (mode: StudyMode) => {
    setSelectedStudyMode(mode);
    setActiveTab('study');
  };

  const handleRetryWeakItems = () => {
    setSelectedStudyMode('weak_review');
    setActiveTab('study');
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

    setSessionResult(result);
    setActiveTab('complete');
    void refreshProgress();
  };

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Checking session...</div>;
  }

  if (!authSession && view === 'landing') return <LandingPage onGetStarted={() => setView('auth')} />;
  if (!authSession) return <AuthPage />;

  return (
    <div className="min-h-screen bg-background">
      {activeTab !== 'study' && activeTab !== 'processing' && (
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      <main className={activeTab !== 'study' && activeTab !== 'processing' ? 'ml-64' : ''}>
        {activeTab !== 'study' && activeTab !== 'processing' && (
          <TopBar
            onNavigate={setActiveTab}
            onLogout={() => { void handleLogout(); }}
            userProfile={userProfile}
          />
        )}

        <div className={activeTab !== 'study' && activeTab !== 'processing' ? 'pt-22 pb-12 px-10' : ''}>
          {error ? (
            <div className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</div>
          ) : null}

          {activeTab === 'dashboard' && (
            <Dashboard
              kits={filteredKits}
              onStudyKit={handleStudyKit}
              onCreateKit={() => setActiveTab('create')}
              onEditKit={(id) => {
                setCurrentKitId(id);
                setActiveTab('review');
              }}
              onViewAll={() => setActiveTab('kits')}
              onTabChange={setActiveTab}
              progress={progress}
              userProfile={userProfile}
            />
          )}
          {activeTab === 'kits' && (
            <KitsPage
              kits={filteredKits}
              onStudyKit={handleStudyKit}
              onCreateKit={() => setActiveTab('create')}
              onEditKit={(id) => {
                setCurrentKitId(id);
                setActiveTab('review');
              }}
            />
          )}
          {activeTab === 'progress' && <ProgressPage progress={progress} onRefresh={() => { void refreshProgress(); }} />}
          {activeTab === 'help' && <HelpPage onCreateKit={() => setActiveTab('create')} />}
          {activeTab === 'settings' && <SettingsPage onLogout={() => { void handleLogout(); }} userProfile={userProfile} />}
          {activeTab === 'create' && <CreateKit onGenerate={handleGenerateKit} onUploadFile={handleUploadKitFile} />}
          {activeTab === 'processing' && isProcessing && <Processing />}
          {activeTab === 'review' && currentKit && (
            <ReviewKit
              kit={currentKit}
              onStart={() => handleStudyKit(currentKit.id)}
              onStartRapid={() => {
                setSelectedStudyMode('fast_drill');
                setActiveTab('study');
              }}
              onBack={() => setActiveTab('dashboard')}
              onDelete={() => { void handleDeleteKit(currentKit.id); }}
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
          )}
          {activeTab === 'study-mode' && currentKit && (
            <StudyModeSelection
              kit={currentKit}
              progress={progress}
              onStart={handleStartStudyMode}
              onBack={() => setActiveTab('dashboard')}
            />
          )}
          {activeTab === 'study' && currentKit && (
            <StudySession
              kit={currentKit}
              mode={selectedStudyMode}
              onComplete={handleCompleteSession}
              onQuit={() => setActiveTab('dashboard')}
            />
          )}
          {activeTab === 'complete' && sessionResult && (
            <SessionComplete
              result={sessionResult}
              onBack={() => setActiveTab('dashboard')}
              onRetry={handleRetryWeakItems}
              onNew={() => setActiveTab('create')}
            />
          )}
        </div>
      </main>
    </div>
  );
}
