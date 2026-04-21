import { ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UserProfile } from '../features/auth/hooks/useAuthSession';
import { Kit, ProgressData } from '../types';
import { pageTransition } from '../lib/motion';

type AppShellProps = {
  hideShell: boolean;
  activeTab: string;
  kits: Kit[];
  searchQuery: string;
  onTabChange: (tab: string) => void;
  onOpenKit: (id: string) => void;
  onOpenSuggestedReview: () => void;
  onSearch: (query: string) => void;
  onQuickCreate: (intent: 'default' | 'paste' | 'upload') => void;
  onLogout: () => void;
  onOpenStreakHelp: () => void;
  onOpenLegalPage: (page: 'privacy' | 'terms' | 'contact') => void;
  onOpenFeedback: () => void;
  userProfile: UserProfile;
  progress: ProgressData | null;
  error: string | null;
  routeKey: string;
  theme: 'dark' | 'light';
  onThemeChange: (value: 'dark' | 'light') => void;
  children: ReactNode;
};

export function AppShell({
  hideShell,
  activeTab,
  kits,
  searchQuery,
  onTabChange,
  onOpenKit,
  onOpenSuggestedReview,
  onSearch,
  onQuickCreate,
  onLogout,
  onOpenStreakHelp,
  onOpenLegalPage,
  onOpenFeedback,
  userProfile,
  progress,
  error,
  routeKey,
  theme,
  onThemeChange,
  children,
}: AppShellProps) {
  const isAssistantLayout = activeTab === 'assistant';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem('snaplet_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem('snaplet_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const sidebarCollapsed = isAssistantLayout ? true : isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {!hideShell && (
        <Sidebar
          activeTab={activeTab}
          kits={kits}
          progress={progress}
          onTabChange={onTabChange}
          onOpenKit={onOpenKit}
          onOpenSuggestedReview={onOpenSuggestedReview}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
          minimal={isAssistantLayout}
        />
      )}

      <main className={!hideShell ? `transition-[margin-left] duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-56'}` : ''}>
        {!hideShell && !isAssistantLayout && (
          <TopBar
            activeTab={activeTab}
            onNavigate={onTabChange}
            onSearch={onSearch}
            onQuickCreate={onQuickCreate}
            onLogout={onLogout}
            onOpenStreakHelp={onOpenStreakHelp}
            onOpenLegalPage={onOpenLegalPage}
            onOpenFeedback={onOpenFeedback}
            userProfile={userProfile}
            isSidebarCollapsed={isSidebarCollapsed}
            progress={progress}
            searchQuery={searchQuery}
            theme={theme}
            onThemeChange={onThemeChange}
          />
        )}

        <div className={!hideShell ? isAssistantLayout ? 'relative px-0 pb-0 pt-0' : 'relative px-5 pb-12 pt-20 lg:px-7 xl:px-8' : ''}>
          <AnimatePresence initial={false}>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="mb-6 rounded-2xl border border-error/20 bg-error-container/90 px-4 py-3 text-sm text-on-error-container ambient-shadow"
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
