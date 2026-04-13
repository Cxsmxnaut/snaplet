import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChartSpline, Clock3, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Button } from '../components/Button';
import { StudyMode } from '../lib/api';
import { cn } from '../lib/utils';
import { ProgressData } from '../types';

type ProgressPageProps = {
  progress: ProgressData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCreateKit: () => void;
  onOpenKits: () => void;
  onReviewWeakKit: (sourceId: string | null, mode: StudyMode | null) => void;
};

export const ProgressPage = ({
  progress,
  loading,
  error,
  onRefresh,
  onCreateKit,
  onOpenKits,
  onReviewWeakKit,
}: ProgressPageProps) => {
  if (loading && !progress) {
    return <ProgressLoadingState />;
  }

  if (error && !progress) {
    return <ProgressErrorState error={error} onRefresh={onRefresh} />;
  }

  if (!progress) {
    return <ProgressEmptyState onCreateKit={onCreateKit} onOpenKits={onOpenKits} hasSources={false} />;
  }

  const hasHistory = progress.totals.attempts > 0;
  if (!hasHistory) {
    return (
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Progress</p>
          <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-on-surface">
            Understand what is sticking and what needs another pass
          </h1>
          <p className="mt-3 text-on-surface-variant text-lg leading-relaxed max-w-3xl">
            A calmer overview of your learning rhythm, retention trends, and the kits that deserve your next session.
          </p>
        </header>

        {error ? (
          <div className="rounded-[22px] bg-tertiary/12 px-5 py-4 text-sm text-on-surface flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>Progress could not refresh right now: {error}</span>
            <Button variant="outline" className="rounded-full shrink-0" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        ) : null}

        <ProgressEmptyState onCreateKit={onCreateKit} onOpenKits={onOpenKits} hasSources={progress.totals.sources > 0} />
      </div>
    );
  }

  const heroMetrics = [
    {
      label: 'Retention',
      value: `${progress.comparisons.current.retention}%`,
      delta: progress.comparisons.deltas.retention,
      tone: 'primary',
    },
    {
      label: 'Attempts this week',
      value: String(progress.comparisons.current.attempts),
      delta: progress.comparisons.deltas.attempts,
      tone: 'secondary',
    },
    {
      label: 'Sessions this week',
      value: String(progress.comparisons.current.sessions),
      delta: progress.comparisons.deltas.sessions,
      tone: 'tertiary',
    },
  ] as const;

  const primaryAction = () => {
    if (progress.recommendations.actionType === 'create_kit') {
      onCreateKit();
      return;
    }
    if (progress.recommendations.actionType === 'open_kits') {
      onOpenKits();
      return;
    }
    onReviewWeakKit(progress.recommendations.sourceId, progress.recommendations.mode);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <header className="px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Progress</p>
        <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-on-surface">
          Understand what is sticking and what needs another pass
        </h1>
        <p className="mt-3 text-on-surface-variant text-lg leading-relaxed max-w-3xl">
          A calmer overview of your learning rhythm, retention trends, and the kits that deserve your next session.
        </p>
      </header>

      {error ? (
        <div className="rounded-[22px] bg-tertiary/12 px-5 py-4 text-sm text-on-surface flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>Progress data is showing cached information because the latest refresh failed: {error}</span>
          <Button variant="outline" className="rounded-full shrink-0" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </div>
      ) : null}

      <>
          <section className="rounded-[32px] bg-surface overflow-hidden">
            <div className="grid lg:grid-cols-[1.25fr_0.95fr]">
              <div className="px-8 py-8 md:px-10 md:py-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-container/55 px-4 py-2 text-sm font-bold text-primary mb-6">
                  <Sparkles className="w-4 h-4" />
                  Study coach
                </div>
                <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-on-surface mb-4">
                  {progress.recommendations.headline}
                </h2>
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-8">
                  {progress.recommendations.summary}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="rounded-full px-6" onClick={primaryAction}>
                    {progress.recommendations.actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="rounded-full px-6" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4" />
                    Refresh insights
                  </Button>
                </div>
              </div>

              <div className="bg-surface-container-low px-8 py-8 md:px-10 md:py-10">
                <div className="grid gap-4">
                  {heroMetrics.map((metric) => (
                    <HeroMetricCard key={metric.label} {...metric} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-7 rounded-[28px] bg-surface px-8 py-8">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Trend</p>
                  <h2 className="text-2xl font-headline font-black text-on-surface">Learning momentum</h2>
                  <p className="text-sm text-on-surface-variant mt-2">Last 14 days of attempts, sessions, and rolling retention.</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-1">Compared with prior week</p>
                  <p className={cn('text-xl font-headline font-black', deltaClass(progress.comparisons.deltas.retention))}>
                    {formatDelta(progress.comparisons.deltas.retention)} retention
                  </p>
                </div>
              </div>

              <TrendChart data={progress.timeSeries} />

              <div className="mt-8 grid sm:grid-cols-3 gap-4">
                <ComparisonCard label="Attempt volume" current={progress.comparisons.current.attempts} previous={progress.comparisons.previous.attempts} delta={progress.comparisons.deltas.attempts} />
                <ComparisonCard label="Session count" current={progress.comparisons.current.sessions} previous={progress.comparisons.previous.sessions} delta={progress.comparisons.deltas.sessions} />
                <ComparisonCard label="Retention rate" current={progress.comparisons.current.retention} previous={progress.comparisons.previous.retention} delta={progress.comparisons.deltas.retention} unit="%" />
              </div>
            </section>

            <section className="lg:col-span-5 rounded-[28px] bg-surface px-8 py-8">
              <div className="mb-8">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Focus</p>
                <h2 className="text-2xl font-headline font-black text-on-surface">What is slipping</h2>
                <p className="text-sm text-on-surface-variant mt-2">The prompts below have the highest recent error pressure or repeat near-misses.</p>
              </div>

              <div className="space-y-4">
                {progress.weakQuestions.length === 0 ? (
                  <div className="rounded-[24px] bg-surface-container-low px-5 py-6">
                    <p className="text-on-surface font-bold mb-2">No active weak spots right now.</p>
                    <p className="text-sm text-on-surface-variant">Keep studying to maintain the signal or open a kit for another pass.</p>
                  </div>
                ) : (
                  progress.weakQuestions.slice(0, 4).map((item) => (
                    <WeakFocusRow key={item.questionId} item={item} />
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
            <section className="rounded-[28px] bg-surface overflow-hidden">
              <div className="px-8 py-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Sessions</p>
                  <h2 className="text-2xl font-headline font-black text-on-surface">Recent study sessions</h2>
                </div>
                <span className="text-sm text-on-surface-variant">{progress.recentSessions.length} recent runs</span>
              </div>

              {progress.recentSessions.length === 0 ? (
                <div className="px-8 pb-8">
                  <div className="rounded-[24px] bg-surface-container-low px-5 py-6">
                    <p className="text-on-surface font-bold mb-2">Completed sessions will show up here.</p>
                    <p className="text-sm text-on-surface-variant">Once you finish a run, Snaplet will keep a table of recent outcomes, modes, and durations.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 border-y border-outline-variant/20">
                        <th className="px-8 py-4">Study kit</th>
                        <th className="px-6 py-4">Mode</th>
                        <th className="px-6 py-4 text-center">Accuracy</th>
                        <th className="px-6 py-4 text-center">Attempts</th>
                        <th className="px-6 py-4 text-center">Duration</th>
                        <th className="px-8 py-4 text-right">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progress.recentSessions.map((session) => (
                      <tr key={session.sessionId} className="border-b border-outline-variant/12 last:border-b-0">
                        <td className="px-8 py-5">
                          <div>
                            <p className="font-bold text-on-surface">{session.sourceTitle}</p>
                            <p className="text-sm text-on-surface-variant">{session.correctCount} correct / {session.incorrectCount} missed</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-on-surface-variant">{modeLabel(session.mode)}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={cn('inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-sm font-bold', accuracyBadgeClass(session.accuracy))}>
                            {session.accuracy}%
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center text-sm font-semibold text-on-surface">{session.attemptCount}</td>
                        <td className="px-6 py-5 text-center text-sm text-on-surface-variant">{formatDuration(session.durationSeconds)}</td>
                        <td className="px-8 py-5 text-right text-sm text-on-surface-variant">{relativeDate(session.completedAt)}</td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-[28px] bg-surface px-8 py-8">
              <div className="mb-8">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Kit ranking</p>
                <h2 className="text-2xl font-headline font-black text-on-surface">Highest opportunity kits</h2>
                <p className="text-sm text-on-surface-variant mt-2">Ranked by weak-pressure, retained accuracy, and recent study volume.</p>
              </div>

              <div className="space-y-4">
                {progress.kitBreakdown.length === 0 ? (
                  <div className="rounded-[24px] bg-surface-container-low px-5 py-6">
                    <p className="text-on-surface font-bold mb-2">Kit performance will show up here soon.</p>
                    <p className="text-sm text-on-surface-variant">Complete a few runs and Snaplet will rank where the biggest gains are hiding.</p>
                  </div>
                ) : (
                  progress.kitBreakdown.slice(0, 5).map((kit, index) => (
                    <KitBreakdownRow key={kit.sourceId} kit={kit} index={index} />
                  ))
                )}
              </div>
            </section>
          </div>
      </>
    </div>
  );
};

interface HeroMetricCardProps {
  key?: string;
  label: string;
  value: string;
  delta: number;
  tone: 'primary' | 'secondary' | 'tertiary';
}

function HeroMetricCard({ label, value, delta, tone }: HeroMetricCardProps) {
  return (
    <div className="rounded-[24px] bg-surface px-5 py-5">
      <p className="text-sm font-semibold text-on-surface-variant mb-2">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <span className="text-3xl font-headline font-black text-on-surface">{value}</span>
        <span className={cn('text-sm font-bold', toneAccent(tone), deltaClass(delta))}>{formatDelta(delta)}</span>
      </div>
    </div>
  );
}

const TrendChart = ({
  data,
}: {
  data: ProgressData['timeSeries'];
}) => {
  const maxAttempts = Math.max(...data.map((item) => item.attempts), 1);

  return (
    <div className="rounded-[24px] bg-surface-container-low px-5 py-6">
      <div className="h-72 flex items-end gap-3">
        {data.map((point) => {
          const height = Math.max(12, (point.attempts / maxAttempts) * 100);
          return (
            <div key={point.date} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
              <div className="text-[11px] font-bold text-on-surface-variant">{point.accuracy}%</div>
              <div className="relative w-full flex-1 flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  className="w-full rounded-t-[16px] bg-gradient-to-t from-primary to-primary-container"
                />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/75">{point.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ComparisonCard = ({
  label,
  current,
  previous,
  delta,
  unit = '',
}: {
  label: string;
  current: number;
  previous: number;
  delta: number;
  unit?: string;
}) => (
  <div className="rounded-[22px] bg-surface-container-low px-5 py-5">
    <p className="text-sm font-semibold text-on-surface-variant mb-2">{label}</p>
    <p className="text-2xl font-headline font-black text-on-surface mb-2">
      {current}
      {unit}
    </p>
    <p className="text-sm text-on-surface-variant">
      Previously {previous}
      {unit} · <span className={cn('font-bold', deltaClass(delta))}>{formatDelta(delta)}</span>
    </p>
  </div>
);

interface WeakFocusRowProps {
  key?: string;
  item: ProgressData['weakQuestions'][number];
}

function WeakFocusRow({ item }: WeakFocusRowProps) {
  const severity = item.recentErrorCount >= 2 ? 'Critical' : item.nearMissCount >= 2 ? 'Watchlist' : 'Recovering';
  const bar = Math.min(100, Math.round(item.recentErrorCount * 28 + item.nearMissCount * 14 + 18));
  const summary = item.recentErrorCount >= 2
    ? 'Repeated misses are piling up here.'
    : item.nearMissCount >= 2
      ? 'You are close, but still missing the exact retrieval.'
      : 'This prompt still needs another clean pass.';

  return (
    <div className="rounded-[24px] bg-surface-container-low px-5 py-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-base font-bold text-on-surface leading-snug">{item.prompt}</p>
          <p className="text-sm text-on-surface-variant mt-1">{item.sourceTitle ?? 'Study kit'} · {summary}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em]', severityBadgeClass(severity))}>
          {severity}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-tertiary to-primary" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}

interface KitBreakdownRowProps {
  key?: string;
  kit: ProgressData['kitBreakdown'][number];
  index: number;
}

function KitBreakdownRow({ kit, index }: KitBreakdownRowProps) {
  return (
    <div className="rounded-[24px] bg-surface-container-low px-5 py-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-full bg-primary-container/60 flex items-center justify-center text-sm font-black text-primary shrink-0">
            {index + 1}
          </div>
          <div>
            <p className="font-bold text-on-surface">{kit.sourceTitle}</p>
            <p className="text-sm text-on-surface-variant mt-1">
              {kit.attempts} attempts · {kit.sessionCount} sessions · last active {kit.lastStudiedAt ? relativeDate(kit.lastStudiedAt) : 'recently'}
            </p>
          </div>
        </div>
        <span className={cn('text-sm font-black', deltaClass(kit.masteryDelta))}>{formatDelta(kit.masteryDelta)}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <MetricPill icon={<Target className="w-4 h-4" />} label="Accuracy" value={`${kit.accuracy}%`} />
        <MetricPill icon={<ChartSpline className="w-4 h-4" />} label="Mastery" value={`${kit.mastery}%`} />
        <MetricPill icon={<Clock3 className="w-4 h-4" />} label="Pressure" value={kit.weakPressure.toFixed(1)} />
      </div>
    </div>
  );
}

const MetricPill = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-[18px] bg-surface px-4 py-3">
    <div className="flex items-center gap-2 text-on-surface-variant mb-1">
      {icon}
      <span className="text-xs font-bold uppercase tracking-[0.12em]">{label}</span>
    </div>
    <p className="text-lg font-headline font-black text-on-surface">{value}</p>
  </div>
);

const ProgressEmptyState = ({
  onCreateKit,
  onOpenKits,
  hasSources,
}: {
  onCreateKit: () => void;
  onOpenKits: () => void;
  hasSources: boolean;
}) => (
  <section className="rounded-[32px] bg-surface px-8 py-10 md:px-10 md:py-12">
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">No progress signal yet</p>
      <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-on-surface mb-4">
        {hasSources ? 'Run a study session to unlock coaching and trend data' : 'Create a study kit to start building your progress signal'}
      </h2>
      <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
        {hasSources
          ? 'You already have study material in Snaplet. Complete a real session and this page will begin surfacing retention, weak spots, and per-kit momentum.'
          : 'Once you create your first kit and start answering questions, this page will show retention, session momentum, weak-question pressure, and where to focus next.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="rounded-full px-6" onClick={hasSources ? onOpenKits : onCreateKit}>
          {hasSources ? 'Open study kits' : 'Create your first kit'}
        </Button>
        <Button variant="outline" className="rounded-full px-6" onClick={hasSources ? onCreateKit : onOpenKits}>
          {hasSources ? 'Create another kit' : 'Browse your workspace'}
        </Button>
      </div>
    </div>
  </section>
);

const ProgressErrorState = ({
  error,
  onRefresh,
}: {
  error: string;
  onRefresh: () => void;
}) => (
  <section className="rounded-[32px] bg-surface px-8 py-10 md:px-10 md:py-12">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Progress unavailable</p>
    <h2 className="text-3xl font-headline font-black tracking-tight text-on-surface mb-4">We couldn&apos;t load your progress right now</h2>
    <p className="text-lg text-on-surface-variant leading-relaxed mb-8">{error}</p>
    <Button className="rounded-full px-6" onClick={onRefresh}>
      <RefreshCw className="w-4 h-4" />
      Retry
    </Button>
  </section>
);

const ProgressLoadingState = () => (
  <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
    <div className="space-y-3">
      <div className="h-4 w-24 rounded-full bg-surface-container-high" />
      <div className="h-12 w-[32rem] max-w-full rounded-2xl bg-surface-container-high" />
      <div className="h-5 w-[28rem] max-w-full rounded-full bg-surface-container-low" />
    </div>
    <div className="rounded-[32px] bg-surface px-8 py-10">
      <div className="grid lg:grid-cols-[1.25fr_0.95fr] gap-8">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-full bg-surface-container-high" />
          <div className="h-14 w-5/6 rounded-2xl bg-surface-container-high" />
          <div className="h-5 w-full rounded-full bg-surface-container-low" />
          <div className="h-5 w-3/4 rounded-full bg-surface-container-low" />
        </div>
        <div className="grid gap-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 rounded-[24px] bg-surface-container-low" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

function deltaClass(value: number): string {
  if (value > 0) return 'text-secondary';
  if (value < 0) return 'text-tertiary';
  return 'text-on-surface-variant';
}

function toneAccent(tone: 'primary' | 'secondary' | 'tertiary'): string {
  if (tone === 'secondary') return 'text-secondary';
  if (tone === 'tertiary') return 'text-tertiary';
  return 'text-primary';
}

function severityBadgeClass(severity: string): string {
  if (severity === 'Critical') return 'bg-tertiary/18 text-on-surface';
  if (severity === 'Watchlist') return 'bg-primary-container/60 text-primary';
  return 'bg-secondary-container text-on-secondary-container';
}

function accuracyBadgeClass(accuracy: number): string {
  if (accuracy >= 85) return 'bg-secondary-container text-on-secondary-container';
  if (accuracy >= 65) return 'bg-primary-container/60 text-primary';
  return 'bg-tertiary/18 text-on-surface';
}

function modeLabel(mode: StudyMode): string {
  if (mode === 'weak_review') return 'Weak Review';
  if (mode === 'fast_drill') return 'Fast Drill';
  if (mode === 'focus') return 'Focus';
  return 'Standard';
}

function formatDuration(durationSeconds: number): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes}m`;
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
