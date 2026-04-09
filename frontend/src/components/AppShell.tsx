import { ReactNode } from 'react';
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
  return (
    <div className="min-h-screen bg-background">
      {!hideShell && <Sidebar activeTab={activeTab} onTabChange={onTabChange} />}

      <main className={!hideShell ? 'ml-64' : ''}>
        {!hideShell && <TopBar onNavigate={onTabChange} onLogout={onLogout} userProfile={userProfile} />}

        <div className={!hideShell ? 'pt-22 pb-12 px-10' : ''}>
          {error ? <div className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</div> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
