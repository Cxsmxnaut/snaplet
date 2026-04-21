import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { AssistantPage } from './pages/AssistantPage';
import { CreateKit } from './pages/CreateKit';
import { Dashboard } from './pages/Dashboard';
import { FeedbackPage } from './pages/FeedbackPage';
import { HelpPage } from './pages/HelpPage';
import { KitsPage } from './pages/KitsPage';
import { LandingPage } from './pages/LandingPage';
import { Processing } from './pages/Processing';
import { ProgressPage } from './pages/ProgressPage';
import { ReviewKit } from './pages/ReviewKit';
import { SharedKitPage } from './pages/SharedKitPage';
import { SessionComplete } from './pages/SessionComplete';
import { SettingsPage } from './pages/SettingsPage';
import { StudyModeSelection } from './pages/StudyModeSelection';
import { StudySession } from './pages/StudySession';
import { AppShell } from './components/AppShell';
import { LegalPage } from './components/LegalPage';
import { MissingState } from './components/MissingState';
import { PageTransition } from './components/PageTransition';
import { useAuthSession } from './features/auth/hooks/useAuthSession';
import { useKitsState } from './features/kits/hooks/useKitsState';
import { clearCreateDraft, loadUserCache, purgeSensitiveLocalState, saveUserCache } from './features/kits/services/kitStorage';
import { buildAppPath, deriveRoute } from './features/navigation/logic/routes';
import type { AssistantAction } from '../shared/assistant';
import { useProgressState } from './features/progress/hooks/useProgressState';
import { useStudyFlow } from './features/study/hooks/useStudyFlow';
import {
  BackendActiveSourceSession,
  SharedKitSnapshot,
  StudyMode,
  createSourceFromText,
  deleteQuestion,
  deleteSource,
  getActiveSourceSession,
  getSharedKit,
  regenerateSourceQuestions,
  trackProductEvent,
  updateQuestion,
  updateSourceVisibility,
  uploadSourceFile,
} from './lib/api';
import { logDebug, logError } from './lib/debug';
import { supabase } from './lib/supabase';

