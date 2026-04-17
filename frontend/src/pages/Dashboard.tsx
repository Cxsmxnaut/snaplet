import { Button } from '../components/Button';
import { 
  Plus, 
  Clock, 
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
  const recentTrend = progress?.timeSeries.slice(-7) ?? [];
  const maxTrendAttempts = Math.max(...recentTrend.map((point) => point.attempts), 1);

  const lastSessionLabel = recentKit?.lastSession
    ? recentKit.lastSession.toLocaleDateString()
    : 'No sessions yet';

  return (
    <div className="space-y-10">
      <header className="space-y-4 px-1">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Today&apos;s workspace</p>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface leading-[1.04]">Pick up where your learning left off</h2>
          <p className="mt-3 text-on-surface-variant text-lg leading-relaxed">Your active kits, recent sessions, and weak areas all live in one place so you can restart fast.</p>
        </div>
      </header>

      <section className="py-2">
        <div className="grid lg:grid-cols-[1.25fr_0.95fr] gap-6 items-stretch">
          <div className="rounded-[28px] bg-surface p-7 ambient-shadow">
            <div className="flex items-start justify-between gap-6">
              <div>
                <span className="px-3 py-1 bg-primary-container text-primary text-[10px] font-bold uppercase tracking-[0.16em] rounded-full mb-3 inline-block">Most Recent</span>
                <h3 className="text-4xl font-headline font-extrabold mb-4 text-on-surface">{recentKit?.title || "No kits yet"}</h3>
                <div className="flex items-center gap-3 text-on-surface-variant text-sm mb-6">
                  <Clock className="w-4 h-4" />
                  <span>Last session: {lastSessionLabel}</span>
                  <span className="mx-2">•</span>
                  <span>{recentKit?.cardCount || 0} cards</span>
                </div>
                <Button onClick={() => recentKit && onStudyKit(recentKit.id)} disabled={!recentKit} className="rounded-full px-8">
                  Study This Kit
                </Button>
              </div>
              <div className="hidden md:block shrink-0">
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
                    <span className="text-2xl font-black font-headline text-on-surface">{recentKit?.mastery || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[28px] bg-surface-container-low p-8 flex flex-col justify-between">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-5">
              <Plus className="text-primary w-8 h-8" />
            </div>
            <div>
              <h3 className="text-3xl font-headline font-bold mb-2 text-on-surface">Create a fresh study kit</h3>
              <p className="text-on-surface-variant text-base mb-6">Start from notes, documents, or pasted content and generate a new review flow in minutes.</p>
            </div>
            <Button className="w-full rounded-full" onClick={onCreateKit}>
              Create a kit
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-headline font-bold text-on-surface">Your kits</h3>
          <button onClick={onViewAll} className="text-primary font-semibold hover:text-primary-container flex items-center gap-2 transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kits.map((kit) => (
            <div key={kit.id} className="bg-surface-container-low rounded-[28px] p-6 flex flex-col group">
              {(() => {
                const KitIcon = resolveKitIcon(kit.icon);
                return (
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-4", kit.color)}>
                    <KitIcon className="w-6 h-6" />
                  </div>
                );
              })()}
              <h4 className="text-lg font-headline font-bold mb-1 text-on-surface">{kit.title}</h4>
              <p className="text-xs text-on-surface-variant font-medium mb-6">
                {kit.cardCount} Cards • {kit.lastSession ? kit.lastSession.toLocaleDateString() : 'No sessions yet'}
              </p>
              <div className="mt-auto flex gap-3">
                <Button variant="ghost" className="flex-1 bg-surface-container-low" onClick={() => onStudyKit(kit.id)}>Study</Button>
                <button 
                  onClick={() => onEditKit(kit.id)}
                  className="p-2 bg-surface-container-low rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
            <BarChart className="text-primary w-5 h-5" /> Activity Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Kits" value={kits.length.toString()} />
            <StatCard label="Questions" value={String(progress?.totals.questions ?? 0)} />
            <StatCard label="Sessions" value={String(progress?.totals.sessions ?? 0)} />
          </div>
          <div className="bg-surface-container-low rounded-[28px] p-6">
            {recentTrend.length === 0 ? (
              <div className="h-48 rounded-[20px] bg-surface flex items-center justify-center text-sm text-on-surface-variant text-center px-6">
                Complete a few study runs and your recent activity trend will appear here.
              </div>
            ) : (
              <>
                <div className="h-48 flex items-end gap-3 justify-between">
                  {recentTrend.map((point) => {
                    const height = Math.max(12, (point.attempts / maxTrendAttempts) * 100);
                    return (
                      <div key={point.date} className="flex-1 flex flex-col items-center justify-end gap-3 h-full">
                        <div className="text-[11px] font-bold text-on-surface-variant">{point.attempts}</div>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t-[12px] bg-gradient-to-t from-primary to-primary-container"
                            style={{ height: `${height}%` }}
                            title={`${point.attempts} attempts · ${point.sessions} sessions · ${point.accuracy}% accuracy`}
                          />
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/75">
                          {point.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-on-surface-variant">
                  Bar height reflects real attempts per day. Accuracy and session counts are available in Progress.
                </p>
              </>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
            <AlertCircle className="text-tertiary w-5 h-5" /> Weak Focus
          </h3>
          <div className="bg-surface-container-low rounded-[28px] p-8">
            <p className="text-sm text-on-surface-variant mb-6">These items need immediate attention based on your recent outcomes.</p>
            <ul className="space-y-4 mb-8">
              {weakItems.length === 0 ? (
                <li className="text-sm text-on-surface-variant">No weak items yet. Complete a session to generate focus items.</li>
              ) : weakItems.slice(0, 3).map((item) => (
                <li key={item.questionId} className="flex items-center gap-4 p-4 rounded-xl bg-surface">
                  <div className="h-2 w-2 rounded-full bg-tertiary"></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-on-surface">{item.prompt}</p>
                    <p className="text-xs text-on-surface-variant">
                      {item.recentErrorCount} recent miss{item.recentErrorCount === 1 ? '' : 'es'} · {item.nearMissCount} near miss{item.nearMissCount === 1 ? '' : 'es'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="tertiary" className="w-full py-4" onClick={() => onTabChange?.('progress')}>
              Open Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend }: any) => (
  <div className="bg-surface-container-low rounded-[24px] p-6">
    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
    <div className="flex items-end gap-2">
      <p className="text-3xl font-black font-headline text-on-surface">{value}</p>
      {trend && <p className="text-secondary text-xs font-bold mb-1">{trend}</p>}
    </div>
  </div>
);

function resolveKitIcon(icon: string) {
  if (icon === 'science') return Zap;
  if (icon === 'translate') return Book;
  return Brain;
}
