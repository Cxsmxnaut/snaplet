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
  const recommendationSummary = condenseSummary(progress.recommendations.summary);
  if (!hasHistory) {
    return (
    <div className="knowt-page-shell space-y-8">
        <header className="px-1 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Progress</p>
            <h1 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-on-surface">
              No study signal yet
            </h1>
          </div>
          <Button variant="outline" className="rounded-full self-start md:self-auto shrink-0" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </header>

        {error ? (
          <div className="rounded-[22px] bg-tertiary/12 px-5 py-4 text-sm text-on-surface flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>Couldn&apos;t refresh progress: {error}</span>
            <Button variant="outline" className="rounded-full shrink-0" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
              Retry
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
    <div className="knowt-page-shell space-y-6">
      <header className="px-1 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Progress</p>
          <h1 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-on-surface">
            Progress at a glance
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="rounded-full px-5" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="rounded-full px-5" onClick={primaryAction}>
            {progress.recommendations.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-[22px] bg-tertiary/12 px-5 py-4 text-sm text-on-surface flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>Showing the latest successful load: {error}</span>
          <Button variant="outline" className="rounded-full shrink-0" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      ) : null}

      <section className="knowt-panel px-6 py-6 md:px-8 md:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-container/55 px-4 py-2 text-sm font-bold text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              Study coach
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tight text-on-surface mb-2">
              {progress.recommendations.headline}
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
              {recommendationSummary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            {heroMetrics.map((metric) => (
              <HeroMetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="knowt-panel px-6 py-6 md:px-8 md:py-7">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Trend</p>
              <h2 className="text-2xl font-headline font-black text-on-surface">Learning momentum</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant/60 mb-1">Vs prior week</p>
              <p className={cn('text-lg font-headline font-black', deltaClass(progress.comparisons.deltas.retention))}>
                {formatDelta(progress.comparisons.deltas.retention)} retention
              </p>
            </div>
          </div>

          <TrendChart data={progress.timeSeries} />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CompactComparison label="Attempt volume" current={progress.comparisons.current.attempts} previous={progress.comparisons.previous.attempts} delta={progress.comparisons.deltas.attempts} />
            <CompactComparison label="Session count" current={progress.comparisons.current.sessions} previous={progress.comparisons.previous.sessions} delta={progress.comparisons.deltas.sessions} />
            <CompactComparison label="Retention rate" current={progress.comparisons.current.retention} previous={progress.comparisons.previous.retention} delta={progress.comparisons.deltas.retention} unit="%" />
          </div>
        </section>

        <section className="knowt-panel px-6 py-6 md:px-8 md:py-7">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Focus</p>
            <h2 className="text-2xl font-headline font-black text-on-surface">Needs another pass</h2>
          </div>

          <div className="space-y-3">
            {progress.weakQuestions.length === 0 ? (
              <div className="rounded-[22px] bg-surface-container-low px-5 py-5">
                <p className="text-on-surface font-bold">No active weak spots right now.</p>
              </div>
            ) : (
              progress.weakQuestions.slice(0, 4).map((item) => (
                <WeakFocusRow key={item.questionId} item={item} />
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-6">
        <section className="knowt-panel overflow-hidden">
          <div className="px-6 py-5 md:px-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Sessions</p>
              <h2 className="text-2xl font-headline font-black text-on-surface">Recent runs</h2>
            </div>
            <span className="text-sm text-on-surface-variant">{progress.recentSessions.length} sessions</span>
          </div>

          {progress.recentSessions.length === 0 ? (
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              <div className="rounded-[22px] bg-surface-container-low px-5 py-5">
                <p className="text-on-surface font-bold">Completed sessions will show up here.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 border-y border-outline-variant/20">
                    <th className="px-6 py-4 md:px-8">Study kit</th>
                    <th className="px-4 py-4 md:px-6">Mode</th>
                    <th className="px-4 py-4 md:px-6 text-center">Accuracy</th>
                    <th className="px-4 py-4 md:px-6 text-center">Attempts</th>
                    <th className="px-4 py-4 md:px-6 text-center">Duration</th>
                    <th className="px-6 py-4 md:px-8 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.recentSessions.map((session) => (
                    <tr key={session.sessionId} className="border-b border-outline-variant/12 last:border-b-0">
                      <td className="px-6 py-4 md:px-8">
                        <div>
                          <p className="font-bold text-on-surface">{session.sourceTitle}</p>
                          <p className="text-sm text-on-surface-variant">{session.correctCount} correct / {session.incorrectCount} missed</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 md:px-6 text-sm font-semibold text-on-surface-variant">{modeLabel(session.mode)}</td>
                      <td className="px-4 py-4 md:px-6 text-center">
                        <span className={cn('inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-sm font-bold', accuracyBadgeClass(session.accuracy))}>
                          {session.accuracy}%
                        </span>
                      </td>
                      <td className="px-4 py-4 md:px-6 text-center text-sm font-semibold text-on-surface">{session.attemptCount}</td>
                      <td className="px-4 py-4 md:px-6 text-center text-sm text-on-surface-variant">{formatDuration(session.durationSeconds)}</td>
                      <td className="px-6 py-4 md:px-8 text-right text-sm text-on-surface-variant">{relativeDate(session.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="knowt-panel px-6 py-6 md:px-8 md:py-7">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Kit ranking</p>
            <h2 className="text-2xl font-headline font-black text-on-surface">Highest opportunity kits</h2>
          </div>

          <div className="space-y-3">
            {progress.kitBreakdown.length === 0 ? (
              <div className="rounded-[22px] bg-surface-container-low px-5 py-5">
                <p className="text-on-surface font-bold">Kit performance will show up here soon.</p>
              </div>
            ) : (
              progress.kitBreakdown.slice(0, 5).map((kit, index) => (
                <KitBreakdownRow key={kit.sourceId} kit={kit} index={index} />
              ))
            )}
          </div>
        </section>
      </div>
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
    <div className="rounded-[20px] bg-surface-container-low px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70 mb-1">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <span className="text-2xl font-headline font-black text-on-surface">{value}</span>
        <span className={cn('text-xs font-bold', toneAccent(tone), deltaClass(delta))}>{formatDelta(delta)}</span>
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
  const maxAccuracy = Math.max(...data.map((item) => item.accuracy), 100);
  const width = 760;
  const height = 220;
  const paddingX = 18;
  const paddingTop = 18;
  const paddingBottom = 26;
  const chartHeight = height - paddingTop - paddingBottom;
  const usableWidth = width - paddingX * 2;
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : usableWidth;

  const attemptPoints = data.map((point, index) => ({
    x: paddingX + index * stepX,
    y: paddingTop + chartHeight - (point.attempts / maxAttempts) * chartHeight,
  }));

  const accuracyPoints = data.map((point, index) => ({
    x: paddingX + index * stepX,
    y: paddingTop + chartHeight - (point.accuracy / maxAccuracy) * chartHeight,
  }));

  const attemptsLinePath = buildSmoothPath(attemptPoints);
  const attemptsAreaPath = buildAreaPath(attemptPoints, height - paddingBottom);
  const accuracyLinePath = buildSmoothPath(accuracyPoints);
  const gridLines = [0.25, 0.5, 0.75].map((ratio) => paddingTop + chartHeight * ratio);

  return (
    <div className="rounded-[24px] bg-surface-container-low px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            Attempts
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full bg-secondary" />
            Accuracy
          </span>
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70">
          Last {data.length} days
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[240px]" aria-hidden>
          <defs>
            <linearGradient id="attempts-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" className="text-primary" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" className="text-primary" />
            </linearGradient>
          </defs>

          {gridLines.map((y) => (
            <line
              key={y}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              className="text-outline-variant/20"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          ))}

          <motion.path
            d={attemptsAreaPath}
            fill="url(#attempts-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />

          <motion.path
            d={attemptsLinePath}
            fill="none"
            className="text-primary"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />

          <motion.path
            d={accuracyLinePath}
            fill="none"
            className="text-secondary"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 0.95 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.08 }}
          />

          {accuracyPoints.map((point, index) => (
            <motion.circle
              key={data[index]?.date}
              cx={point.x}
              cy={point.y}
              r="4.5"
              className="text-secondary"
              fill="currentColor"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.12 + index * 0.03 }}
            />
          ))}
        </svg>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {data.map((point) => (
            <div key={point.date} className="text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant/75">{point.label}</div>
              <div className="text-[11px] text-on-surface-variant mt-1">{point.accuracy}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CompactComparison = ({
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
  <div className="rounded-[20px] bg-surface-container-low px-4 py-4">
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70 mb-2">{label}</p>
    <div className="flex items-end justify-between gap-3">
      <p className="text-lg font-headline font-black text-on-surface">
        {current}
        {unit}
      </p>
      <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
        Prev {previous}
        {unit}
      </p>
    </div>
    <p className={cn('mt-2 text-xs font-bold uppercase tracking-[0.12em]', deltaClass(delta))}>
      {formatDelta(delta)}
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
    ? 'Repeated misses'
    : item.nearMissCount >= 2
      ? 'Near misses'
      : 'Needs one more pass';

  return (
    <div className="rounded-[22px] bg-surface-container-low px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-sm font-bold text-on-surface leading-snug">{item.prompt}</p>
          <p className="text-xs text-on-surface-variant mt-1">{item.sourceTitle ?? 'Study kit'} · {summary}</p>
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
    <div className="rounded-[22px] bg-surface-container-low px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-9 w-9 rounded-full bg-primary-container/60 flex items-center justify-center text-sm font-black text-primary shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface">{kit.sourceTitle}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {kit.attempts} attempts · {kit.sessionCount} sessions · last active {kit.lastStudiedAt ? relativeDate(kit.lastStudiedAt) : 'recently'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MiniMetric icon={<Target className="w-3.5 h-3.5" />} label={`${kit.accuracy}%`} />
          <MiniMetric icon={<ChartSpline className="w-3.5 h-3.5" />} label={`${kit.mastery}%`} />
          <MiniMetric icon={<Clock3 className="w-3.5 h-3.5" />} label={kit.weakPressure.toFixed(1)} />
          <span className={cn('text-xs font-black', deltaClass(kit.masteryDelta))}>{formatDelta(kit.masteryDelta)}</span>
        </div>
      </div>
    </div>
  );
}

const MiniMetric = ({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) => (
  <div className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-bold text-on-surface">
    <span className="text-on-surface-variant">{icon}</span>
    <span>{label}</span>
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
      <p className="text-base text-on-surface-variant leading-relaxed mb-8">
        {hasSources
          ? 'Complete one real session and this page starts filling in.'
          : 'Create a kit, answer a few prompts, and the signal appears here.'}
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
    <p className="text-base text-on-surface-variant leading-relaxed mb-8">{error}</p>
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

function condenseSummary(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) {
    return 'Open the next best study move.';
  }

  const firstSentence = trimmed.match(/.*?[.!?](\s|$)/)?.[0]?.trim() ?? trimmed;
  return firstSentence.length <= 120 ? firstSentence : `${firstSentence.slice(0, 117).trimEnd()}...`;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;

  for (let index = 0; index < rest.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number): string {
  if (points.length === 0) return '';
  const linePath = buildSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
