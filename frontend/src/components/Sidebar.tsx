import { 
  LayoutDashboard, 
  FolderOpen, 
  BarChart, 
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kits', label: 'Study Kits', icon: FolderOpen },
    { id: 'progress', label: 'Progress', icon: BarChart },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant/10 flex flex-col py-6 px-4 z-40">
      <div className="px-2 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-on-primary font-black">S</div>
          <div>
            <h1 className="text-xl font-black text-on-surface tracking-tight font-headline leading-none">Snaplet AI</h1>
            <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/70 font-bold mt-1">The Digital Curator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-headline text-sm font-bold text-left",
              activeTab === item.id 
                ? "bg-primary-container/60 text-primary" 
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 space-y-2 border-t border-outline-variant/10">
        <button
          onClick={() => onTabChange('help')}
          className={cn(
            "w-full flex items-center px-4 py-3 text-sm font-bold gap-3 transition-all rounded-xl font-headline",
            activeTab === 'help'
              ? "bg-primary-container/60 text-primary"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
          )}
        >
          <HelpCircle className="w-4 h-4" />
          Help
        </button>
      </div>
    </aside>
  );
};
