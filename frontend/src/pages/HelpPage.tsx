import { Button } from '../components/Button';
import { BookOpen, CircleHelp, Flame, LifeBuoy, MessageSquareWarning, Wrench } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { HELP_FAQS, HELP_QUICK_FIXES, HELP_STREAK_GUIDE, HELP_TASKS } from '../../shared/help-center';

export const HelpPage = ({
  onCreateKit,
  onGoDashboard,
  focusTopic,
}: {
  onCreateKit: () => void;
  onGoDashboard: () => void;
  focusTopic?: string | null;
}) => {
  const streakGuideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusTopic === 'streaks') {
      streakGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusTopic]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="space-y-3 px-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Support</p>
        <h1 className="text-4xl font-headline font-black tracking-tight text-on-surface">Help Center</h1>
        <p className="text-on-surface-variant text-lg">
          Pick a task, fix the block, and get back to studying.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_TASKS.map((task) => (
          <div key={task.id}>
            <TaskCard
              icon={iconForTask(task.icon)}
              eyebrow={task.eyebrow}
              title={task.title}
              description={task.description}
              bullets={[...task.bullets]}
              cta={task.cta}
              onClick={() => {
                if (task.id === 'create-kit') {
                  onCreateKit();
                  return;
                }
                if (task.id === 'recover-session') {
                  onGoDashboard();
                  return;
                }
                if (task.id === 'streaks') {
                  streakGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  return;
                }
                window.location.href = 'mailto:support@snaplet.app?subject=Snaplet%20Support%20Request';
              }}
              highlighted={focusTopic === 'streaks' && task.id === 'streaks'}
            />
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section
          ref={streakGuideRef}
          className={[
            'rounded-[28px] border border-outline-variant/20 bg-surface p-7 transition-all',
            focusTopic === 'streaks' ? 'ring-2 ring-primary/25 shadow-[0_20px_50px_rgba(66,85,255,0.08)]' : '',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 mb-5">
            <Flame className="text-primary w-5 h-5" />
            <h2 className="text-2xl font-headline font-bold text-on-surface">Streaks, clearly</h2>
          </div>

          <div className="space-y-4">
            {HELP_STREAK_GUIDE.map((item) => (
              <div key={item.title}>
                <SupportRow title={item.title} body={item.body} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-outline-variant/20 bg-surface p-7">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquareWarning className="text-tertiary w-5 h-5" />
            <h2 className="text-2xl font-headline font-bold text-on-surface">Quick fixes</h2>
          </div>
          <div className="space-y-4">
            {HELP_QUICK_FIXES.map((item) => (
              <div key={item.title}>
                <SupportRow title={item.title} body={item.body} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-outline-variant/20 bg-surface p-7">
        <div className="flex items-center gap-2 mb-5">
          <CircleHelp className="text-primary w-5 h-5" />
          <h2 className="text-2xl font-headline font-bold text-on-surface">Frequently asked</h2>
        </div>
        <div className="grid gap-3">
          {HELP_FAQS.map((item) => (
            <div key={item.question}>
              <FaqItem question={item.question} answer={item.answer} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

function iconForTask(icon: (typeof HELP_TASKS)[number]['icon']) {
  if (icon === 'book') {
    return <BookOpen className="w-5 h-5" />;
  }
  if (icon === 'wrench') {
    return <Wrench className="w-5 h-5" />;
  }
  if (icon === 'flame') {
    return <Flame className="w-5 h-5" />;
  }
  return <LifeBuoy className="w-5 h-5" />;
}

const TaskCard = ({
  icon,
  eyebrow,
  title,
  description,
  bullets,
  cta,
  onClick,
  highlighted = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  onClick: () => void;
  highlighted?: boolean;
}) => (
  <div className={[
    'rounded-[28px] border p-6 flex flex-col gap-4',
    highlighted ? 'border-primary/30 bg-primary/8' : 'border-outline-variant/20 bg-surface',
  ].join(' ')}>
    <div className="flex items-start justify-between gap-4">
      <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">{icon}</div>
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant/70">{eyebrow}</span>
    </div>
    <div>
      <h3 className="text-xl font-headline font-bold text-on-surface">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{description}</p>
    </div>
    <ul className="space-y-2 text-sm text-on-surface-variant">
      {bullets.map((bullet) => (
        <li key={bullet} className="flex items-start gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
    <div className="pt-1">
      <Button size="sm" onClick={onClick}>{cta}</Button>
    </div>
  </div>
);

const FaqItem = ({ question, answer }: { question: string; answer: string }) => (
  <div className="rounded-[22px] border border-outline-variant/16 bg-surface-container-low px-5 py-4">
    <h3 className="text-on-surface font-bold mb-1">{question}</h3>
    <p className="text-on-surface-variant text-sm leading-relaxed">{answer}</p>
  </div>
);

const SupportRow = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-[22px] bg-surface-container-low px-5 py-4">
    <h3 className="text-on-surface font-bold mb-1">{title}</h3>
    <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
  </div>
);
