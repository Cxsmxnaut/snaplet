import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { 
  Play, 
  Plus, 
  Clock, 
  CheckCircle2, 
  History, 
  Edit3, 
  ArrowRight,
  AlertCircle,
  BarChart,
  Zap,
  Book,
  Brain
} from 'lucide-react';
import { Kit, ProgressData } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  kits: Kit[];
  onStudyKit: (kitId: string) => void;
  onCreateKit: () => void;
  onEditKit: (id: string) => void;
  onViewAll: () => void;
  onTabChange?: (tab: string) => void;
  progress: ProgressData | null;
}

export const Dashboard = ({ kits, onStudyKit, onCreateKit, onEditKit, onViewAll, onTabChange, progress }: DashboardProps) => {
  const recentKit = [...kits].sort((a, b) => {
    const aTime = a.lastSession ? a.lastSession.getTime() : 0;
    const bTime = b.lastSession ? b.lastSession.getTime() : 0;
    return bTime - aTime;
  })[0];
  const weakItems = progress?.weakQuestions ?? [];
  const outcomeValues = progress ? Object.values(progress.outcomes) : [];
  const chartBars = outcomeValues.length > 0
    ? outcomeValues.map((value) => Math.max(12, Math.min(100, value * 12)))
    : Array.from({ length: 7 }, () => 8);

  const lastSessionLabel = recentKit?.lastSession
    ? recentKit.lastSession.toLocaleDateString()
    : 'No sessions yet';

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Welcome back</h2>
          <p className="text-on-surface-variant font-medium mt-1">Track progress across your live study kits.</p>
        </div>
      </header>

      {/* Hero Action */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 group relative overflow-hidden bg-surface-container rounded-2xl p-8 flex items-center justify-between border border-outline-variant/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block font-headline">Recent Progress</span>
            <h3 className="text-2xl font-headline font-bold mb-4 text-white">{recentKit?.title || "No kits yet"}</h3>
            <div className="flex items-center gap-3 text-on-surface-variant text-sm mb-6">
              <Clock className="w-4 h-4" />
              <span>Last session: {lastSessionLabel}</span>
              <span className="mx-2">•</span>
              <span>{recentKit?.cardCount || 0} cards</span>
            </div>
            <Button onClick={() => recentKit && onStudyKit(recentKit.id)} disabled={!recentKit}>
              Continue Last Session
            </Button>
          </div>
          <div className="hidden md:block z-10">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container-highest" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                <circle 
                  className="text-secondary" 
                  cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" 
                  strokeWidth="8"
                  strokeDasharray="364.4"
                  strokeDashoffset={364.4 * (1 - (recentKit?.mastery || 0) / 100)}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-headline text-white">{recentKit?.mastery || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-high rounded-2xl p-8 flex flex-col justify-center items-center text-center border border-outline-variant/10">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="text-primary w-8 h-8" />
          </div>
          <h3 className="text-xl font-headline font-bold mb-2">New Learning Kit</h3>
          <p className="text-on-surface-variant text-sm mb-6 px-4">Generate cards from PDFs, URLs, or notes in seconds.</p>
          <Button variant="outline" className="w-full" onClick={onCreateKit}>
            Create New Kit
          </Button>
        </div>
      </section>

      {/* My Kits */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-headline font-bold text-white">My Kits</h3>
          <button onClick={onViewAll} className="text-primary font-semibold hover:text-primary-container flex items-center gap-2 transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kits.map((kit) => (
            <div key={kit.id} className="bg-surface-container rounded-2xl p-6 hover:scale-[1.02] hover:bg-surface-container-high transition-all duration-300 flex flex-col group border border-outline-variant/5">
              {(() => {
                const KitIcon = resolveKitIcon(kit.icon);
                return (
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-4", kit.color)}>
                    <KitIcon className="w-6 h-6" />
                  </div>
                );
              })()}
              <h4 className="text-lg font-headline font-bold mb-1 text-on-surface group-hover:text-white">{kit.title}</h4>
              <p className="text-xs text-on-surface-variant font-medium mb-6">
                {kit.cardCount} Cards • {kit.lastSession ? kit.lastSession.toLocaleDateString() : 'No sessions yet'}
              </p>
              <div className="mt-auto flex gap-3">
                <Button variant="ghost" className="flex-1 bg-surface-container-highest" onClick={() => onStudyKit(kit.id)}>Study</Button>
                <button 
                  onClick={() => onEditKit(kit.id)}
                  className="p-2 bg-surface-container-highest rounded-full flex items-center justify-center text-on-surface-variant hover:text-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats and Weak Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-headline font-bold text-white flex items-center gap-2">
            <BarChart className="text-primary w-5 h-5" /> Activity Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Kits" value={kits.length.toString()} />
            <StatCard label="Questions" value={String(progress?.totals.questions ?? 0)} />
            <StatCard label="Sessions" value={String(progress?.totals.sessions ?? 0)} />
          </div>
          <div className="glass-panel rounded-2xl p-6 h-48 flex items-end gap-3 justify-between border border-outline-variant/10">
            {chartBars.map((h, i) => (
              <div key={i} className="flex-1 bg-primary/20 rounded-t-sm transition-all hover:bg-primary/40" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-headline font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="text-tertiary w-5 h-5" /> Weak Focus
          </h3>
          <div className="bg-surface-container-high rounded-2xl p-8 border border-outline-variant/10">
            <p className="text-sm text-on-surface-variant mb-6">These items need immediate attention based on your recent outcomes.</p>
            <ul className="space-y-4 mb-8">
              {weakItems.length === 0 ? (
                <li className="text-sm text-on-surface-variant">No weak items yet. Complete a session to generate focus items.</li>
              ) : weakItems.slice(0, 3).map((item) => (
                <WeakItem key={item.questionId} label={item.prompt} rate={`${Math.max(0, 100 - Math.round(item.recentErrorCount * 20))}%`} />
              ))}
            </ul>
            <Button variant="tertiary" className="w-full py-4" onClick={() => onTabChange?.('progress')}>
              Review Weak Items
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend }: any) => (
  <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5 shadow-sm">
    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
    <div className="flex items-end gap-2">
      <p className="text-3xl font-black font-headline text-white">{value}</p>
      {trend && <p className="text-secondary text-xs font-bold mb-1">{trend}</p>}
    </div>
  </div>
);

const WeakItem = ({ label, rate }: any) => (
  <li className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/5">
    <div className="h-2 w-2 rounded-full bg-tertiary"></div>
    <div className="flex-1">
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="text-xs text-on-surface-variant">Success rate: {rate}</p>
    </div>
  </li>
);

function resolveKitIcon(icon: string) {
  if (icon === 'science') return Zap;
  if (icon === 'translate') return Book;
  return Brain;
}
