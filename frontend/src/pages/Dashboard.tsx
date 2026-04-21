import { Button } from '../components/Button';
import { 
  Clock, 
  Edit3, 
  ArrowRight,
  AlertCircle,
  BarChart,
  CheckCircle2,
  Zap,
  Book,
  Brain,
  Sparkles,
  Target,
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
  const sortedKits = [...kits].sort((a, b) => {
    const aTime = a.lastSession ? a.lastSession.getTime() : 0;
    const bTime = b.lastSession ? b.lastSession.getTime() : 0;
    return bTime - aTime;
  });
  const recentKit = sortedKits[0];
  const weakItems = progress?.weakQuestions ?? [];
  const recentTrend = progress?.timeSeries.slice(-7) ?? [];
  const maxTrendAttempts = Math.max(...recentTrend.map((point) => point.attempts), 1);
  const recommendation = progress?.recommendations ?? null;
  const hasKits = kits.length > 0;
  const focusItems = weakItems.slice(0, 3);
  const topKits = sortedKits.slice(0, 4);

  const lastSessionLabel = recentKit?.lastSession
    ? recentKit.lastSession.toLocaleDateString()
    : 'No sessions yet';

  return (
    <div className="knowt-page-shell space-y-8">
      <header className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">Today&apos;s workspace</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface md:text-[2.6rem]">
            {hasKits ? 'Resume faster, review smarter.' : 'Build your first study loop.'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant md:text-base">
            {hasKits
              ? 'One clear place to continue, see what is slipping, and move into your next session.'
              : 'Paste notes or upload a file once. Recent kits, weak spots, and momentum show up here automatically.'}
          </p>
        </div>
        {hasKits ? (
          <div className="flex flex-wrap gap-2.5">
            <MiniStat label="Kits" value={kits.length.toString()} />
            <MiniStat label="Questions" value={String(progress?.totals.questions ?? 0)} />
            <MiniStat label="Sessions" value={String(progress?.totals.sessions ?? 0)} />
          </div>
        ) : null}
      </header>

      {!hasKits ? (
        <section className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="knowt-panel px-7 py-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-3xl font-headline font-extrabold text-on-surface">Create one kit and the workspace starts taking shape.</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant md:text-base">
              Your dashboard stays intentionally light until there is something real to resume. Start with notes, slides, or a pasted lecture outline.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-full px-7" onClick={onCreateKit}>
                Create your first kit
              </Button>
              <button
                onClick={onViewAll}
                className="rounded-full px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
              >
                See the library
              </button>
            </div>
          </div>

          <div className="knowt-panel bg-surface-container-low px-6 py-6">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">What shows up here</p>
            <div className="mt-5 space-y-4">
              <IntentRow
                icon={CheckCircle2}
                title="Recent kit"
                description="Jump back into your latest review without hunting through menus."
              />
              <IntentRow
                icon={Target}
                title="Weak focus"
                description="The app pulls your weakest prompts forward after a few sessions."
              />
              <IntentRow
                icon={BarChart}
                title="Learning momentum"
                description="Activity fills in once there is real study signal to show."
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="knowt-panel px-7 py-7">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-primary/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                  Resume
                </span>
                <h3 className="mt-4 text-3xl font-headline font-extrabold leading-tight text-on-surface md:text-[2.55rem]">
                  {recentKit?.title}
                </h3>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last session {lastSessionLabel}
                  </span>
                  <span>{recentKit?.cardCount || 0} cards</span>
                  <span>{recentKit?.mastery || 0}% mastery</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => recentKit && onStudyKit(recentKit.id)} className="rounded-full px-8">
                    Study now
                  </Button>
                  <button
                    onClick={() => recentKit && onEditKit(recentKit.id)}
                    className="rounded-full px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Review kit
                  </button>
                </div>
              </div>
              <div className="hidden shrink-0 md:block">
                <div className="relative h-28 w-28">
                  <svg className="h-full w-full -rotate-90">
                    <circle className="text-surface-container-highest" cx="56" cy="56" fill="transparent" r="49" stroke="currentColor" strokeWidth="8" />
                    <circle
                      className="text-secondary"
                      cx="56"
                      cy="56"
                      fill="transparent"
                      r="49"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="307.9"
                      strokeDashoffset={307.9 * (1 - (recentKit?.mastery || 0) / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black font-headline text-on-surface">{recentKit?.mastery || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="knowt-panel bg-surface-container-low px-6 py-6">
            <div className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-4 w-4" />
              <p className="text-[11px] font-black uppercase tracking-[0.18em]">Suggested review</p>
            </div>
            <h3 className="mt-4 text-xl font-headline font-bold text-on-surface">
              {recommendation?.headline ?? (focusItems.length > 0 ? 'Tighten the concepts that are slipping.' : 'You are in a good spot to keep momentum.')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {recommendation?.summary ??
                (focusItems.length > 0
                  ? 'Your recent misses are concentrated enough that a short review pass should help.'
                  : 'No urgent weak spots yet. Progress is the best place to scan momentum and keep the streak moving.')}
            </p>
            <div className="mt-5 space-y-3">
              {focusItems.length > 0 ? (
                focusItems.map((item) => (
                  <div key={item.questionId} className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-tertiary" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-on-surface line-clamp-2">{item.prompt}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {item.recentErrorCount} misses · {item.nearMissCount} near misses
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-surface px-4 py-4 text-sm text-on-surface-variant">
                  Keep studying from your recent kit and the next focus items will appear here automatically.
                </div>
              )}
            </div>
            <button
              onClick={() => onTabChange?.('progress')}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-container"
            >
              Open progress <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {hasKits ? (
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="knowt-panel bg-surface-container-low px-5 py-5">
            <div className="mb-4 flex items-center justify-between gap-4 px-2">
              <div>
                <h3 className="text-xl font-headline font-bold text-on-surface">Your kits</h3>
                <p className="mt-1 text-sm text-on-surface-variant">Quieter rows, faster jumping back in.</p>
              </div>
              <button onClick={onViewAll} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-container">
                View all <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-outline-variant/30 bg-surface">
              {topKits.map((kit, index) => {
                const KitIcon = resolveKitIcon(kit.icon);
                return (
                  <div
                    key={kit.id}
                    className={cn(
                      'flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between',
                      index !== topKits.length - 1 ? 'border-b border-outline-variant/30' : '',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', kit.color)}>
                        <KitIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-on-surface">{kit.title}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {kit.cardCount} cards · {kit.lastSession ? kit.lastSession.toLocaleDateString() : 'No sessions yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                        {kit.mastery}% mastery
                      </div>
                      <Button variant="ghost" className="rounded-full bg-surface-container-low px-4" onClick={() => onStudyKit(kit.id)}>
                        Study
                      </Button>
                      <button
                        onClick={() => onEditKit(kit.id)}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
                      >
                        <Edit3 className="h-4 w-4" />
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-outline-variant/35 bg-surface-container-low px-5 py-5">
            <div className="mb-4 flex items-center gap-2 px-2">
              <BarChart className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-xl font-headline font-bold text-on-surface">Learning momentum</h3>
                <p className="mt-1 text-sm text-on-surface-variant">A quick read on your last seven days.</p>
              </div>
            </div>
            {recentTrend.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-outline-variant/45 bg-surface px-6 py-12 text-center text-sm leading-relaxed text-on-surface-variant">
                Finish a few short study runs and this area will turn into a live momentum view.
              </div>
            ) : (
              <div className="rounded-[24px] bg-surface px-5 py-5">
                <div className="flex h-44 items-end gap-3 justify-between">
                  {recentTrend.map((point) => {
                    const height = Math.max(14, (point.attempts / maxTrendAttempts) * 100);
                    return (
                      <div key={point.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <div className="text-[11px] font-bold text-on-surface-variant">{point.attempts}</div>
                        <div className="flex w-full flex-1 items-end">
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
                  Need the deeper breakdown? Open Progress for accuracy and per-session detail.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
};

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-full border border-outline-variant/35 bg-surface-container-low px-4 py-2.5">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">{label}</p>
    <p className="mt-1 text-sm font-bold text-on-surface">{value}</p>
  </div>
);

const IntentRow = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-sm font-bold text-on-surface">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{description}</p>
    </div>
  </div>
);

function resolveKitIcon(icon: string) {
  if (icon === 'science') return Zap;
  if (icon === 'translate') return Book;
  return Brain;
}
