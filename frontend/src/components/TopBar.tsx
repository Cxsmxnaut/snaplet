import { useState, useRef, useEffect } from 'react';
import { ChartSpline, Settings, LogOut, ChevronDown, Plus, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TopBarProps {
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  userProfile: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export const TopBar = ({ 
  onNavigate,
  onLogout,
  userProfile,
}: TopBarProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);

  const streakCount = Number(window.localStorage.getItem('snaplet_streak_count') ?? 0);
  const today = new Date();
  const dayIndex = today.getDay();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  const msRemaining = nextMidnight.getTime() - today.getTime();
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (streakRef.current && !streakRef.current.contains(event.target as Node)) {
        setIsStreakOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-56 right-0 z-30 h-20 bg-surface/94 backdrop-blur-xl px-6 md:px-8 flex justify-end items-center gap-4">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            onClick={() => onNavigate('create')}
            className="h-12 w-12 rounded-full gradient-primary text-on-primary flex items-center justify-center transition-transform hover:-translate-y-px ambient-shadow"
            title="Create new kit"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigate('progress')}
            className="h-11 w-11 bg-surface/80 backdrop-blur-xl border border-outline-variant/10 text-on-surface-variant hover:bg-surface rounded-full transition-all relative ambient-shadow flex items-center justify-center"
            title="Open progress"
          >
            <ChartSpline className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full"></span>
          </button>
          <div className="relative" ref={streakRef}>
            <button
              onClick={() => setIsStreakOpen((open) => !open)}
              className={cn(
                'h-11 px-3.5 rounded-full bg-surface-container-low text-on-surface flex items-center gap-2 transition-all',
                isStreakOpen && 'bg-surface'
              )}
              title="View streak"
            >
              <Flame className="w-4 h-4 text-primary fill-primary/10" />
              <span className="text-base font-black font-headline">{streakCount}</span>
            </button>

            <AnimatePresence>
              {isStreakOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 mt-3 w-[360px] rounded-[28px] bg-surface border border-outline-variant/10 ambient-shadow p-6 z-50"
                >
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <div className="h-16 w-16 rounded-full bg-primary-container/55 flex items-center justify-center">
                      <Flame className="w-8 h-8 text-primary fill-primary/10" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-1">Current streak</p>
                      <span className="text-5xl font-headline font-black text-on-surface leading-none">{streakCount}</span>
                    </div>
                  </div>

                  <p className="text-center text-xl font-headline font-black tracking-tight text-on-surface mb-2">
                    Complete a session today to keep your rhythm
                  </p>
                  <p className="text-center text-sm text-on-surface-variant mb-7">
                    {hoursRemaining}h {minutesRemaining}m left before today closes.
                  </p>

                  <div className="rounded-[26px] bg-surface-container-low p-5 mb-6">
                    <div className="grid grid-cols-7 gap-3">
                      {weekDays.map((day, index) => {
                        const isToday = index === dayIndex;
                        const isCompleted = streakCount > 0 && index < dayIndex;

                        return (
                          <div key={`${day}-${index}`} className="flex flex-col items-center gap-2.5">
                            <div
                              className={cn(
                                'h-9 w-9 rounded-full border-2 flex items-center justify-center',
                                isToday
                                  ? 'border-primary text-primary bg-primary/8'
                                  : isCompleted
                                  ? 'border-primary bg-primary'
                                  : 'border-outline-variant bg-surface'
                              )}
                            >
                              {isCompleted ? <div className="h-3 w-3 rounded-full bg-on-primary" /> : null}
                            </div>
                            <span className="text-sm font-bold text-on-surface">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsStreakOpen(false)}
                      className="h-12 rounded-full bg-surface-container-low text-on-surface font-bold"
                    >
                      Keep going
                    </button>
                    <button
                      onClick={() => {
                        setIsStreakOpen(false);
                        onNavigate('progress');
                      }}
                      className="h-12 rounded-full gradient-primary text-on-primary font-bold"
                    >
                      Open progress
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "flex items-center gap-2 p-1 pr-3 rounded-full transition-all hover:bg-surface backdrop-blur-xl border border-outline-variant/10 bg-surface/80 ambient-shadow",
                isProfileOpen && "bg-surface"
              )}
            >
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary/20">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {userProfile.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <ChevronDown className={cn("w-4 h-4 text-on-surface-variant transition-transform duration-300", isProfileOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-56 bg-surface/95 backdrop-blur-xl border border-outline-variant/10 rounded-[24px] ambient-shadow overflow-hidden py-2 z-50"
                >
                  <div className="px-4 py-3 border-b border-outline-variant/5 mb-2">
                    <p className="text-sm font-bold text-on-surface">{userProfile.displayName}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">
                      {userProfile.email || 'Signed In'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <div className="h-px bg-outline-variant/5 my-2" />
                  <button 
                    onClick={() => { onLogout(); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-error hover:bg-error/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
