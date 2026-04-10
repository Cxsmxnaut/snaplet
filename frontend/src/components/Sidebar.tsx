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
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: House },
    { id: 'kits', label: 'Study Kits', icon: FolderOpen },
    { id: 'progress', label: 'Progress', icon: ChartSpline },
  ];

  return (
    <aside className="h-screen w-56 fixed left-0 top-0 bg-surface flex flex-col py-4 px-4 z-40">
      <div className="flex items-center gap-4 px-2 mb-8 text-on-surface-variant">
        <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors" aria-label="Open navigation">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-on-primary font-black text-sm">S</div>
        </div>
      </div>

      <nav className="space-y-1 px-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative w-full max-w-[154px] flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold text-left",
              activeTab === item.id 
                ? "bg-[#eeefff] text-primary" 
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-8 border-t border-outline-variant/40" />

      <div className="pt-6">
        <p className="px-2 text-[11px] font-bold text-on-surface-variant/80 mb-3">Your workspace</p>
        <button
          onClick={() => onTabChange('create')}
          className="w-full max-w-[154px] flex items-center gap-3 px-4 py-3 text-sm font-bold text-left rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all"
        >
          <span className="text-xl leading-none">+</span>
          New kit
        </button>
      </div>

      <div className="mt-8 border-t border-outline-variant/40" />

      <div className="pt-6 mt-auto">
        <p className="px-2 text-[11px] font-bold text-on-surface-variant/80 mb-3">Support</p>
        <button
          onClick={() => onTabChange('help')}
          className={cn(
            "w-full max-w-[154px] flex items-center px-4 py-3 text-sm font-bold gap-3 transition-all rounded-xl text-left",
            activeTab === 'help'
              ? "bg-[#eeefff] text-primary"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
          )}
        >
          <HelpCircle className="w-4 h-4" />
          Help
        </button>
      </div>
    </aside>
  );
};
