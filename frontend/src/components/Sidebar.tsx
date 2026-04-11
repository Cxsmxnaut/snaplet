import { 
  Menu,
  House,
  FolderOpen, 
  ChartSpline,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }: SidebarProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: House },
    { id: 'kits', label: 'Study Kits', icon: FolderOpen },
    { id: 'progress', label: 'Progress', icon: ChartSpline },
  ];

  return (
    <aside className={cn(
      "h-screen fixed left-0 top-0 bg-surface flex flex-col py-5 z-40 transition-[width,padding] duration-300 ease-in-out",
      isCollapsed ? 'w-20 px-2.5' : 'w-56 px-3',
    )}>
      <div className={cn("flex mb-8 text-on-surface-variant transition-all duration-300 ease-in-out", isCollapsed ? 'px-0 items-center justify-center' : 'px-2.5 items-center gap-3')}>
        <button
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-[#f6f7fb] hover:text-on-surface transition-colors"
          aria-label={isCollapsed ? "Open navigation" : "Close navigation"}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className={cn(
          "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? 'max-w-0 opacity-0 translate-x-1' : 'max-w-24 opacity-100 translate-x-0'
        )}>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-on-primary font-black text-sm shadow-[0_8px_18px_rgba(66,85,255,0.16)]">S</div>
        </div>
      </div>

      <nav className={cn("space-y-2", isCollapsed ? 'px-0' : 'px-1')}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "relative flex items-center gap-3 px-4 py-3 rounded-[14px] transition-all duration-300 ease-in-out text-[15px] font-semibold text-left",
              isCollapsed ? "h-12 w-12 justify-center mx-auto px-0 rounded-2xl" : "w-full max-w-[150px]",
              activeTab === item.id 
                ? "bg-[#eeefff] text-[#4255FF]" 
                : "text-[#586380] hover:text-[#282E3E] hover:bg-[#f6f7fb]"
            )}
          >
            <item.icon className="w-[19px] h-[19px] shrink-0" strokeWidth={2.1} />
            {!isCollapsed ? (
              <span className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-32 opacity-100 translate-x-0">
                {item.label}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className={cn("mt-8 h-px bg-[#e9edf5] transition-[margin] duration-300 ease-in-out", isCollapsed ? 'mx-3.5' : 'mx-2')} />

      <div className="pt-5">
        <p className={cn(
          "px-3 text-[13px] font-semibold text-[#7d879f] mb-2.5 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
          isCollapsed ? 'max-h-0 max-w-0 opacity-0 mb-0' : 'max-h-4 max-w-40 opacity-100'
        )}>
          Your workspace
        </p>
        <button
          onClick={() => onTabChange('create')}
          title={isCollapsed ? 'New kit' : undefined}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-[15px] font-semibold text-left rounded-[14px] text-[#586380] hover:text-[#282E3E] hover:bg-[#f6f7fb] transition-all duration-300 ease-in-out",
            isCollapsed ? "h-12 w-12 justify-center mx-auto px-0 rounded-2xl" : "w-full max-w-[150px]"
          )}
        >
          <span className="text-xl leading-none shrink-0">+</span>
          {!isCollapsed ? (
            <span className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-32 opacity-100 translate-x-0">
              New kit
            </span>
          ) : null}
        </button>
      </div>

      <div className={cn("mt-8 h-px bg-[#e9edf5] transition-[margin] duration-300 ease-in-out", isCollapsed ? 'mx-3.5' : 'mx-2')} />

      <div className="pt-5 mt-auto">
        <p className={cn(
          "px-3 text-[13px] font-semibold text-[#7d879f] mb-2.5 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
          isCollapsed ? 'max-h-0 max-w-0 opacity-0 mb-0' : 'max-h-4 max-w-24 opacity-100'
        )}>
          Support
        </p>
        <button
          onClick={() => onTabChange('help')}
          title={isCollapsed ? 'Help' : undefined}
          className={cn(
            "flex items-center px-4 py-3 text-[15px] font-semibold gap-3 transition-all duration-300 ease-in-out rounded-[14px] text-left",
            isCollapsed ? "h-12 w-12 justify-center mx-auto px-0 rounded-2xl" : "w-full max-w-[150px]",
            activeTab === 'help'
              ? "bg-[#eeefff] text-[#4255FF]"
              : "text-[#586380] hover:text-[#282E3E] hover:bg-[#f6f7fb]",
          )}
        >
          <HelpCircle className="w-[19px] h-[19px] shrink-0" strokeWidth={2.1} />
          {!isCollapsed ? (
            <span className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-20 opacity-100 translate-x-0">
              Help
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
};
