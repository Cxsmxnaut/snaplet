import {
  Menu,
  House,
  FolderOpen,
  ChartSpline,
  MessageSquareText,
  HelpCircle,
  Plus,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { routeSpring } from '../lib/motion';
import { Kit, ProgressData } from '../types';

interface SidebarProps {
  activeTab: string;
  kits: Kit[];
  progress: ProgressData | null;
  onTabChange: (tab: string) => void;
  onOpenKit: (id: string) => void;
  onOpenSuggestedReview: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  minimal?: boolean;
}

export const Sidebar = ({
  activeTab,
  kits,
  progress,
  onTabChange,
  onOpenKit,
  onOpenSuggestedReview,
  isCollapsed,
  onToggleCollapse,
  minimal = false,
}: SidebarProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: House },
    { id: 'kits', label: 'Study Kits', icon: FolderOpen },
    { id: 'progress', label: 'Progress', icon: ChartSpline },
    { id: 'assistant', label: 'Juno AI', icon: MessageSquareText },
  ];
  const recentKit =
    kits.length > 0
      ? [...kits].sort((a, b) => {
          const aTime = a.lastSession ? a.lastSession.getTime() : 0;
          const bTime = b.lastSession ? b.lastSession.getTime() : 0;
          if (aTime !== bTime) {
            return bTime - aTime;
          }
          return b.cardCount - a.cardCount;
        })[0]
      : null;
  const recommendation = progress?.recommendations ?? null;
  const suggestedTitle = recommendation?.headline ?? (recentKit ? 'Tighten your weak spots' : 'Create your first review');
  const suggestedCta =
    recommendation?.actionLabel ?? (recentKit ? 'Open progress' : 'Create kit');

  return (
    <aside className={cn(
      "h-screen fixed left-0 top-0 bg-surface flex flex-col py-5 z-40 transition-[width,padding] duration-300 ease-in-out border-r border-outline-variant/35",
      minimal ? 'w-16 px-2.5' : isCollapsed ? 'w-20 px-2.5' : 'w-56 px-3',
    )}>
      {minimal ? (
        <div className="mb-8 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-[12px] gradient-primary text-on-primary font-black text-sm shadow-[0_8px_18px_rgba(104,214,203,0.18)]">
            S
          </div>
        </div>
      ) : (
        <div className={cn("flex mb-8 text-on-surface-variant transition-all duration-300 ease-in-out", isCollapsed ? 'px-0 items-center justify-center' : 'px-2.5 items-center gap-3')}>
          <motion.button
            onClick={onToggleCollapse}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="interactive-control flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            aria-label={isCollapsed ? "Open navigation" : "Close navigation"}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          <div className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
            isCollapsed ? 'max-w-0 opacity-0 translate-x-1' : 'max-w-32 opacity-100 translate-x-0'
          )}>
            <div className="w-8 h-8 rounded-[14px] gradient-primary flex items-center justify-center text-on-primary font-black text-sm shadow-[0_8px_18px_rgba(104,214,203,0.18)]">S</div>
            <span className="text-sm font-black tracking-tight text-on-surface">Snaplet</span>
          </div>
        </div>
      )}

      {!minimal && !isCollapsed ? (
        <p className="px-4 pb-2 text-[12px] font-bold text-on-surface-variant">Main</p>
      ) : null}

      <nav className={cn("space-y-1.5", isCollapsed ? 'px-0' : 'px-1')}>
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={isCollapsed ? item.label : undefined}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "interactive-control relative flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-300 ease-in-out text-[15px] font-semibold text-left overflow-hidden",
              minimal || isCollapsed ? "h-12 w-12 justify-center mx-auto px-0 rounded-2xl" : "w-full max-w-[150px]",
              activeTab === item.id 
                ? "text-on-surface" 
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            )}
          >
            {activeTab === item.id ? (
              <motion.span
                layoutId="sidebar-active-pill"
                transition={routeSpring}
                className="absolute inset-0 rounded-[inherit] bg-surface-container-high"
              />
            ) : null}
            <item.icon className="relative z-10 w-[19px] h-[19px] shrink-0" strokeWidth={2.1} />
            {!minimal && !isCollapsed ? (
              <span className="relative z-10 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-32 opacity-100 translate-x-0">
                {item.label}
              </span>
            ) : null}
          </motion.button>
        ))}
      </nav>

      {!minimal ? (
        <>
          <div className={cn("mt-7 h-px bg-outline-variant/60 transition-[margin] duration-300 ease-in-out", isCollapsed ? 'mx-3.5' : 'mx-3')} />

          <div className="pt-5">
            <p className={cn(
              "px-4 text-[12px] font-bold text-on-surface-variant mb-2.5 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
              isCollapsed ? 'max-h-0 max-w-0 opacity-0 mb-0' : 'max-h-4 max-w-40 opacity-100'
            )}>
              Library
            </p>
            <div className={cn("space-y-3", isCollapsed ? 'px-0' : 'px-1')}>
              <motion.button
                onClick={() => (recentKit ? onOpenKit(recentKit.id) : onTabChange('create'))}
                title={isCollapsed ? (recentKit ? 'Recent kit' : 'Create kit') : undefined}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "interactive-control text-left transition-all duration-300 ease-in-out",
                  isCollapsed
                    ? "flex h-12 w-12 items-center justify-center mx-auto rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                    : "w-full rounded-[12px] px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                )}
              >
                {isCollapsed ? (
                  recentKit ? <FolderOpen className="w-[19px] h-[19px]" strokeWidth={2.1} /> : <Plus className="w-[19px] h-[19px]" strokeWidth={2.1} />
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
                      {recentKit ? <FolderOpen className="w-4 h-4" strokeWidth={2.1} /> : <Plus className="w-4 h-4" strokeWidth={2.1} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-on-surface line-clamp-1">
                        {recentKit ? recentKit.title : 'No recent kit yet'}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant line-clamp-1">
                        {recentKit
                          ? `Recent kit · ${recentKit.cardCount} cards`
                          : 'Recent kit'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
                  </div>
                )}
              </motion.button>

              <motion.button
                onClick={onOpenSuggestedReview}
                title={isCollapsed ? 'Suggested review' : undefined}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "interactive-control text-left transition-all duration-300 ease-in-out",
                  isCollapsed
                    ? "flex h-12 w-12 items-center justify-center mx-auto rounded-2xl text-primary hover:bg-primary/12"
                    : "w-full rounded-[12px] px-4 py-3 text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                {isCollapsed ? (
                  <Sparkles className="w-[19px] h-[19px]" strokeWidth={2.1} />
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Sparkles className="w-4 h-4" strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-on-surface line-clamp-1">
                        {suggestedTitle}
                      </p>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                        Suggested review · {suggestedCta}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                )}
              </motion.button>
            </div>
          </div>

          <div className={cn("mt-7 h-px bg-outline-variant/60 transition-[margin] duration-300 ease-in-out", isCollapsed ? 'mx-3.5' : 'mx-3')} />
        </>
      ) : null}

      <div className="pt-5 mt-auto">
        {!minimal ? (
          <p className={cn(
            "px-4 text-[12px] font-bold text-on-surface-variant mb-2.5 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
            isCollapsed ? 'max-h-0 max-w-0 opacity-0 mb-0' : 'max-h-4 max-w-24 opacity-100'
          )}>
            Support
          </p>
        ) : null}
        <motion.button
          onClick={() => onTabChange('help')}
          title={minimal || isCollapsed ? 'Help' : undefined}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "interactive-control relative flex items-center px-4 py-3 text-[15px] font-semibold gap-3 transition-all duration-300 ease-in-out rounded-[12px] text-left overflow-hidden",
            minimal || isCollapsed ? "h-12 w-12 justify-center mx-auto px-0 rounded-2xl" : "w-full max-w-[150px]",
            activeTab === 'help'
              ? "text-on-surface"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
          )}
        >
          {activeTab === 'help' ? (
            <motion.span
              layoutId="sidebar-active-pill"
              transition={routeSpring}
              className="absolute inset-0 rounded-[inherit] bg-surface-container-high"
            />
          ) : null}
          <HelpCircle className="relative z-10 w-[19px] h-[19px] shrink-0" strokeWidth={2.1} />
          {!minimal && !isCollapsed ? (
            <span className="relative z-10 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-20 opacity-100 translate-x-0">
              Help
            </span>
          ) : null}
        </motion.button>
      </div>
    </aside>
  );
};