const LEGAL_PAGES = {
  privacy: {
    eyebrow: 'Privacy',
    title: 'How Snaplet handles your data',
    intro:
      'Snaplet stores study data so your kits, sessions, progress, and account state persist across devices. This page reflects the current product behavior rather than placeholder policy text.',
    sections: [
      {
        title: 'What we store',
        body: [
          'We store account information from Supabase Auth, study sources, generated questions, review states, study sessions, progress analytics, and product event logs that help us understand activation and reliability.',
          'If you make a kit public, Snaplet stores that visibility choice and serves a read-only shared page for that kit until you switch it back to private.',
        ],
      },
      {
        title: 'How uploads are processed',
        body: [
          'TXT and Markdown uploads are decoded directly. DOCX files are parsed with Mammoth. PDFs first try text-layer extraction and may fall back to OCR only when the extracted text quality is weak.',
          'If OCR is configured in the environment, Snaplet may send PDF bytes to OCR.space to recover readable text. On some local setups Snaplet can also use a local Tesseract flow instead of a third-party OCR provider.',
        ],
      },
      {
        title: 'How AI providers are used',
        body: [
          'Question generation and title generation can use Groq, OpenRouter, and Ollama in ordered failover, depending on the provider keys configured for the running environment.',
          'Semantic answer checking uses deterministic grading first. Only if those checks still mark an answer wrong can Snaplet send the prompt, canonical answer, and user answer to a configured model provider for semantic review.',
        ],
      },
      {
        title: 'Retention and deletion',
        body: [
          'We keep your account data, study kits, questions, sessions, and analytics while your account remains active so the product can preserve progress and resumable study flows.',
          'Delete-account handling currently routes through support so the request can be completed safely. Public kits stop being publicly accessible as soon as you switch them back to private.',
        ],
      },
    ],
    footer: 'If you do not want a document or answer sent to external processors, avoid using environments where those providers are configured or contact support before uploading sensitive material.',
  },
  terms: {
    eyebrow: 'Terms',
    title: 'Responsible use of Snaplet',
    intro:
      'Snaplet is a study tool, not a guarantee of academic outcomes. These terms are a plain-language summary of how the product is intended to be used right now.',
    sections: [
      {
        title: 'Your content',
        body: [
          'Only upload or paste material you have the right to use. You are responsible for the notes, readings, study guides, and answers you submit.',
          'Do not upload highly sensitive personal, medical, financial, or regulated material unless you are comfortable with the processor path described in the Privacy page.',
        ],
      },
      {
        title: 'Accounts and access',
        body: [
          'You are responsible for maintaining access to your sign-in provider and protecting your device sessions.',
          'Public sharing is opt-in per kit. If you make a kit public, anyone with the share link can read the shared kit page until you revoke that visibility.',
        ],
      },
      {
        title: 'Service limits',
        body: [
          'Snaplet can refuse malformed uploads, unsupported file types, or behavior that abuses the product or harms reliability for other users.',
          'AI-generated questions and grading support study, but they can still be imperfect. You should review important material before relying on it.',
        ],
      },
    ],
    footer: 'For account removal, legal requests, or questions about processor use, contact support@snaplet.app.',
  },
  methodology: {
    eyebrow: 'Methodology',
    title: 'How Snaplet builds and grades study sessions',
    intro:
      'Snaplet combines source extraction, question generation, deterministic grading, semantic fallback, and session analytics to create a review loop that is more structured than a simple flashcard generator.',
    sections: [
      {
        title: 'Generation',
        body: [
          'Source text is normalized first. Snaplet then generates question-answer pairs and a title through the configured provider chain, with fallback across Groq, OpenRouter, and Ollama before heuristic generation is considered.',
          'Generated kits are meant to be reviewed before study. Regeneration reruns question creation against the saved source material, not a hidden alternate draft.',
        ],
      },
      {
        title: 'Answer checking',
        body: [
          'Snaplet grades exact matches, accent-near matches, typo-near matches, correct-after-retry cases, and incorrect answers. Deterministic checks always run first.',
          'If deterministic grading still says an answer is wrong, Snaplet can ask a configured semantic provider whether the meaning is actually equivalent. That fallback is model-assisted, not the default path for every answer.',
        ],
      },
      {
        title: 'Progress and review pressure',
        body: [
          'Progress surfaces are derived from persisted session and attempt data, including weak-question pressure, retention windows, recent sessions, and per-kit breakdowns.',
          'Auto Review kits are generated from recurring weak areas so users can revisit pressure points faster. They are system-generated, but visible and editable like normal kits.',
        ],
      },
    ],
    footer: 'Methodology will keep evolving, but this page is intended to reflect the current runtime behavior, not an aspirational future design.',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Reach Snaplet support',
    intro:
      'The fastest way to reach us right now is by email. Use the route that best matches your request so we can respond with the right context.',
    sections: [
      {
        title: 'Support',
        body: [
          'General support, bug reports, and product questions: support@snaplet.app',
          'Delete-account requests, privacy questions, or concerns about a public shared kit should also go through support so we can verify the request safely.',
        ],
      },
      {
        title: 'What to include',
        body: [
          'If you are reporting a bug, include the kit title, what you were trying to do, and what went wrong.',
          'If your question is about uploads or AI output quality, mention whether you used pasted notes, CSV, PDF, or DOCX so we can trace the right processor path.',
        ],
      },
    ],
    footer: 'Snaplet does not currently expose a live support dashboard or self-serve deletion flow. Email is the active support channel.',
  },
} as const;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const explicitChoice = window.localStorage.getItem('snaplet_theme_explicit');
    const stored = window.localStorage.getItem('snaplet_theme');
    return explicitChoice === 'true' && stored === 'dark' ? 'dark' : 'light';
  });
  const route = useMemo(() => deriveRoute(location.pathname), [location.pathname]);
  const isStandaloneAppRoute = location.pathname.startsWith('/legal/') || location.pathname === '/feedback';
  const topBarSearchQuery = searchParams.get('q') ?? '';
  const createIntent = useMemo(() => {
    const rawIntent = searchParams.get('intent');
    return rawIntent === 'paste' || rawIntent === 'upload' ? rawIntent : null;
  }, [searchParams]);
  const routeMode = useMemo(() => {
    const raw = searchParams.get('mode');
    if (raw === 'focus' || raw === 'weak_review' || raw === 'fast_drill' || raw === 'standard') {
      return raw;
    }
    return null;
  }, [searchParams]);

  const { authReady, authSession, userProfile } = useAuthSession();
  const {
    kits,
    currentKit,
    currentKitId,
    setCurrentKitId,
    refreshKits,
    updateQuestionInKit,
    removeQuestionFromKit,
    syncKitProgress,
  } = useKitsState(route.kitId);
  const { progress, progressLoading, progressError, refreshProgress } = useProgressState();
  const { selectedStudyMode, setSelectedStudyMode, sessionResult, sessionResultLoading, handleCompleteSession } = useStudyFlow(routeMode, route.sessionId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [activeKitSession, setActiveKitSession] = useState<BackendActiveSourceSession | null>(null);
  const [activeKitSessionLoading, setActiveKitSessionLoading] = useState(false);

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

  useEffect(() => {
    setError(null);
  }, [location.pathname, location.search]);

  const navigateToTab = (
    tab: string,
    nextKitId: string | null = currentKitId,
    nextSessionId: string | null = sessionResult?.id ?? null,
  ) => {
    navigate(buildAppPath(tab, nextKitId, nextSessionId, selectedStudyMode));
  };

  const handleTopBarSearch = (query: string) => {
    const trimmedQuery = query.trim();
    navigate(trimmedQuery ? `/app/kits?q=${encodeURIComponent(trimmedQuery)}` : '/app/kits');
  };

  const handleQuickCreate = (intent: 'default' | 'paste' | 'upload') => {
    if (intent === 'default') {
      navigate('/app/create');
      return;
    }

    navigate(`/app/create?intent=${intent}`);
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
      currentKitId,
      updatedAt: new Date().toISOString(),
    });
  }, [authSession?.user?.id, loadedUserId, currentKitId]);

  useEffect(() => {
    syncKitProgress(progress);
  }, [progress, syncKitProgress]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!authSession) {
      if (loadedUserId) {
        purgeSensitiveLocalState(loadedUserId);
      }
      setLoadedUserId(null);
      if (route.view === 'app') {
        navigate('/auth', { replace: true });
      }
      return;
    }

    if (loadedUserId === authSession.user.id) {
      if (route.view !== 'app' && !isStandaloneAppRoute) {
        navigate('/app/dashboard', { replace: true });
      }
      return;
    }

    const cache = loadUserCache(authSession.user.id);
    if (cache) {
      logDebug('app', 'Hydrating UI from user cache', {
        userId: authSession.user.id,
        hasCurrentKitId: Boolean(cache.currentKitId),
        updatedAt: cache.updatedAt,
      });
      setCurrentKitId(cache.currentKitId);
    }

    setLoadedUserId(authSession.user.id);
    void enterApp();
  }, [authReady, authSession, isStandaloneAppRoute, loadedUserId, navigate, route.view]);

  useEffect(() => {
    if (!authSession?.user?.id || !currentKitId) {
      setActiveKitSession(null);
      setActiveKitSessionLoading(false);
      return;
    }

    let cancelled = false;
    setActiveKitSessionLoading(true);

    const loadActiveSession = async () => {
      try {
        const session = await getActiveSourceSession(currentKitId);
        if (!cancelled) {
          setActiveKitSession(session);
        }
      } catch {
        if (!cancelled) {
          setActiveKitSession(null);
        }
      } finally {
        if (!cancelled) {
          setActiveKitSessionLoading(false);
        }
      }
    };

    void loadActiveSession();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id, currentKitId, route.tab]);

  const handleLogout = async () => {
    logDebug('auth', 'Signing out');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      logError('auth', 'Sign out failed', signOutError);
      setError(signOutError.message);
      return;
    }

    void trackProductEvent('auth_signed_out', {
      properties: {
        method: 'manual',
      },
    });
    purgeSensitiveLocalState(authSession?.user?.id ?? null);
    setCurrentKitId(null);
    setActiveKitSession(null);
    navigate('/', { replace: true });
  };

  const handleGenerateKit = async (title: string, content: string, visibility: 'private' | 'public') => {
    logDebug('app', 'Generating kit from text', {
      titleLength: title.length,
      contentLength: content.length,
    });
    void trackProductEvent('source_create_started', {
      properties: {
        kind: 'paste',
        titleLength: title.trim().length,
        contentLength: content.trim().length,
        visibility,
      },
    });
    setIsProcessing(true);
    navigateToTab('processing');
    setError(null);

    try {
      const source = await createSourceFromText(title, content, visibility);
      clearCreateDraft(authSession.user.id);
      await refreshKits(source.id);
      await refreshProgress();
      setCurrentKitId(source.id);
      navigateToTab('review', source.id);
    } catch (err) {
      void trackProductEvent('source_create_failed', {
        properties: {
          kind: 'paste',
          visibility,
          message: err instanceof Error ? err.message : 'unknown_error',
        },
      });
      logError('app', 'Failed creating kit', err);
      setError(err instanceof Error ? err.message : 'Failed to create kit.');
      navigateToTab('create');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadKitFile = async (file: File, visibility: 'private' | 'public') => {
    logDebug('app', 'Uploading source file', { fileName: file.name, size: file.size });
    void trackProductEvent('upload_started', {
      properties: {
        kind: 'upload',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'unknown',
        visibility,
      },
    });
    setIsProcessing(true);
    navigateToTab('processing');
    setError(null);
    try {
      const source = await uploadSourceFile(file, visibility);
      clearCreateDraft(authSession.user.id);
      await refreshKits(source.id);
      await refreshProgress();
      setCurrentKitId(source.id);
      navigateToTab('review', source.id);
    } catch (err) {
      void trackProductEvent('upload_failed', {
        properties: {
          kind: 'upload',
          fileName: file.name,
          fileSize: file.size,
          visibility,
          message: err instanceof Error ? err.message : 'unknown_error',
        },
      });
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
      setActiveKitSession(null);
      navigateToTab('dashboard', null);
    } catch (err) {
      logError('app', 'Failed deleting kit', err);
      setError(err instanceof Error ? err.message : 'Failed to delete kit.');
    }
  };

  const handleRegenerateKit = async (kitId: string) => {
    await regenerateSourceQuestions(kitId);
    await refreshProgress();
    await refreshKits(kitId);
  };

  const handleToggleKitVisibility = async (kitId: string, visibility: 'private' | 'public') => {
    await updateSourceVisibility(kitId, visibility);
    await refreshKits(kitId);
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

    void trackProductEvent('weak_review_opened', {
      sourceId: kitId,
      properties: {
        entry: 'session_complete',
      },
    });
    setCurrentKitId(kitId);
    setSelectedStudyMode('weak_review');
    navigate(buildAppPath('study', kitId, null, 'weak_review'));
  };

  const handleOpenRecommendedReview = (sourceId: string | null, mode: StudyMode | null) => {
    if (!sourceId || !mode) {
      navigateToTab('kits');
      return;
    }

    void trackProductEvent('recommended_review_opened', {
      sourceId,
      properties: {
        mode,
      },
    });
    setCurrentKitId(sourceId);
    setSelectedStudyMode(mode);
    navigate(buildAppPath('study', sourceId, null, mode));
  };

  const handleAssistantAction = async (action: AssistantAction) => {
    if (action.type === 'navigate') {
      navigateToTab(action.target);
      return;
    }

    if (action.type === 'open_help_topic') {
      navigate(`/app/help${action.topic === 'streaks' ? '?topic=streaks' : ''}`);
      return;
    }

    if (action.type === 'open_kit') {
      setCurrentKitId(action.sourceId);
      navigateToTab(action.destination === 'study-mode' ? 'study-mode' : 'review', action.sourceId);
      return;
    }

    await handleGenerateKit(action.title, action.content, action.visibility);
  };

  const handleResumeSession = (session: BackendActiveSourceSession) => {
    setCurrentKitId(session.sourceId);
    setSelectedStudyMode(session.mode);
    navigate(buildAppPath('study', session.sourceId, session.sessionId, session.mode));
  };

  const sharedMatch = location.pathname.match(/^\/shared\/([^/]+)$/);
  const sharedKitId = sharedMatch?.[1] ?? null;
  const [sharedKit, setSharedKit] = useState<SharedKitSnapshot | null>(null);
  const [sharedKitLoading, setSharedKitLoading] = useState(false);
  const [sharedKitError, setSharedKitError] = useState<string | null>(null);

  useEffect(() => {
    if (!sharedKitId) {
      setSharedKit(null);
      setSharedKitError(null);
      setSharedKitLoading(false);
      return;
    }

    let cancelled = false;
    setSharedKitLoading(true);
    setSharedKitError(null);

    const loadSharedKit = async () => {
      try {
        const snapshot = await getSharedKit(sharedKitId);
        if (!cancelled) {
          setSharedKit(snapshot);
        }
      } catch (error) {
        if (!cancelled) {
          setSharedKitError(error instanceof Error ? error.message : 'Failed to load shared kit.');
          setSharedKit(null);
        }
      } finally {
        if (!cancelled) {
          setSharedKitLoading(false);
        }
      }
    };

    void loadSharedKit();

    return () => {
      cancelled = true;
    };
  }, [sharedKitId]);

  if (!authReady) {
    return (
      <PageTransition transitionKey="auth-loading">
        <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Checking session...</div>
      </PageTransition>
    );
  }

  if (location.pathname === '/legal/privacy') {
    return (
      <PageTransition transitionKey="legal-privacy">
        <LegalPage {...LEGAL_PAGES.privacy} onBackToApp={authSession ? () => navigate('/app/dashboard') : null} />
      </PageTransition>
    );
  }
  if (sharedKitId) {
    return (
      <PageTransition transitionKey={`shared:${sharedKitId}`}>
        <SharedKitPage
          snapshot={sharedKit}
          loading={sharedKitLoading}
          error={sharedKitError}
          onGetStarted={() => navigate('/auth')}
          onGoHome={() => navigate('/')}
        />
      </PageTransition>
    );
  }
  if (location.pathname === '/legal/terms') {
    return (
      <PageTransition transitionKey="legal-terms">
        <LegalPage {...LEGAL_PAGES.terms} onBackToApp={authSession ? () => navigate('/app/dashboard') : null} />
      </PageTransition>
    );
  }
  if (location.pathname === '/legal/methodology') {
    return (
      <PageTransition transitionKey="legal-methodology">
        <LegalPage {...LEGAL_PAGES.methodology} onBackToApp={authSession ? () => navigate('/app/dashboard') : null} />
      </PageTransition>
    );
  }
  if (location.pathname === '/legal/contact') {
    return (
      <PageTransition transitionKey="legal-contact">
        <LegalPage {...LEGAL_PAGES.contact} onBackToApp={authSession ? () => navigate('/app/dashboard') : null} />
      </PageTransition>
    );
  }
  if (location.pathname === '/feedback') {
    return (
      <PageTransition transitionKey="feedback">
        <FeedbackPage onBackToApp={authSession ? () => navigate('/app/dashboard') : null} />
      </PageTransition>
    );
  }

  if (!authSession && route.view === 'landing') {
    return (
      <PageTransition transitionKey="landing">
        <LandingPage onGetStarted={() => navigate('/auth')} />
      </PageTransition>
    );
  }
  if (!authSession) {
    return (
      <PageTransition transitionKey="auth">
        <AuthPage />
      </PageTransition>
    );
  }

  const hideShell = route.tab === 'study' || route.tab === 'processing';

  return (
    <AppShell
      hideShell={hideShell}
      activeTab={route.tab}
      kits={kits}
      searchQuery={topBarSearchQuery}
      onTabChange={(tab) => navigateToTab(tab)}
      onOpenKit={(id) => {
        setCurrentKitId(id);
        navigateToTab('review', id);
      }}
      onOpenSuggestedReview={() => {
        const recommendation = progress?.recommendations;
        if (!recommendation) {
          navigateToTab(kits.length > 0 ? 'progress' : 'create');
          return;
        }

        if (recommendation.actionType === 'create_kit') {
          navigateToTab('create');
          return;
        }

        if (recommendation.actionType === 'open_kits') {
          navigateToTab('kits');
          return;
        }

        handleOpenRecommendedReview(recommendation.sourceId, recommendation.mode);
      }}
      onSearch={handleTopBarSearch}
      onQuickCreate={handleQuickCreate}
      onLogout={() => {
        void handleLogout();
      }}
      onOpenStreakHelp={() => navigate('/app/help?topic=streaks')}
      onOpenLegalPage={(page) => navigate(`/legal/${page}`)}
      onOpenFeedback={() => navigate('/feedback')}
      userProfile={userProfile}
      progress={progress}
      error={error}
      routeKey={`${route.tab}:${route.kitId ?? 'none'}:${route.sessionId ?? 'none'}:${routeMode ?? 'none'}`}
      theme={theme}
      onThemeChange={handleThemeChange}
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
          initialSearchQuery={topBarSearchQuery}
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
      {route.tab === 'assistant' && (
        <AssistantPage
          progress={progress}
          currentTab={route.tab}
          currentKitId={currentKitId}
          onRunAction={handleAssistantAction}
          onQuickCreate={() => handleQuickCreate('default')}
          onOpenSettings={() => navigateToTab('settings')}
        />
      )}
      {route.tab === 'help' && (
        <HelpPage
          onCreateKit={() => navigateToTab('create')}
          onGoDashboard={() => navigateToTab('dashboard')}
          focusTopic={searchParams.get('topic')}
        />
      )}
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
      {route.tab === 'create' && (
        <CreateKit
          userId={authSession.user.id}
          launchIntent={createIntent}
          onLaunchIntentHandled={() => {
            if (createIntent) {
              navigate('/app/create', { replace: true });
            }
          }}
          onGenerate={handleGenerateKit}
          onUploadFile={handleUploadKitFile}
        />
      )}
      {route.tab === 'processing' && isProcessing && <Processing onBack={() => navigateToTab('create')} />}

      {route.tab === 'review' &&
        (currentKit ? (
          <ReviewKit
            kit={currentKit}
            onStart={() => handleStudyKit(currentKit.id)}
            onRegenerate={() => handleRegenerateKit(currentKit.id)}
            onToggleVisibility={(visibility) => handleToggleKitVisibility(currentKit.id, visibility)}
            onStartRapid={() => {
              setSelectedStudyMode('fast_drill');
              navigate(buildAppPath('study', currentKit.id, null, 'fast_drill'));
            }}
            activeSession={activeKitSession}
            activeSessionLoading={activeKitSessionLoading}
            onResumeSession={() => {
              if (activeKitSession) {
                handleResumeSession(activeKitSession);
              }
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
            activeSession={activeKitSession}
            activeSessionLoading={activeKitSessionLoading}
            onResumeSession={(session) => handleResumeSession(session)}
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
            sessionId={route.sessionId}
            onSessionReady={(sessionId) => {
              if (route.sessionId === sessionId) {
                return;
              }

              setActiveKitSession({
                sessionId,
                sourceId: currentKit.id,
                mode: selectedStudyMode,
                answeredCount: 0,
                questionCap: currentKit.questions.length,
                startedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                pendingRetry: false,
                currentPosition: 1,
              });
              navigate(buildAppPath('study', currentKit.id, sessionId, selectedStudyMode), { replace: true });
            }}
            onComplete={(results) =>
              handleCompleteSession(results, {
                currentKit,
                onNavigateToComplete: (sessionId) => {
                  setActiveKitSession(null);
                  navigate(buildAppPath('complete', null, sessionId, selectedStudyMode));
                },
                onRefreshProgress: refreshProgress,
              })
            }
            onQuit={() => {
              void trackProductEvent('session_quit', {
                sourceId: currentKit.id,
                sessionId: route.sessionId ?? null,
                properties: {
                  mode: selectedStudyMode,
                },
              });
              navigateToTab('study-mode', currentKit.id);
            }}
          />
        ) : (
          <MissingState
            title="Session Not Ready"
            message="We could not restore this study session from the server. Start again from your study kit."
            onGoBack={() => navigate('/app/dashboard')}
            ctaLabel="Go to Home"
          />
        ))}

      {route.tab === 'complete' &&
        (sessionResultLoading ? (
          <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant">Loading session summary...</div>
        ) : sessionResult ? (
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
            message="We could not load this session summary from the server. Open the kit again and start a new run if needed."
            onGoBack={() => navigate('/app/dashboard')}
            ctaLabel="Go to Home"
          />
        ))}
    </AppShell>
  );
}
