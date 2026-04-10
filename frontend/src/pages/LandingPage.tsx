import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';

export const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [previewAnswer, setPreviewAnswer] = useState('');
  const [previewResult, setPreviewResult] = useState<null | 'correct' | 'incorrect'>(null);

  const evaluatePreviewAnswer = () => {
    const normalized = previewAnswer.trim().toLowerCase().replace(/[.!?,]/g, '');
    const accepted = new Set([
      '7',
      'seven',
      'there are 7',
      'there are seven',
      'it is 7',
      'it is seven',
      'a rainbow has 7 colors',
      'a rainbow has seven colors',
    ]);

    setPreviewResult(accepted.has(normalized) ? 'correct' : 'incorrect');
  };

  const scrollToFeatures = () => {
    document.getElementById('landing-features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 bg-surface/95 backdrop-blur-md flex justify-between items-center px-5 sm:px-6 lg:px-8 h-14 border-b border-outline-variant/10">
        <div className="flex items-center min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-on-primary font-black text-sm">S</div>
            <span className="text-2xl font-black text-primary tracking-tighter font-headline">Snaplet</span>
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <button onClick={onGetStarted} className="h-10 px-5 rounded-full gradient-primary text-on-primary text-sm font-bold">Log in</button>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 lg:px-10 max-w-7xl mx-auto">
        <section className="flex flex-col items-center text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6 items-center"
          >
            <h1 className="text-5xl md:text-7xl max-w-4xl font-black font-headline text-on-surface tracking-tight leading-[1.05]">
              Build a study system that actually sticks.
            </h1>
            <p className="text-on-surface-variant text-lg md:text-2xl max-w-3xl leading-relaxed">
              Turn notes, readings, and raw source material into study kits, review AI-generated
              questions, and run focused sessions that surface what still needs work.
            </p>
            <Button size="lg" onClick={onGetStarted} className="rounded-full px-10">Start studying free</Button>
            <button onClick={scrollToFeatures} className="text-primary font-semibold">See how Snaplet works</button>
          </motion.div>
        </section>

        <section id="landing-features" className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-28 scroll-mt-28">
          <StudyPanel title="Build from source" tone="bg-primary text-on-primary">
            <div className="bg-surface rounded-[28px] p-5 text-on-surface rotate-[-4deg] ambient-shadow space-y-4 select-none pointer-events-none" aria-hidden="true">
              <div className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-sm font-bold text-primary mb-2">Source material</p>
                <p className="text-lg font-semibold leading-snug">Paste lecture notes, readings, or a study guide.</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary mb-1">Output</p>
                  <p className="text-2xl font-bold">A ready-to-review study kit</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-primary-container/40" />
              </div>
            </div>
          </StudyPanel>
          <StudyPanel title="Review the questions" tone="bg-[#FBC887] text-on-surface">
            <div className="bg-surface rounded-[28px] p-5 ambient-shadow space-y-3 select-none pointer-events-none" aria-hidden="true">
              <div className="grid grid-cols-3 gap-3 text-sm font-bold">
                <div><p className="text-on-surface-variant font-medium">Items</p><p>24</p></div>
                <div><p className="text-on-surface-variant font-medium">Edited</p><p>6</p></div>
                <div><p className="text-on-surface-variant font-medium">Ready</p><p>18</p></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-secondary/70 w-full" />
                <div className="h-3 rounded-full bg-surface-container-highest w-4/5" />
                <div className="h-3 rounded-full bg-tertiary/70 w-3/5" />
                <div className="h-3 rounded-full bg-surface-container-highest w-5/6" />
              </div>
            </div>
          </StudyPanel>
          <StudyPanel title="Choose a study mode" tone="bg-[#A8DDF8] text-on-surface">
            <div className="bg-surface rounded-[28px] p-5 ambient-shadow select-none pointer-events-none" aria-hidden="true">
              <p className="text-primary font-bold mb-4">Session setup</p>
              <div className="bg-surface-container-low rounded-2xl p-4 mb-4">
                <p className="text-2xl font-bold leading-tight">Switch between Standard, Focus, Weak Review, and Fast Drill.</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Adaptive pacing built in</span>
                <button onClick={onGetStarted} className="rounded-full bg-primary px-5 py-2 text-on-primary font-bold">Study</button>
              </div>
            </div>
          </StudyPanel>
          <StudyPanel title="Track what needs work" tone="bg-[#F9DD76] text-on-surface">
            <div className="relative h-full min-h-[220px] select-none pointer-events-none" aria-hidden="true">
              <div className="absolute left-5 top-5 h-24 w-28 rounded-2xl bg-surface ambient-shadow p-4">
                <div className="h-3 w-full rounded-full bg-secondary/60 mb-3" />
                <div className="h-3 w-4/5 rounded-full bg-surface-container-highest mb-3" />
                <div className="h-3 w-3/5 rounded-full bg-tertiary/75" />
              </div>
              <div className="absolute right-8 top-16 h-28 w-36 rounded-2xl bg-surface-container-highest ambient-shadow p-4">
                <p className="text-sm font-bold">Weak areas</p>
                <div className="mt-4 space-y-3">
                  <div className="h-3 rounded-full bg-surface w-4/5" />
                  <div className="h-3 rounded-full bg-surface w-2/3" />
                  <div className="h-3 rounded-full bg-surface w-3/4" />
                </div>
              </div>
              <div className="absolute left-14 bottom-5 h-24 w-32 rounded-2xl bg-surface ambient-shadow border border-outline-variant/10 p-4">
                <p className="text-sm font-bold">Accuracy</p>
                <p className="mt-1 text-3xl font-black">84%</p>
              </div>
            </div>
          </StudyPanel>
        </section>

        <section className="space-y-24">
          <MarketingSplit
            title="Show up prepared, not scattered"
            description="Pull your material into one place, generate better prompts, and review with a rhythm that keeps your next exam from sneaking up on you."
            imageTone="bg-[#7CCAF7]"
            buttonLabel="Build a kit"
            onClick={onGetStarted}
          >
            <div className="h-full rounded-[30px] bg-surface p-6 ambient-shadow select-none pointer-events-none" aria-hidden="true">
              <div className="h-5 w-48 rounded-full bg-surface-container-low mb-6" />
              <div className="grid grid-cols-[1.3fr_1fr] gap-4">
                <div className="rounded-[26px] bg-surface-container-low p-6 rotate-[-5deg]">
                  <div className="h-28 rounded-2xl bg-surface" />
                </div>
                <div className="rounded-[26px] bg-surface p-4">
                  <div className="h-36 rounded-2xl bg-surface-container-low" />
                </div>
              </div>
            </div>
          </MarketingSplit>
          <MarketingSplit
            title="Study with real recall, not passive rereading"
            description="Use typed answers, retries, and weak-item review to turn passive notes into knowledge you can actually retrieve under pressure."
            imageTone="bg-[#F9DC76]"
            buttonLabel="See the method"
            reverse
            onClick={scrollToFeatures}
          >
            <div className="rounded-[30px] bg-surface p-6 ambient-shadow select-none pointer-events-none" aria-hidden="true">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-3 flex-1 rounded-full bg-tertiary" />
                <div className="h-8 w-8 rounded-full bg-[#FFB95F] flex items-center justify-center text-[10px] font-black text-on-tertiary">15</div>
                <div className="h-3 flex-1 rounded-full bg-surface-container-highest" />
              </div>
              <div className="rounded-[22px] bg-surface-container-low p-5">
                <p className="text-xl mb-4">the environmental transition zone between two biomes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 rounded-2xl bg-surface" />
                  <div className="h-14 rounded-2xl bg-secondary-container border border-secondary/30 flex items-center justify-center font-bold text-secondary">ecotone</div>
                  <div className="h-14 rounded-2xl bg-surface" />
                  <div className="h-14 rounded-2xl bg-surface" />
                </div>
              </div>
            </div>
          </MarketingSplit>
          <MarketingSplit
            title="See your kits, sessions, and weak spots in one place"
            description="Stay organized with a workspace that surfaces your current kits, recent sessions, and the topics that need attention next."
            imageTone="bg-[#F6A34A]"
            buttonLabel="Open your workspace"
            onClick={onGetStarted}
          >
            <div className="h-full rounded-[30px] bg-surface p-6 ambient-shadow select-none pointer-events-none" aria-hidden="true">
              <div className="grid grid-cols-[0.9fr_1.1fr] gap-5 h-full">
                <div className="rounded-[26px] bg-[#243D76] p-4">
                  <div className="rounded-[18px] bg-surface p-4 h-full">
                    <p className="text-on-surface-variant mb-3">Jump back in</p>
                    <div className="rounded-2xl bg-primary-container/45 p-4">
                      <p className="font-bold text-on-surface">Bio 1b practice midterm</p>
                      <div className="mt-4 h-3 rounded-full bg-secondary/60 w-4/5" />
                      <button onClick={onGetStarted} className="mt-5 rounded-full bg-primary px-5 py-2 text-on-primary font-bold">Continue</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[24px] bg-surface p-5 ambient-shadow">
                    <p className="font-bold text-on-surface">Microbiology: Exam 1</p>
                    <p className="text-sm text-on-surface-variant">28 cards • by Quantumquest</p>
                  </div>
                  <div className="rounded-[24px] bg-surface p-5 ambient-shadow">
                    <p className="font-bold text-on-surface">Fundamentals of nursing midterm 2</p>
                    <p className="text-sm text-on-surface-variant">Match as fast as you can</p>
                  </div>
                </div>
              </div>
            </div>
          </MarketingSplit>
        </section>
      </main>

      <footer className="bg-surface-container-low py-12 px-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-sm">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-black text-primary font-headline">Snaplet</span>
            <p className="text-on-surface-variant text-sm">© 2026 Kinetic Intelligence Inc.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-on-surface-variant">
            <a href="/legal/privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="/legal/terms" className="hover:text-primary transition-colors">Terms</a>
            <a href="/legal/methodology" className="hover:text-primary transition-colors">Methodology</a>
            <a href="/legal/contact" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const StudyPanel = ({ title, tone, children }: any) => (
  <div className={`rounded-[28px] p-6 min-h-[350px] ${tone}`}>
    <h3 className="text-4xl font-headline font-black tracking-tight mb-6">{title}</h3>
    {children}
  </div>
);

const MarketingSplit = ({ title, description, imageTone, buttonLabel, children, reverse = false, onClick }: any) => (
  <div className={`grid lg:grid-cols-2 gap-12 items-center ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
    <div className="space-y-8">
      <h2 className="text-5xl font-black font-headline tracking-tight text-on-surface leading-[1.08]">{title}</h2>
      <p className="text-2xl text-on-surface-variant leading-relaxed max-w-2xl">{description}</p>
      <button onClick={onClick} className="rounded-full gradient-primary text-on-primary px-10 py-4 font-bold text-lg">{buttonLabel}</button>
    </div>
    <div className={`${imageTone} rounded-[32px] p-8 min-h-[320px] flex items-center`}>
      {children}
    </div>
  </div>
);
