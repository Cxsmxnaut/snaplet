import { useState } from 'react';
import { Button } from '../components/Button';
import { User, Moon, Sun, Timer, LogOut, Trash2, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export const SettingsPage = ({
  onLogout,
  userProfile,
}: {
  onLogout: () => void;
  userProfile: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = window.localStorage.getItem('nimble_theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [sessionLength, setSessionLength] = useState(() => {
    const stored = Number(window.localStorage.getItem('nimble_session_length') ?? 10);
    return [5, 10, 15].includes(stored) ? stored : 10;
  });

  const setThemeAndPersist = (value: 'dark' | 'light') => {
    setTheme(value);
    window.localStorage.setItem('nimble_theme', value);
  };

  const setSessionLengthAndPersist = (value: number) => {
    setSessionLength(value);
    window.localStorage.setItem('nimble_session_length', String(value));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header>
        <h2 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-2 font-headline">Settings</h2>
        <p className="text-on-surface-variant text-lg">Personalize your high-velocity learning environment.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <section className="lg:col-span-2 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="text-primary w-8 h-8" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold font-headline text-on-surface">Profile Information</h3>
              <p className="text-sm text-on-surface-variant">Update your account identity</p>
            </div>
          </div>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 px-1">Full Name</label>
                <input className="w-full bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/40 text-on-surface transition-all" type="text" defaultValue={userProfile.displayName}/>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 px-1">Email Address</label>
                <input className="w-full bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/40 text-on-surface transition-all" type="email" defaultValue={userProfile.email}/>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" disabled>Profile managed by Google sign-in</Button>
            </div>
          </form>
        </section>

        {/* Theme */}
        <section className="bg-surface-container rounded-2xl p-8 border border-outline-variant/5 flex flex-col">
          <h3 className="text-xl font-bold font-headline text-on-surface mb-6">App Theme</h3>
          <div className="space-y-4 flex-1">
            <ThemeOption 
              active={theme === 'dark'} 
              onClick={() => setThemeAndPersist('dark')}
              icon={<Moon className="w-5 h-5" />}
              label="Dark Mode"
            />
            <ThemeOption 
              active={theme === 'light'} 
              onClick={() => setThemeAndPersist('light')}
              icon={<Sun className="w-5 h-5" />}
              label="Light Mode"
            />
          </div>
          <p className="text-xs text-on-surface-variant mt-6 italic">Theme preference is saved locally on this device.</p>
        </section>

        {/* Session Length */}
        <section className="lg:col-span-2 bg-surface-container rounded-2xl p-8 border border-outline-variant/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center">
              <Timer className="text-tertiary w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-headline text-on-surface">Study Session Length</h3>
              <p className="text-sm text-on-surface-variant">Default number of questions per kit</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[5, 10, 15].map(val => (
              <button 
                key={val}
                onClick={() => setSessionLengthAndPersist(val)}
                className={cn(
                  "flex-1 min-w-[100px] py-4 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 group",
                  sessionLength === val 
                    ? "bg-tertiary text-on-tertiary font-black scale-105 shadow-xl" 
                    : "bg-surface-container-low border-2 border-outline-variant hover:border-tertiary text-on-surface font-bold"
                )}
              >
                <span className="text-2xl">{val}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-70">Questions</span>
              </button>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-surface-container-low rounded-2xl p-8 border border-error/10">
          <h3 className="text-xl font-bold font-headline text-error mb-6">Account Actions</h3>
          <div className="space-y-3">
            <button onClick={onLogout} className="w-full text-left p-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold flex items-center justify-between transition-colors">
              <span>Sign Out</span>
              <LogOut className="w-5 h-5" />
            </button>
            <button disabled className="w-full text-left p-4 rounded-xl bg-error/10 text-error/60 font-semibold flex items-center justify-between transition-colors cursor-not-allowed">
              <span>Delete Account (Coming Soon)</span>
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Data is encrypted and private.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ThemeOption = ({ active, onClick, icon, label }: any) => (
  <div 
    onClick={onClick}
    className={cn(
      "cursor-pointer rounded-xl p-4 flex items-center justify-between border-2 transition-all",
      active ? "bg-surface-container-high border-primary" : "bg-surface-container-low border-transparent hover:bg-surface-container-high"
    )}
  >
    <div className={cn("flex items-center gap-3", active ? "text-primary" : "text-on-surface-variant")}>
      {icon}
      <span className="font-bold">{label}</span>
    </div>
    <div className={cn(
      "w-5 h-5 rounded-full border-2",
      active ? "border-primary bg-primary" : "border-outline-variant"
    )}></div>
  </div>
);
