import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UserProfile } from '../features/auth/hooks/useAuthSession';

type AppShellProps = {
  hideShell: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userProfile: UserProfile;
  error: string | null;
  children: ReactNode;
};

export function AppShell({
  hideShell,
  activeTab,
  onTabChange,
  onLogout,
  userProfile,
  error,
  children,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem('snaplet_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem('snaplet_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {!hideShell && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
      )}

      <main className={!hideShell ? `transition-[margin-left] duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-56'}` : ''}>
        {!hideShell && (
          <TopBar
            onNavigate={onTabChange}
            onLogout={onLogout}
            userProfile={userProfile}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )}

        <div className={!hideShell ? 'relative pt-24 pb-16 px-8 lg:px-12' : ''}>
          {error ? <div className="mb-6 rounded-2xl border border-error/20 bg-error-container/90 px-4 py-3 text-sm text-on-error-container ambient-shadow">{error}</div> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
