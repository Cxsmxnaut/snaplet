import { type FormEvent, useState, useRef, useEffect } from 'react';
import {
  ChartSpline,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Search,
  FilePlus2,
  PenSquare,
  Upload,
  Flame,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  X,
  User,
  Moon,
  Sun,
  ShieldCheck,
  FileText,
  MessageCircleHeart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ProgressData } from '../types';

interface TopBarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
  onQuickCreate: (intent: 'default' | 'paste' | 'upload') => void;
  onLogout: () => void;
  onOpenStreakHelp: () => void;
  onOpenLegalPage: (page: 'privacy' | 'terms' | 'contact') => void;
  onOpenFeedback: () => void;
  isSidebarCollapsed: boolean;
  progress: ProgressData | null;
  searchQuery: string;
  theme: 'dark' | 'light';
  onThemeChange: (value: 'dark' | 'light') => void;
  userProfile: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
    avatarPreset: string | null;
  };
}

export const TopBar = ({ 
  activeTab,
  onNavigate,
  onSearch,
  onQuickCreate,
  onLogout,
  onOpenStreakHelp,
  onOpenLegalPage,
  onOpenFeedback,
  isSidebarCollapsed,
  progress,
  searchQuery,
  theme,
  onThemeChange,
  userProfile,
}: TopBarProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [isStreakCalendarOpen, setIsStreakCalendarOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dayIndex = today.getDay();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  const msRemaining = nextMidnight.getTime() - today.getTime();
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const sessionDayKeys = Array.from(
    new Set(
      (progress?.recentSessions ?? []).map((session) => {
        const completed = new Date(session.completedAt);
        return `${completed.getFullYear()}-${completed.getMonth()}-${completed.getDate()}`;
      }),
    ),
  );
  const studiedDaySet = new Set(sessionDayKeys);
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const revivedDaySet = new Set(
    Array.from(
      new Set(
        (progress?.recentSessions ?? [])
          .filter((session) => session.mode === 'weak_review')
          .map((session) => {
            const completed = new Date(session.completedAt);
            return `${completed.getFullYear()}-${completed.getMonth()}-${completed.getDate()}`;
          }),
      ),
    ),
  );
  let streakCount = 0;
  const streakCursor = new Date(today);
  streakCursor.setHours(0, 0, 0, 0);

  while (
    studiedDaySet.has(
      `${streakCursor.getFullYear()}-${streakCursor.getMonth()}-${streakCursor.getDate()}`,
    )
  ) {
    streakCount += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  if (streakCount === 0) {
    const yesterday = new Date(today);
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      studiedDaySet.has(
        `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`,
      )
    ) {
      streakCount = 1;
    }
  }
  const streakActiveDays = new Set<number>();
  const streakPreviewCursor = new Date(today);
  streakPreviewCursor.setHours(0, 0, 0, 0);
  const streakPreviewLength = Math.max(streakCount, 0);
  for (let index = 0; index < streakPreviewLength; index += 1) {
    streakActiveDays.add(streakPreviewCursor.getDay());
    streakPreviewCursor.setDate(streakPreviewCursor.getDate() - 1);
  }

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (streakRef.current && !streakRef.current.contains(event.target as Node)) {
        setIsStreakOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isStreakCalendarOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStreakCalendarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isStreakCalendarOpen]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(draftSearch);
  };

  const quickCreateActions = [
    {
      id: 'default' as const,
      label: 'New kit',
      description: 'Open a blank study kit',
      icon: FilePlus2,
    },
    {
      id: 'paste' as const,
      label: 'Paste notes',
      description: 'Jump straight into the editor',
      icon: PenSquare,
    },
    {
      id: 'upload' as const,
      label: 'Upload file',
      description: 'Start from a document',
      icon: Upload,
    },
  ];

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const firstWeekday = monthStart.getDay();
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const leadingEmptyDays = Array.from({ length: firstWeekday }, (_, index) => `leading-${index}`);
  const calendarCells = [
    ...leadingEmptyDays,
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const studiedDaysInMonth = new Set<number>();
  const revivedDaysInMonth = new Set<number>();

  for (const dayKey of studiedDaySet) {
    const [year, month, day] = dayKey.split('-').map(Number);
    if (year === monthStart.getFullYear() && month === monthStart.getMonth()) {
      studiedDaysInMonth.add(day);
    }
  }

  for (const dayKey of revivedDaySet) {
    const [year, month, day] = dayKey.split('-').map(Number);
    if (year === monthStart.getFullYear() && month === monthStart.getMonth()) {
      revivedDaysInMonth.add(day);
    }
  }

  const calendarStats = [
    {
      label: 'Current Streak',
      value: streakCount,
      icon: Flame,
      iconClassName: 'bg-[#FFF4E9] text-[#F4A247]',
    },
    {
      label: 'Days Studied',
      value: studiedDaysInMonth.size,
      icon: CheckCircle2,
      iconClassName: 'bg-[#1E3532] text-[#71E4D8]',
    },
    {
      label: 'Review Days',
      value: revivedDaysInMonth.size,
      icon: Sparkles,
      iconClassName: 'bg-[#2F2535] text-[#F889B6]',
    },
    {
      label: 'Studied Today',
      value: studiedDaySet.has(todayKey) ? 1 : 0,
      icon: CheckCircle2,
      iconClassName: 'bg-[#2B2B2B] text-[#E3E3E3]',
    },
  ];

  const searchPlaceholder = activeTab === 'assistant' ? 'Search anything' : 'Search kits';
  const profileMenuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      onClick: () => onNavigate('settings'),
    },
    {
      id: 'theme',
      label: theme === 'dark' ? 'Enable Light Mode' : 'Enable Dark Mode',
      icon: theme === 'dark' ? Moon : Sun,
      onClick: () => onThemeChange(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: ShieldCheck,
      onClick: () => onOpenLegalPage('privacy'),
    },
    {
      id: 'terms',
      label: 'Terms',
      icon: FileText,
      onClick: () => onOpenLegalPage('terms'),
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: MessageCircleHeart,
      onClick: onOpenFeedback,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => onNavigate('settings'),
    },
  ];

  const streakCalendarModal =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {isStreakCalendarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-5 backdrop-blur-[8px] sm:items-center sm:py-8"
                onClick={() => setIsStreakCalendarOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  onClick={(event) => event.stopPropagation()}
                  className="relative my-auto w-full max-w-[560px] max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[32px] border border-white/8 bg-[#232323] text-white shadow-[0_32px_90px_rgba(0,0,0,0.45)] sm:max-h-[calc(100vh-4rem)]"
                >
                  <div className="relative h-[132px] bg-[#F4A247]">
                    <button
                      type="button"
                      onClick={() => setIsStreakCalendarOpen(false)}
                      className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#202020] text-white transition-transform hover:scale-[1.02]"
                      aria-label="Close streak calendar"
                    >
                      <X className="h-5.5 w-5.5" />
                    </button>

                    <div className="absolute left-1/2 top-[60px] z-10 flex -translate-x-1/2 items-center gap-2 rounded-[999px] border border-white/20 bg-[#232323] px-5.5 py-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.25)]">
                      <Flame className="h-6.5 w-6.5 fill-[#FFBF5B] text-[#FFBF5B]" />
                      <span className="font-headline text-[36px] font-black leading-none text-[#F4A247]">{streakCount}</span>
                    </div>

                    <div className="absolute inset-x-[-8%] bottom-[-56px] h-[118px] rounded-[50%] bg-[#232323]" />
                  </div>

                  <div className="relative overflow-y-auto px-5 pb-4 pt-6 sm:px-5.5">
                    <div className="mx-auto mb-4 inline-flex w-full max-w-[360px] items-center justify-center rounded-full border border-white/70 px-4 py-2 text-center text-[14px] font-bold text-white">
                      Actions that earn a streak <Flame className="ml-2 h-5 w-5 fill-[#FFBF5B] text-[#FFBF5B]" />
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-4">
                      <h3 className="font-headline text-[19px] font-black tracking-tight text-white">{monthLabel}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/8"
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/8"
                          aria-label="Next month"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/20 px-4 py-3.5">
                      <div className="grid grid-cols-7 gap-y-3.5 text-center">
                        {weekDays.map((day) => (
                          <div key={day} className="text-[11px] font-bold tracking-[0.16em] text-white/90">
                            {day}
                          </div>
                        ))}

                        {calendarCells.map((cell) => {
                          if (typeof cell !== 'number') {
                            return <div key={cell} />;
                          }

                          const isToday =
                            cell === today.getDate() &&
                            monthStart.getMonth() === today.getMonth() &&
                            monthStart.getFullYear() === today.getFullYear();
                          const isStudied = studiedDaysInMonth.has(cell);
                          const isRevived = revivedDaysInMonth.has(cell);

                          return (
                            <div key={cell} className="flex justify-center">
                              <div
                                className={cn(
                                  'flex h-[34px] w-[34px] items-center justify-center rounded-full text-[16px] font-bold',
                                  isStudied
                                    ? 'border-2 border-white bg-[#F4A247] text-white shadow-[0_0_0_3px_rgba(255,255,255,0.16)]'
                                    : isToday
                                    ? 'border border-white/40 bg-white/8 text-white'
                                    : 'text-white/90',
                                )}
                              >
                                <span className={cn(isRevived && !isStudied && 'text-[#F889B6]')}>{cell}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {calendarStats.map((stat) => {
                        const Icon = stat.icon;

                        return (
                          <div
                            key={stat.label}
                            className="flex items-center gap-2.5 rounded-[18px] border border-white/20 px-3.5 py-3"
                          >
                            <div className={cn('flex h-8.5 w-8.5 items-center justify-center rounded-full', stat.iconClassName)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-[14px] font-black leading-none text-white">{stat.value}</div>
                              <div className="mt-0.5 text-[12px] text-white/88">{stat.label}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      <header className={cn(
        "fixed top-0 right-0 z-30 h-18 bg-background/92 backdrop-blur-xl px-5 md:px-7 flex items-center gap-4 transition-[left] duration-300 border-b border-outline-variant/18",
        isSidebarCollapsed ? 'left-20' : 'left-56',
      )}>
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSearchSubmit} className="max-w-xl xl:max-w-2xl">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/55" />
              <input
                type="search"
                id="topbar-kit-search"
                name="kit_search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-12 w-full rounded-full border border-outline-variant/25 bg-surface-container-low px-12 pr-24 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/45 focus:border-primary/45 focus:outline-none"
                aria-label="Search kits"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant md:inline-flex">
                Enter
              </span>
            </label>
          </form>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setIsCreateOpen((open) => !open)}
              className="h-12 px-4 rounded-full gradient-primary text-on-primary flex items-center justify-center gap-2 transition-transform hover:-translate-y-px"
              title="Create something new"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-bold">Create</span>
            </button>
            <AnimatePresence>
              {isCreateOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 mt-3 w-64 rounded-[24px] border border-outline-variant/40 bg-surface p-2 ambient-shadow z-50"
                >
                  {quickCreateActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        onClick={() => {
                          setIsCreateOpen(false);
                          onQuickCreate(action.id);
                        }}
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-surface-container-low"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface">{action.label}</p>
                          <p className="text-xs text-on-surface-variant">{action.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => onNavigate('progress')}
            className={cn(
              'h-11 rounded-full border border-outline-variant/28 bg-surface px-4 text-on-surface transition-all relative flex items-center justify-center gap-2 hover:bg-surface-container-low',
              activeTab === 'progress' && 'bg-surface-container-low'
            )}
            title="Open progress"
          >
            <ChartSpline className="w-4.5 h-4.5 text-primary" />
            <span className="text-sm font-bold">Progress</span>
            <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-secondary" />
          </button>
          <div className="relative" ref={streakRef}>
            <button
              onClick={() => setIsStreakOpen((open) => !open)}
              className={cn(
                'h-11 px-3.5 rounded-full bg-surface border border-outline-variant/28 text-on-surface flex items-center gap-2 transition-all hover:bg-surface-container-low',
                isStreakOpen && 'bg-surface-container-low'
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
                  className="absolute right-0 mt-3 w-[360px] rounded-[28px] bg-surface border border-outline-variant/40 ambient-shadow p-6 z-50"
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
                    Keep today's streak alive
                  </p>
                  <p className="text-center text-sm text-on-surface-variant mb-7">
                    {hoursRemaining}h {minutesRemaining}m left in your local day.
                  </p>

                  <div className="rounded-[26px] bg-surface-container-low p-5 mb-6">
                    <div className="grid grid-cols-7 gap-3">
                      {weekDays.map((day, index) => {
                        const isToday = index === dayIndex;
                        const isCompleted = streakActiveDays.has(index);

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
                      onClick={() => {
                        setIsStreakOpen(false);
                        onOpenStreakHelp();
                      }}
                      className="h-12 rounded-full bg-surface-container-low text-on-surface font-bold"
                    >
                      How to earn a streak
                    </button>
                    <button
                      onClick={() => {
                        setIsStreakOpen(false);
                        setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        setIsStreakCalendarOpen(true);
                      }}
                      className="h-12 rounded-full gradient-primary text-on-primary font-bold"
                    >
                      Calendar
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
                "flex items-center gap-2 p-1 pr-3 rounded-full transition-all hover:bg-surface-container-low backdrop-blur-xl border border-outline-variant/28 bg-surface",
                isProfileOpen && "bg-surface-container-low"
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
                ) : userProfile.avatarPreset ? (
                  <div className={cn("w-full h-full bg-gradient-to-br", userProfile.avatarPreset)} />
                ) : (
                  <div className="w-full h-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
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
                  className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#212121] text-white shadow-[0_28px_70px_rgba(0,0,0,0.46)] z-50"
                >
                  <div className="flex items-center gap-4 px-5 py-5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#2B2B2B]">
                      {userProfile.avatarUrl ? (
                        <img
                          src={userProfile.avatarUrl}
                          alt={userProfile.displayName}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : userProfile.avatarPreset ? (
                        <div className={cn("h-full w-full bg-gradient-to-br", userProfile.avatarPreset)} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-base font-bold text-white">
                          {userProfile.displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold leading-tight text-white">
                        {userProfile.displayName}
                      </p>
                      <p className="truncate pt-1 text-[13px] text-white/76">
                        {userProfile.email || 'Signed in'}
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-white/12" />

                  <div className="px-2 py-2">
                    {profileMenuItems.map((item) => {
                      const Icon = item.icon;

                      const itemClassName =
                        'flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[15px] font-medium text-white transition-colors hover:bg-white/6';

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            item.onClick();
                            setIsProfileOpen(false);
                          }}
                          className={itemClassName}
                        >
                          <Icon className="h-5 w-5 shrink-0 text-white/92" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-white/12" />

                  <div className="px-2 py-2">
                    <button 
                      onClick={() => {
                        onLogout();
                        setIsProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[15px] font-medium text-[#F3655B] transition-colors hover:bg-[#F3655B]/8"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
      {streakCalendarModal}
    </>
  );
};
