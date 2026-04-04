import { useState, useRef, useEffect } from 'react';
import { Bell, Zap, Settings, LogOut, ChevronDown } from 'lucide-react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-64 right-0 z-30 bg-background px-4 md:px-8 py-4 flex justify-between items-center gap-3">
      <div className="flex items-center gap-4 min-w-0" />

      <div className="flex items-center gap-2 md:gap-6 min-w-0">
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            onClick={() => onNavigate('progress')}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all relative"
            title="Open progress"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full"></span>
          </button>
          <button
            onClick={() => onNavigate('create')}
            className="hidden sm:inline-flex p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all"
            title="Create new kit"
          >
            <Zap className="w-5 h-5" />
          </button>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "flex items-center gap-2 p-1 pr-3 rounded-full transition-all hover:bg-surface-container-high",
                isProfileOpen && "bg-surface-container-high"
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
                  className="absolute right-0 mt-2 w-56 bg-surface-container-low border border-outline-variant/10 rounded-2xl shadow-2xl overflow-hidden py-2 z-50"
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
