import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { 
  Clock, 
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProgressData } from '../types';

export const ProgressPage = ({ progress, onRefresh }: { progress: ProgressData | null; onRefresh: () => void }) => {
  const [range, setRange] = useState<'30d' | '90d' | '1y'>('30d');
  const weak = progress?.weakQuestions ?? [];
  const totalAttempts = progress?.totals.attempts ?? 0;
  const correctAttempts = (progress?.outcomes.exact ?? 0) + (progress?.outcomes.accent_near ?? 0) + (progress?.outcomes.correct_after_retry ?? 0);
  const retention = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const velocity = progress?.totals.sessions ?? 0;
  const barSource = progress ? Object.values(progress.outcomes) : [];
  const chartBars = barSource.length > 0
    ? barSource.map((value) => Math.max(10, Math.min(100, value * 16)))
    : Array.from({ length: 7 }, () => 8);

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label="Learning Velocity" 
          value={String(velocity)} 
          unit="sessions" 
          trend="Recorded sessions" 
          icon={<Zap className="w-8 h-8 text-primary/20" />} 
        />
        <StatCard 
          label="Retention Rate" 
          value={String(retention)} 
          unit="%" 
          progress={retention} 
        />
        <StatCard 
          label="Total Focus Time" 
          value={String(progress?.totals.sessions ?? 0)} 
          unit="sessions" 
          trend="From backend session history" 
          icon={<Clock className="w-8 h-8 text-tertiary/20" />}
        />
        <StatCard 
          label="Knowledge Points" 
          value={String(progress?.totals.questions ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-xl font-bold font-headline mb-1">Learning Velocity</h2>
              <p className="text-on-surface-variant text-sm">Performance tracking ({range.toUpperCase()})</p>
            </div>
            <div className="flex bg-surface-container-highest p-1 rounded-xl">
              <button onClick={() => setRange('30d')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors", range === '30d' ? "bg-surface-bright text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface")}>30D</button>
              <button onClick={() => setRange('90d')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors", range === '90d' ? "bg-surface-bright text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface")}>90D</button>
              <button onClick={() => setRange('1y')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors", range === '1y' ? "bg-surface-bright text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface")}>1Y</button>
            </div>
          </div>
          <div className="h-64 flex items-end gap-3 px-2">
            {chartBars.map((h, i) => (
              <div key={i} className="flex-1 bg-primary/10 rounded-t-lg relative group h-full">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className="absolute inset-x-0 bottom-0 bg-glow-primary rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/5">
          <h2 className="text-xl font-bold font-headline mb-1">Focus Vulnerabilities</h2>
          <p className="text-on-surface-variant text-sm mb-8">Topics requiring immediate review</p>
          <div className="space-y-6">
            {weak.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No vulnerabilities yet. Complete a study session to populate this panel.</p>
            ) : weak.slice(0, 3).map((item) => (
              <VulnerabilityItem
                key={item.questionId}
                label={item.prompt}
                status={item.recentErrorCount > 2 ? 'Needs Review' : 'Improving'}
                color={item.recentErrorCount > 2 ? 'text-tertiary' : 'text-secondary'}
                progress={Math.max(10, 100 - Math.round(item.recentErrorCount * 20))}
              />
            ))}
          </div>
          <Button variant="outline" className="w-full mt-10 py-4" onClick={onRefresh}>
            Refresh Progress Data
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/5">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h2 className="text-xl font-bold font-headline">Recent Study Sessions</h2>
          <span className="text-on-surface-variant text-xs font-semibold">Session history preview</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-highest/30 text-on-surface-variant/50 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-4">Study Kit</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-center">Accuracy</th>
                <th className="px-8 py-4 text-center">Duration</th>
                <th className="px-8 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              <tr>
                <td className="px-8 py-8 text-sm text-on-surface-variant" colSpan={5}>
                  Session detail history is not available from the current API yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, trend, progress, icon }: any) => (
  <div className="bg-surface-container-low p-6 rounded-2xl relative overflow-hidden group hover:bg-surface-container transition-colors border border-outline-variant/5">
    <div className="relative z-10">
      <p className="text-on-surface-variant text-sm font-semibold mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-on-surface">{value}{unit && <span className="text-lg text-primary ml-1">{unit}</span>}</h3>
      {trend && <p className="mt-4 text-secondary text-sm font-bold">{trend}</p>}
      {progress !== undefined && (
        <div className="mt-4 w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
          <div className="h-full bg-glow-primary" style={{ width: `${progress}%` }}></div>
        </div>
      )}
    </div>
    {icon && <div className="absolute -bottom-4 -right-4 rotate-12 group-hover:scale-110 transition-transform">{icon}</div>}
  </div>
);

const VulnerabilityItem = ({ label, status, color, progress }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm font-semibold">
      <span className="text-on-surface">{label}</span>
      <span className={color}>{status}</span>
    </div>
    <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full", color.replace('text-', 'bg-'))} style={{ width: `${progress}%` }}></div>
    </div>
  </div>
);
