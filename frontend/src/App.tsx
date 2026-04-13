import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { CreateKit } from './pages/CreateKit';
import { Dashboard } from './pages/Dashboard';
import { HelpPage } from './pages/HelpPage';
import { KitsPage } from './pages/KitsPage';
import { LandingPage } from './pages/LandingPage';
import { Processing } from './pages/Processing';
import { ProgressPage } from './pages/ProgressPage';
import { ReviewKit } from './pages/ReviewKit';
import { SessionComplete } from './pages/SessionComplete';
import { SettingsPage } from './pages/SettingsPage';
import { StudyModeSelection } from './pages/StudyModeSelection';
import { StudySession } from './pages/StudySession';
import { AppShell } from './components/AppShell';
import { LegalPage } from './components/LegalPage';
import { MissingState } from './components/MissingState';
import { useAuthSession } from './features/auth/hooks/useAuthSession';
import { useKitsState } from './features/kits/hooks/useKitsState';
import { deserializeKits, loadUserCache, saveUserCache, serializeKits } from './features/kits/services/kitStorage';
import { buildAppPath, deriveRoute } from './features/navigation/logic/routes';
import { useProgressState } from './features/progress/hooks/useProgressState';
import { useStudyFlow } from './features/study/hooks/useStudyFlow';
import { StudyMode, createSourceFromText, deleteQuestion, deleteSource, updateQuestion, uploadSourceFile } from './lib/api';
import { logDebug, logError } from './lib/debug';
import { supabase } from './lib/supabase';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const explicitChoice = window.localStorage.getItem('snaplet_theme_explicit');
    const stored = window.localStorage.getItem('snaplet_theme');
    return explicitChoice === 'true' && stored === 'dark' ? 'dark' : 'light';
  });
  const route = useMemo(() => deriveRoute(location.pathname), [location.pathname]);
  const routeMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('mode');
    if (raw === 'focus' || raw === 'weak_review' || raw === 'fast_drill' || raw === 'standard') {
      return raw;
    }
    return null;
  }, [location.search]);

  const { authReady, authSession, userProfile } = useAuthSession();
  const {
    kits,
    currentKit,
    currentKitId,
    setCurrentKitId,
    refreshKits,
    hydrateKits,
    updateQuestionInKit,
    removeQuestionFromKit,
    updateKitStudyStats,
  } = useKitsState(route.kitId);
  const { progress, setProgress, progressLoading, progressError, refreshProgress } = useProgressState();
  const { selectedStudyMode, setSelectedStudyMode, sessionResult, handleCompleteSession } = useStudyFlow(routeMode, route.sessionId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  useEffect(() => {
    logDebug('app', 'Mounted App');
  }, []);

  useEffect(() => {
    const documentTheme = route.view === 'app' ? theme : 'light';
    document.documentElement.dataset.theme = documentTheme;
    window.localStorage.setItem('snaplet_theme', theme);
  }, [route.view, theme]);

  const handleThemeChange = (value: 'dark' | 'light') => {
    window.localStorage.setItem('snaplet_theme_explicit', 'true');
    setTheme(value);
  };

  useEffect(() => {
    logDebug('app', 'Route changed', {
      view: route.view,
      activeTab: route.tab,
      currentKitId,
      hasError: Boolean(error),
    });
  }, [route.view, route.tab, currentKitId, error]);

  const navigateToTab = (
    tab: string,
    nextKitId: string | null = currentKitId,
    nextSessionId: string | null = sessionResult?.id ?? null,
  ) => {
    navigate(buildAppPath(tab, nextKitId, nextSessionId, selectedStudyMode));
  };

  const enterApp = async () => {
    logDebug('app', 'Entering app mode');
    setError(null);

    try {
      await Promise.all([refreshKits(route.kitId), refreshProgress()]);
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
      hydrateKits(deserializeKits(cache.kits), cache.currentKitId);
      setProgress(cache.progress);
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

    setCurrentKitId(null);
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
      await refreshKits(source.id);
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
      await refreshKits(source.id);
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
      navigateToTab('dashboard', null);
    } catch (err) {
      logError('app', 'Failed deleting kit', err);
      setError(err instanceof Error ? err.message : 'Failed to delete kit.');
    }
  };

  const handleEditQuestion = async (kitId: string, questionId: string, question: string, answer: string) => {
    await updateQuestion(questionId, question, answer);
    updateQuestionInKit(kitId, questionId, question, answer);
  };

  const handleDeleteQuestion = async (kitId: string, questionId: string) => {
    await deleteQuestion(questionId);
    removeQuestionFromKit(kitId, questionId);
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

  const handleRetryWeakItems = (kitId: string | null = currentKitId) => {
    if (!kitId) {
      navigateToTab('kits');
      return;
    }

    setCurrentKitId(kitId);
    setSelectedStudyMode('weak_review');
    navigate(buildAppPath('study', kitId, null, 'weak_review'));
  };

  const handleOpenRecommendedReview = (sourceId: string | null, mode: StudyMode | null) => {
    if (!sourceId || !mode) {
      navigateToTab('kits');
      return;
    }

    setCurrentKitId(sourceId);
    setSelectedStudyMode(mode);
    navigate(buildAppPath('study', sourceId, null, mode));
  };

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Checking session...</div>;
  }

  if (location.pathname === '/legal/privacy') {
    return <LegalPage title="Privacy" body="Snaplet stores your study data to run kit generation, adaptive review, and account features." />;
  }
  if (location.pathname === '/legal/terms') {
    return <LegalPage title="Terms" body="Use Snaplet responsibly. You are responsible for uploaded content and account access security." />;
  }
  if (location.pathname === '/legal/methodology') {
    return <LegalPage title="Methodology" body="Snaplet combines active recall, spaced repetition, and adaptive question sequencing based on your outcomes." />;
  }
  if (location.pathname === '/legal/contact') {
    return <LegalPage title="Contact" body="Support: support@snaplet.app" />;
  }

  if (!authSession && route.view === 'landing') return <LandingPage onGetStarted={() => navigate('/auth')} />;
  if (!authSession) return <AuthPage />;

  const hideShell = route.tab === 'study' || route.tab === 'processing';

  return (
    <AppShell
      hideShell={hideShell}
      activeTab={route.tab}
      onTabChange={(tab) => navigateToTab(tab)}
      onLogout={() => {
        void handleLogout();
      }}
      userProfile={userProfile}
      error={error}
    >
      {route.tab === 'dashboard' && (
        <Dashboard
          kits={kits}
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

      {route.tab === 'kits' && (
        <KitsPage
          kits={kits}
          onStudyKit={handleStudyKit}
          onCreateKit={() => navigateToTab('create')}
          onEditKit={(id) => {
            setCurrentKitId(id);
            navigateToTab('review', id);
          }}
        />
      )}

      {route.tab === 'progress' && (
        <ProgressPage
          progress={progress}
          loading={progressLoading}
          error={progressError}
          onRefresh={() => {
            void refreshProgress();
          }}
          onCreateKit={() => navigateToTab('create')}
          onOpenKits={() => navigateToTab('kits')}
          onReviewWeakKit={(sourceId, mode) => handleOpenRecommendedReview(sourceId, mode)}
        />
      )}
      {route.tab === 'help' && <HelpPage onCreateKit={() => navigateToTab('create')} onGoDashboard={() => navigateToTab('dashboard')} />}
      {route.tab === 'settings' && (
        <SettingsPage
          onLogout={() => {
            void handleLogout();
          }}
          userProfile={userProfile}
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}
      {route.tab === 'create' && <CreateKit onGenerate={handleGenerateKit} onUploadFile={handleUploadKitFile} />}
      {route.tab === 'processing' && isProcessing && <Processing />}

      {route.tab === 'review' &&
        (currentKit ? (
          <ReviewKit
            kit={currentKit}
            onStart={() => handleStudyKit(currentKit.id)}
            onStartRapid={() => {
              setSelectedStudyMode('fast_drill');
              navigate(buildAppPath('study', currentKit.id, null, 'fast_drill'));
            }}
            onBack={() => navigateToTab('kits')}
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
          <MissingState
            title="Kit Not Found"
            message="This kit is unavailable. Select another kit to continue."
            onGoBack={() => navigate('/app/dashboard')}
            ctaLabel="Go to Home"
          />
        ))}

      {route.tab === 'study-mode' &&
        (currentKit ? (
          <StudyModeSelection
            kit={currentKit}
            progress={progress}
            onStart={handleStartStudyMode}
            onBack={() => navigateToTab('review', currentKit.id)}
          />
        ) : (
          <MissingState
            title="No Kit Selected"
            message="Pick a kit first, then choose your study mode."
            onGoBack={() => navigate('/app/dashboard')}
            ctaLabel="Go to Home"
          />
        ))}

      {route.tab === 'study' &&
        (currentKit ? (
          <StudySession
            kit={currentKit}
            mode={selectedStudyMode}
            onComplete={(results) =>
              handleCompleteSession(results, {
                currentKit,
                onUpdateKitStats: updateKitStudyStats,
                onNavigateToComplete: (sessionId) => navigate(buildAppPath('complete', null, sessionId, selectedStudyMode)),
                onRefreshProgress: refreshProgress,
              })
            }
            onQuit={() => navigateToTab('review', currentKit.id)}
          />
        ) : (
          <MissingState
            title="Session Not Ready"
            message="We could not restore this study session. Start from your kit list."
            onGoBack={() => navigate('/app/dashboard')}
            ctaLabel="Go to Home"
          />
        ))}

      {route.tab === 'complete' &&
        (sessionResult ? (
          <SessionComplete
            result={sessionResult}
            onBack={() => navigateToTab('dashboard')}
            onRetry={() => handleRetryWeakItems(sessionResult.kitId)}
            onNew={() => {
              if (sessionResult.kitId) {
                setCurrentKitId(sessionResult.kitId);
                navigateToTab('study-mode', sessionResult.kitId);
                return;
              }
              navigateToTab('kits');
            }}
          />
        ) : (
          <MissingState
            title="Session Summary Missing"
            message="This completion page expired. Start a fresh session from your dashboard."
            onGoBack={() => navigate('/app/dashboard')}
            ctaLabel="Go to Home"
          />
        ))}
    </AppShell>
  );
}
