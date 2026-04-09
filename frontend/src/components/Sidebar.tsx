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
    <aside className="h-screen w-64 fixed left-0 top-0 bg-background flex flex-col py-6 z-40">
      <div className="px-6 mb-10">
        <h1 className="text-2xl font-black text-primary tracking-tighter font-headline">Snaplet</h1>
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Adaptive Learning</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-[calc(100%-1rem)] mx-2 flex items-center px-4 py-3 rounded-full transition-all font-headline text-sm font-semibold group",
              activeTab === item.id 
                ? "bg-primary/20 text-primary" 
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            )}
          >
            <item.icon className={cn("mr-3 w-5 h-5", activeTab === item.id && "fill-primary/20")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 mt-auto space-y-2">
        <button
          onClick={() => onTabChange('help')}
          className={cn(
            "w-full flex items-center px-4 py-2 text-xs font-semibold gap-3 transition-all rounded-xl",
            activeTab === 'help'
              ? "bg-primary/20 text-primary"
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
