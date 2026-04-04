import { Button } from '../components/Button';
import { BookOpen, CircleHelp, LifeBuoy, MessageSquareWarning, Wrench } from 'lucide-react';
import React from 'react';

export const HelpPage = ({ onCreateKit, onGoDashboard }: { onCreateKit: () => void; onGoDashboard: () => void }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-headline font-black tracking-tight text-on-surface">Help Center</h1>
        <p className="text-on-surface-variant text-lg">
          Quick fixes and usage guidance for kits, sessions, and sign-in.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ActionCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Create a New Kit"
          description="Paste notes or upload content to generate a study kit."
          cta="Open Creator"
          onClick={onCreateKit}
        />
        <ActionCard
          icon={<Wrench className="w-5 h-5" />}
          title="Reset Stuck Session"
          description="If session startup fails, return to Dashboard and start again."
          cta="Go to Dashboard"
          onClick={onGoDashboard}
        />
        <ActionCard
          icon={<LifeBuoy className="w-5 h-5" />}
          title="Contact Support"
          description="Send us a message with what happened and what you expected."
          cta="Email Support"
          onClick={() => {
            window.location.href = 'mailto:support@nimble.app?subject=Nimble%20Support%20Request';
          }}
        />
      </section>

      <section className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10">
        <div className="flex items-center gap-2 mb-6">
          <CircleHelp className="text-primary w-5 h-5" />
          <h2 className="text-2xl font-headline font-bold text-on-surface">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-5">
          <FaqItem
            question="Why is my kit empty?"
            answer="A kit can appear empty if extraction or generation failed. Re-open the kit and check statuses, then regenerate from cleaner source text."
          />
          <FaqItem
            question="Why do I see retries in sessions?"
            answer="Retries happen on near-miss answers. The session engine gives you one quick correction chance before marking final correctness."
          />
          <FaqItem
            question="How does auto-review kit generation work?"
            answer="When repeated mistakes accumulate in a topic, Nimble creates a separate auto-review kit for that topic. Topics do not mix."
          />
        </div>
      </section>

      <section className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquareWarning className="text-tertiary w-5 h-5" />
          <h2 className="text-2xl font-headline font-bold text-on-surface">Troubleshooting Checklist</h2>
        </div>
        <ul className="space-y-3 text-on-surface-variant">
          <li>1. Confirm you are signed in (top-right menu).</li>
          <li>2. Refresh if data looks stale after an action.</li>
          <li>3. If kit generation fails, shorten or clean the input source.</li>
          <li>4. If authentication fails, retry with email and password.</li>
        </ul>
      </section>
    </div>
  );
};

const ActionCard = ({
  icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) => (
  <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 flex flex-col gap-4">
    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">{icon}</div>
    <h3 className="text-xl font-headline font-bold text-on-surface">{title}</h3>
    <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
    <div className="pt-2">
      <Button size="sm" onClick={onClick}>{cta}</Button>
    </div>
  </div>
);

const FaqItem = ({ question, answer }: { question: string; answer: string }) => (
  <div className="rounded-xl bg-surface-container p-5 border border-outline-variant/10">
    <h3 className="text-on-surface font-bold mb-2">{question}</h3>
    <p className="text-on-surface-variant text-sm leading-relaxed">{answer}</p>
  </div>
);
