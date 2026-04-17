import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  Files,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
} from 'lucide-react';

import { Button } from '../components/Button';

export const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [landingUserCount, setLandingUserCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const response = await fetch('/api/landing-stats');
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { userCount?: number | null };
        if (!cancelled && typeof payload.userCount === 'number') {
          setLandingUserCount(payload.userCount);
        }
      } catch {
        // Keep the landing page honest when public stats are unavailable.
      }
    };

    void loadStats();
    const interval = window.setInterval(loadStats, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const heroProof = useMemo(
    () =>
      landingUserCount !== null
        ? `${landingUserCount.toLocaleString()} students already building study kits in Snaplet`
        : 'Students already building study kits in Snaplet',
    [landingUserCount],
  );

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/10 bg-background/90 px-5 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black text-on-primary">S</div>
          <span className="font-headline text-[28px] font-black tracking-[-0.04em] text-primary">Snaplet</span>
        </div>

        <div className="hidden items-center gap-6 text-sm font-semibold text-on-surface-variant md:flex">
          <button onClick={() => scrollTo('landing-product')} className="transition-colors hover:text-on-surface">
            Product
          </button>
          <button onClick={() => scrollTo('landing-method')} className="transition-colors hover:text-on-surface">
            How it works
          </button>
          <button onClick={() => scrollTo('landing-outcomes')} className="transition-colors hover:text-on-surface">
            Outcomes
          </button>
          <button onClick={() => scrollTo('landing-start')} className="transition-colors hover:text-on-surface">
            Start
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGetStarted}
            className="hidden h-10 rounded-full border border-outline-variant/15 bg-surface px-5 text-sm font-bold text-on-surface sm:inline-flex sm:items-center sm:justify-center"
          >
            Log in
          </button>
          <Button onClick={onGetStarted} size="sm" className="rounded-full px-5">
            Get started
          </Button>
        </div>
      </nav>

      <main className="px-5 pb-24 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-[1380px]">
          <div className="grid gap-10 rounded-[44px] border border-outline-variant/10 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(24,32,67,0.05)] md:px-10 md:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-14 lg:py-14">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                Study flow, not tool pile
              </div>

              <div className="space-y-4">
                <h1 className="font-headline text-5xl font-black leading-[0.94] tracking-[-0.065em] text-on-surface md:text-[5.35rem]">
                  Turn raw material into
                  <br />
                  a study loop that holds.
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-on-surface-variant md:text-xl">
                  Paste notes, upload reading packets, review the generated questions, and move into study sessions that keep the weak spots visible instead of hiding them.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={onGetStarted} className="rounded-full px-8">
                  Build your first kit
                </Button>
                <button onClick={() => scrollTo('landing-product')} className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                  See the workflow
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-on-surface-variant">
                <span className="rounded-full bg-primary/8 px-3 py-2 text-primary">
                  {landingUserCount !== null ? `${landingUserCount.toLocaleString()} students live` : 'Live student count'}
                </span>
                <span>{heroProof}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {HERO_PILLS.map((item) => (
                  <div key={item} className="rounded-[20px] bg-surface-container-low px-4 py-4 text-sm font-semibold text-on-surface">
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.985, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="relative"
            >
              <div className="absolute inset-x-10 top-10 h-40 rounded-full bg-[radial-gradient(circle,rgba(66,85,255,0.12),transparent_70%)] blur-3xl" />
              <div className="relative overflow-hidden rounded-[36px] border border-outline-variant/10 bg-[linear-gradient(180deg,#fdfdff,#f4f7ff)] p-5 shadow-[0_28px_80px_rgba(24,32,67,0.08)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/75">Snaplet workspace</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-on-surface">From source to session</h2>
                  </div>
                  <div className="rounded-full bg-primary/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                    Review first
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="space-y-4 rounded-[30px] bg-white p-5 shadow-[0_16px_40px_rgba(24,32,67,0.06)]">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Incoming material</p>
                      <p className="mt-2 text-lg font-bold text-on-surface">Lecture notes, chapter summary, lab review sheet</p>
                    </div>
                    <div className="rounded-[22px] bg-surface-container-low p-4">
                      <div className="flex flex-wrap gap-2">
                        {SOURCE_CHIPS.map((item) => (
                          <div key={item.label}>
                            <SourceChip icon={item.icon} label={item.label} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-outline-variant/10 bg-[#282e3e] p-4 text-white">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">Messy source snapshot</p>
                      <div className="mt-4 space-y-2">
                        <MessyLine width="w-[92%]" />
                        <MessyLine width="w-[78%]" />
                        <MessyLine width="w-[86%]" />
                        <MessyLine width="w-[68%]" />
                        <MessyLine width="w-[81%]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[30px] bg-white p-5 shadow-[0_16px_40px_rgba(24,32,67,0.06)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Question review</p>
                          <p className="mt-2 text-lg font-bold text-on-surface">Shape the set before study begins.</p>
                        </div>
                        <div className="rounded-full bg-[#E9F6FF] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                          Editable
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {QUESTION_CARDS.map((item) => (
                          <div key={item.title} className="rounded-[22px] border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{item.body}</p>
                              </div>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[28px] bg-[#282e3e] p-5 text-white shadow-[0_18px_40px_rgba(24,32,67,0.16)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">During study</p>
                        <p className="mt-2 text-lg font-bold">Typed answers, clear feedback</p>
                        <div className="mt-4 rounded-[22px] bg-white/8 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Prompt</p>
                          <p className="mt-2 text-base font-semibold leading-relaxed">How would you explain the electron transport chain in one sentence?</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="rounded-full bg-[#8CF0B2]/14 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8CF0B2]">
                            Correct
                          </span>
                          <span className="text-sm font-semibold text-white/72">Moves out of the weak queue</span>
                        </div>
                      </div>

                      <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(24,32,67,0.06)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">After study</p>
                        <p className="mt-2 text-lg font-bold text-on-surface">The next move stays obvious.</p>
                        <div className="mt-4 space-y-3">
                          {PROGRESS_ROWS.map((item) => (
                            <div key={item.label}>
                              <ProgressRow label={item.label} value={item.value} weak={item.weak} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="landing-proof" className="mx-auto mt-8 max-w-[1380px]">
          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="px-1 py-2 md:px-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Trust</p>
              <h2 className="mt-3 font-headline text-3xl font-black tracking-[-0.045em] text-on-surface md:text-4xl">
                The product promise stays attached to real behavior.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-on-surface-variant">
                Review exists before the session. Shared kits are explicit. Progress is stored server-side. The trust layer is built into the product instead of being something you are asked to simply believe.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
              {TRUST_POINTS.map((item) => (
                <div key={item.label}>
                  <TrustCard icon={item.icon} label={item.label} copy={item.copy} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="landing-product" className="mx-auto mt-24 max-w-[1380px]">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Product</p>
            <h2 className="mt-3 font-headline text-4xl font-black tracking-[-0.05em] text-on-surface md:text-5xl">
              One lead workflow. Everything else supports it.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
              The point is not to present four equal features. The point is to move the student from source material to better recall with as little friction as possible.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <LeadWorkflowPanel />
            <div className="grid gap-5">
              {SUPPORT_PANELS.map((panel) => (
                <div key={panel.title}>
                  <SupportPanel eyebrow={panel.eyebrow} title={panel.title} body={panel.body} tone={panel.tone} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="landing-method" className="mx-auto mt-24 max-w-[1380px] space-y-6">
          <EditorialSplit
            eyebrow="How it works"
            title="A better study flow starts before memorization."
            body="Snaplet earns its place in the workflow by helping you fix the material before you start drilling it. That review step is what makes the rest feel cleaner."
            reverse={false}
            visual={
              <div className="grid gap-4">
                <LayerCard
                  eyebrow="Step one"
                  title="Bring in the material you already have."
                  body="Paste raw notes or import the files you were already carrying around."
                />
                <LayerCard
                  eyebrow="Step two"
                  title="Shape the generated set."
                  body="Keep good questions, edit awkward ones, and remove anything you would not want to study from."
                  offset
                />
              </div>
            }
          />

          <EditorialSplit
            eyebrow="Why it feels better"
            title="The payoff is less app juggling and a clearer next step."
            body="Instead of scattering notes, flashcards, review sessions, and progress into separate tools, the product keeps them in one line so the next useful move stays obvious."
            reverse
            visual={
              <div className="rounded-[36px] bg-[#282e3e] p-6 text-white shadow-[0_22px_60px_rgba(24,32,67,0.14)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">One place</p>
                <div className="mt-5 grid gap-4">
                  {WORKSPACE_POINTS.map((item) => (
                    <div key={item.title} className="rounded-[22px] bg-white/8 px-5 py-4">
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/72">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </section>

        <section id="landing-outcomes" className="mx-auto mt-24 max-w-[1380px]">
          <div className="grid gap-12 border-t border-outline-variant/20 pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Outcomes</p>
              <h2 className="font-headline text-4xl font-black tracking-[-0.05em] text-on-surface md:text-5xl">
                This should feel like less chaos, not more software.
              </h2>
              <p className="text-lg leading-relaxed text-on-surface-variant">
                The real shift is cleaner recall, less context-switching, and a better sense of what to do next when the material is still rough.
              </p>
            </div>

            <div className="grid gap-0 border-t border-outline-variant/20 lg:grid-cols-3 lg:border-l lg:border-t-0">
              {OUTCOME_COLUMNS.map((item) => (
                <div key={item.title}>
                  <OutcomeColumn icon={item.icon} title={item.title} body={item.body} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-[1380px]">
          <div className="grid gap-12 border-t border-outline-variant/20 pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">For demanding classes</p>
              <h2 className="font-headline text-4xl font-black tracking-[-0.05em] text-on-surface md:text-5xl">
                Built for dense lectures, midterms, and revision nights where the material is still rough.
              </h2>
              <p className="text-lg leading-relaxed text-on-surface-variant">
                The promise is not “study more.” It is “get from rough material to useful recall faster, with less guessing and less rework.”
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {STUDY_BENEFITS.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <EditorialStatCard title="Start from notes or files" body="No need to rebuild the input by hand before the product becomes useful." />
              <EditorialStatCard title="Review before you trust" body="Generated material stays visible and editable before it becomes a session." />
              <EditorialStatCard title="Weak areas remain visible" body="The product is better when it shows what still needs work instead of hiding it." />
              <EditorialStatCard title="Pick up where you left off" body="Recent activity, weak areas, and current kits stay in one workspace." />
            </div>
          </div>
        </section>

        <section id="landing-start" className="mx-auto mt-24 max-w-[1380px]">
          <div className="grid gap-10 rounded-[42px] bg-primary px-6 py-10 text-on-primary shadow-[0_28px_80px_rgba(66,85,255,0.22)] md:px-10 md:py-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/74">Start</p>
              <h2 className="font-headline text-4xl font-black tracking-[-0.05em] md:text-5xl">
                Bring the material you already have. Leave with a sharper loop.
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed text-white/80">
                Paste notes, upload reading packets, review the generated set, and let the next session tell you what still needs work instead of starting from scratch again.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <button
                onClick={onGetStarted}
                className="rounded-full bg-white px-8 py-4 text-base font-black text-primary transition-transform duration-200 hover:-translate-y-px"
              >
                Create your first kit
              </button>
              <a
                href="/legal/privacy"
                className="rounded-full border border-white/20 px-8 py-4 text-center text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                Read privacy details
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-outline-variant/10 bg-surface-container-low px-5 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black text-on-primary">S</div>
              <span className="font-headline text-2xl font-black tracking-tighter text-primary">Snaplet</span>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant">
              One calmer line from notes to recall. Built for students who would rather keep the whole loop in one place than juggle a folder of docs, a flashcard app, and a separate progress tracker.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onGetStarted}
                className="rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary"
              >
                Get started
              </button>
              <a href="/legal/contact" className="rounded-full border border-outline-variant/15 px-5 py-3 text-sm font-bold text-on-surface">
                Contact support
              </a>
            </div>
            <p className="text-sm text-on-surface-variant">© 2026 Kinetic Intelligence Inc.</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <FooterColumn
              title="Product"
              links={[
                ['How it works', '#landing-product'],
                ['Outcomes', '#landing-outcomes'],
                ['Get started', '#landing-start'],
                ['Workspace', '#landing-method'],
              ]}
            />
            <FooterColumn
              title="Trust"
              links={[
                ['Privacy', '/legal/privacy'],
                ['Terms', '/legal/terms'],
                ['Methodology', '/legal/methodology'],
                ['Contact', '/legal/contact'],
              ]}
            />
            <FooterColumn
              title="Use"
              links={[
                ['Paste notes', '#landing-product'],
                ['Import documents', '#landing-product'],
                ['Study modes', '#landing-method'],
                ['Progress', '#landing-proof'],
              ]}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

const HERO_PILLS = ['Paste notes directly', 'Review the set before studying', 'Keep weak areas visible after the session'] as const;

const SOURCE_CHIPS = [
  { label: 'PDF handout', icon: <Files className="h-3.5 w-3.5" /> },
  { label: 'Typed notes', icon: <Upload className="h-3.5 w-3.5" /> },
  { label: 'Lecture summary', icon: <BookOpenCheck className="h-3.5 w-3.5" /> },
] as const;

const QUESTION_CARDS = [
  {
    title: 'What happens to ATP production when oxygen drops?',
    body: 'Edited for clarity before it becomes part of the study run.',
    status: 'edited',
  },
  {
    title: 'How would you explain the electron transport chain in one sentence?',
    body: 'Kept because it pushes for recall instead of passive recognition.',
    status: 'kept',
  },
] as const;

const PROGRESS_ROWS = [
  { label: 'Cell respiration', value: 86, weak: false },
  { label: 'ATP & gradients', value: 54, weak: true },
  { label: 'Lab vocabulary', value: 73, weak: false },
] as const;

const TRUST_POINTS = [
  {
    icon: <LockKeyhole className="h-4 w-4" />,
    label: 'Private by default',
    copy: 'Sources stay private until you explicitly decide to share a kit.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    label: 'Review before study',
    copy: 'Generated questions are visible and editable before they become a session.',
  },
  {
    icon: <LineChart className="h-4 w-4" />,
    label: 'Progress stays attached',
    copy: 'Session outcomes and weak spots stay server-backed instead of living only in the tab.',
  },
] as const;

const SUPPORT_PANELS = [
  {
    eyebrow: 'Review first',
    title: 'Question quality gets a real checkpoint.',
    body: 'That extra review step is what makes the rest of the loop feel trustworthy.',
    tone: '',
  },
  {
    eyebrow: 'Then study',
    title: 'Typed answers make sessions feel active.',
    body: 'The interaction pushes for recall, not just recognition or button tapping.',
    tone: '',
  },
  {
    eyebrow: 'Then continue',
    title: 'Weak areas stay visible after the score is gone.',
    body: 'The useful next move is still there when you come back.',
    tone: '',
  },
] as const;

const OUTCOME_COLUMNS = [
  {
    icon: <Files className="h-5 w-5" />,
    title: 'Less switching',
    body: 'Material, review, study mode, and follow-up live in one line instead of four separate tools.',
  },
  {
    icon: <BrainCircuit className="h-5 w-5" />,
    title: 'Clearer recall',
    body: 'Typed answers and visible feedback make the study sessions feel active instead of passive.',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Better next steps',
    body: 'Weak areas stay surfaced so the next session starts in the right place instead of from zero.',
  },
] as const;

const WORKSPACE_POINTS = [
  {
    title: 'Current kit stays visible',
    body: 'You are not thrown back into a blank start state when you already have material in motion.',
  },
  {
    title: 'Weak review has a reason to exist',
    body: 'The misses stay visible so the next study pass has a clear target.',
  },
  {
    title: 'Progress feels attached to the account',
    body: 'The product behaves more like a real workspace than a temporary browser trick.',
  },
] as const;

const STUDY_BENEFITS = [
  'Bring in rough lecture notes',
  'Import documents and simple data files',
  'Review before you memorize',
  'Resume from visible weak spots',
] as const;

function LeadWorkflowPanel() {
  return (
    <div className="rounded-[36px] bg-[#EEF2FF] p-6 md:p-7">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Lead workflow</p>
      <h3 className="mt-3 max-w-2xl font-headline text-3xl font-black tracking-[-0.045em] text-on-surface md:text-[2.3rem]">
        Start from rough source material and turn it into something you would actually want to study from.
      </h3>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-on-surface-variant">
        This is the main story of the product. Material comes in messy, gets shaped into a cleaner set, then becomes an active session with a useful follow-up.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
        <div className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(24,32,67,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">Input</p>
              <p className="mt-2 text-lg font-bold text-on-surface">Build from notes or files</p>
            </div>
            <div className="inline-flex rounded-full bg-primary/8 p-2 text-primary">
              <Upload className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-5 space-y-3 rounded-[24px] bg-surface-container-low p-4">
            <MessyLine width="w-[90%]" />
            <MessyLine width="w-[72%]" />
            <MessyLine width="w-[84%]" />
            <MessyLine width="w-[66%]" />
            <div className="flex flex-wrap gap-2 pt-2">
              {SOURCE_CHIPS.map((item) => (
                <div key={item.label}>
                  <SourceChip icon={item.icon} label={item.label} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[26px] bg-[#282e3e] p-5 text-white shadow-[0_18px_40px_rgba(24,32,67,0.16)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">Output</p>
              <p className="mt-2 text-lg font-bold">Cleaner review path</p>
            </div>
            <div className="inline-flex rounded-full bg-white/10 p-2 text-white">
              <WandSparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] bg-white/8 px-4 py-4">
              <p className="text-sm font-semibold">Review the generated question set.</p>
            </div>
            <div className="rounded-[22px] bg-white/8 px-4 py-4">
              <p className="text-sm font-semibold">Choose a mode that matches the moment.</p>
            </div>
            <div className="rounded-[22px] bg-white/8 px-4 py-4">
              <p className="text-sm font-semibold">Keep weak areas visible after the session ends.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportPanel({
  eyebrow,
  title,
  body,
  tone,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tone: string;
}) {
  return (
    <div className={`border-l-2 border-primary/20 pl-5 pr-2 py-2 ${tone}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h3 className="mt-3 font-headline text-2xl font-black tracking-[-0.04em] text-on-surface">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-on-surface-variant">{body}</p>
    </div>
  );
}

function EditorialSplit({
  eyebrow,
  title,
  body,
  reverse,
  visual,
}: {
  eyebrow: string;
  title: string;
  body: string;
  reverse?: boolean;
  visual: ReactNode;
}) {
  return (
    <div className={`grid gap-12 border-t border-outline-variant/20 pt-12 lg:items-center ${reverse ? 'lg:grid-cols-[1.02fr_0.98fr]' : 'lg:grid-cols-[0.98fr_1.02fr]'}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h2 className="mt-3 font-headline text-4xl font-black tracking-[-0.05em] text-on-surface md:text-5xl">{title}</h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-on-surface-variant">{body}</p>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{visual}</div>
    </div>
  );
}

function TrustCard({
  icon,
  label,
  copy,
}: {
  icon: ReactNode;
  label: string;
  copy: string;
}) {
  return (
    <div className="border-t border-outline-variant/20 px-2 py-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-black text-on-surface">{label}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{copy}</p>
    </div>
  );
}

function OutcomeColumn({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="border-b border-outline-variant/20 px-2 py-6 last:border-b-0 lg:border-b-0 lg:border-r lg:px-6 lg:last:border-r-0">
      <div className="mb-4 inline-flex rounded-2xl bg-primary/8 p-3 text-primary">{icon}</div>
      <h3 className="font-headline text-2xl font-black tracking-[-0.03em] text-on-surface">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{body}</p>
    </div>
  );
}

function EditorialStatCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border-t border-outline-variant/20 px-1 py-5">
      <p className="text-lg font-black tracking-[-0.03em] text-on-surface">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{body}</p>
    </div>
  );
}

function LayerCard({
  eyebrow,
  title,
  body,
  offset = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  offset?: boolean;
}) {
  return (
    <div className={`border-l border-outline-variant/20 pl-5 ${offset ? 'lg:ml-14' : ''}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <p className="mt-2 text-xl font-black tracking-[-0.03em] text-on-surface">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{body}</p>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-on-surface">{title}</p>
      <div className="flex flex-col gap-2">
        {links.map(([label, href]) => (
          <a key={label} href={href} className="text-sm text-on-surface-variant transition-colors hover:text-primary">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SourceChip({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-on-surface shadow-[0_8px_18px_rgba(24,32,67,0.05)]">
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function MessyLine({ width }: { width: string }) {
  return <div className={`h-2 rounded-full bg-white/14 ${width}`} />;
}

function ProgressRow({
  label,
  value,
  weak,
}: {
  label: string;
  value: number;
  weak?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-on-surface">
        <span>{label}</span>
        <span className={weak ? 'text-[#E6894A]' : 'text-primary'}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
        <div
          className={`h-full rounded-full ${weak ? 'bg-[#E6894A]' : 'bg-primary'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
