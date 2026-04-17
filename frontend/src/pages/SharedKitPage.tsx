import { ArrowLeft, Globe2, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';
import { SharedKitSnapshot } from '../lib/api';

export const SharedKitPage = ({
  snapshot,
  loading,
  error,
  onGetStarted,
  onGoHome,
}: {
  snapshot: SharedKitSnapshot | null;
  loading: boolean;
  error: string | null;
  onGetStarted: () => void;
  onGoHome: () => void;
}) => {
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Loading shared kit...</div>;
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-background px-6 py-16">
        <div className="max-w-3xl mx-auto rounded-[28px] bg-surface p-10 ambient-shadow border border-outline-variant/10 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Shared kit</p>
          <h1 className="text-4xl font-headline font-black tracking-tight text-on-surface mb-3">This shared kit is unavailable.</h1>
          <p className="text-on-surface-variant text-lg mb-8">
            {error ?? 'The owner may have made it private or removed it.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button onClick={onGoHome} variant="secondary" className="rounded-full px-6">
              <ArrowLeft className="w-4 h-4" />
              Back home
            </Button>
            <Button onClick={onGetStarted} className="rounded-full px-6">Open Snaplet</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary text-sm font-bold mb-4">
              <Globe2 className="w-4 h-4" />
              Public shared kit
            </div>
            <h1 className="text-5xl font-headline font-black tracking-tight text-on-surface mb-3">{snapshot.source.title}</h1>
            <p className="text-lg text-on-surface-variant">
              {snapshot.source.questionCount} questions ready to review. Sign in if you want to study this kit inside Snaplet.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={onGoHome} variant="secondary" className="rounded-full px-6">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Button>
            <Button onClick={onGetStarted} className="rounded-full px-6">
              <Sparkles className="w-4 h-4" />
              Sign in to study
            </Button>
          </div>
        </div>

        <div className="grid gap-5">
          {snapshot.questions.map((question, index) => (
            <article key={question.id} className="rounded-[24px] bg-surface p-6 ambient-shadow border border-outline-variant/10">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary mb-3">Question {index + 1}</p>
              <h2 className="text-2xl font-headline font-bold tracking-tight text-on-surface mb-4">{question.prompt}</h2>
              <div className="rounded-[18px] bg-surface-container-low p-5">
                <p className="text-on-surface-variant leading-relaxed">{question.answer}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
