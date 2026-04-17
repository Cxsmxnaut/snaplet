import { type MotionValue, motion, useTransform } from 'framer-motion';
import { ArrowRight, Check, CornerDownRight, Sparkles, TrendingUp } from 'lucide-react';

import { BGPattern } from '@/components/ui/bg-pattern';
import { useScrollStory } from '@/components/landing/use-scroll-story';

const STORY_STEPS = [
  {
    eyebrow: 'Scene 1',
    title: 'Messy notes',
    body: 'This is what studying usually looks like: a wall of raw material with no shape, no order, and no signal.',
  },
  {
    eyebrow: 'Scene 2',
    title: 'Transformation',
    body: 'As you move, the text reorganizes itself. The product stops feeling abstract and starts looking useful.',
  },
  {
    eyebrow: 'Scene 3',
    title: 'Flashcards',
    body: 'Cards rise out of the source material. One clean prompt comes forward and the stack suddenly makes sense.',
  },
  {
    eyebrow: 'Scene 4',
    title: 'Study interaction',
    body: 'The card flips, the answer appears, and feedback shows up immediately instead of staying hidden in the workflow.',
  },
  {
    eyebrow: 'Scene 5',
    title: 'Progress',
    body: 'Weak areas and momentum become visible, so the next session knows where to start instead of guessing.',
  },
];

const NOTE_LINES = [
  { width: '78%', top: '16%', left: '8%' },
  { width: '88%', top: '25%', left: '6%' },
  { width: '82%', top: '33%', left: '10%' },
  { width: '42%', top: '43%', left: '10%' },
  { width: '70%', top: '52%', left: '8%' },
  { width: '62%', top: '60%', left: '16%' },
  { width: '50%', top: '72%', left: '13%' },
];

export function ScrollStory({ onGetStarted }: { onGetStarted: () => void }) {
  const { ref, progress, activeStep } = useScrollStory();

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-[44px] border border-outline-variant/12 bg-white shadow-[0_24px_80px_rgba(24,32,67,0.06)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(66,85,255,0.08),transparent_44%),linear-gradient(180deg,rgba(252,252,255,0.92),rgba(247,249,255,0.92))]" />
        <BGPattern
          variant="grid"
          size={104}
          fill="rgba(33, 44, 78, 0.06)"
          className="opacity-55"
          mask="fade-edges"
        />
        <BGPattern
          variant="dots"
          size={22}
          fill="rgba(33, 44, 78, 0.08)"
          className="opacity-45"
          mask="fade-edges"
        />

        <div className="relative grid h-full gap-10 px-6 py-8 md:px-8 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)] lg:px-12 lg:py-12">
          <div className="flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                  Scroll-driven walkthrough
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-md text-4xl font-black tracking-[-0.05em] text-on-surface md:text-[3.25rem] md:leading-[0.95]">
                    See the flow assemble itself.
                  </h2>
                  <p className="max-w-md text-base leading-relaxed text-on-surface-variant md:text-lg">
                    One continuous scene. The product keeps changing shape, but the story never breaks.
                  </p>
                </div>
              </div>

            <div className="space-y-3">
              {STORY_STEPS.map((step, index) => (
                <div key={step.title}>
                  <StoryStep
                    step={step}
                    index={index}
                    active={activeStep === index}
                    complete={activeStep > index}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
              <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant">
                Scroll forward to assemble the flow. Scroll back and every state unwinds cleanly.
              </p>
              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#282e3e] px-5 py-3 text-sm font-black text-white transition-transform duration-200 hover:-translate-y-px"
              >
                Start building
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <StoryStage progress={progress} />
        </div>
      </div>
    </section>
  );
}

function StoryStep({
  step,
  index,
  active,
  complete,
}: {
  step: (typeof STORY_STEPS)[number];
  index: number;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`rounded-[28px] px-4 py-4 transition-all duration-300 ${
        active
          ? 'bg-white shadow-[0_18px_40px_rgba(24,32,67,0.08)] ring-1 ring-outline-variant/12'
          : 'bg-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${
            active
              ? 'bg-primary text-white'
              : complete
                ? 'bg-primary/12 text-primary'
                : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          {complete ? <Check className="h-4 w-4" /> : index + 1}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/75">{step.eyebrow}</p>
          <p className="text-lg font-black tracking-[-0.03em] text-on-surface">{step.title}</p>
          <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">{step.body}</p>
        </div>
      </div>
    </div>
  );
}

function StoryStage({ progress }: { progress: MotionValue<number> }) {
  const stageRotateY = useTransform(progress, [0, 1], [-7, 3]);
  const stageRotateX = useTransform(progress, [0, 1], [8, 0]);
  const stageScale = useTransform(progress, [0, 0.2, 1], [0.92, 1, 1]);
  const stageY = useTransform(progress, [0, 0.18, 1], [30, 0, 0]);

  const noteOpacity = useTransform(progress, [0, 0.2, 0.36], [1, 1, 0.2]);
  const noteBlur = useTransform(progress, [0.22, 0.38], ['0px', '8px']);
  const noteRotateZ = useTransform(progress, [0, 0.22, 0.5], [-8, -2, 0]);

  const transformOpacity = useTransform(progress, [0.18, 0.28, 0.45], [0, 1, 0]);
  const transformScale = useTransform(progress, [0.2, 0.35], [0.88, 1]);

  const stackOpacity = useTransform(progress, [0.34, 0.45, 0.7], [0, 1, 1]);
  const frontCardY = useTransform(progress, [0.4, 0.62], [34, -12]);
  const frontCardRotate = useTransform(progress, [0.4, 0.62], [-8, 0]);
  const frontCardScale = useTransform(progress, [0.4, 0.62], [0.92, 1.03]);

  const flipRotate = useTransform(progress, [0.62, 0.74], [0, 180]);
  const feedbackOpacity = useTransform(progress, [0.68, 0.82], [0, 1]);
  const feedbackY = useTransform(progress, [0.68, 0.82], [22, 0]);

  const progressOpacity = useTransform(progress, [0.76, 0.9], [0, 1]);
  const progressScale = useTransform(progress, [0.76, 0.9], [0.88, 1]);
  const weakOpacity = useTransform(progress, [0.82, 0.96], [0, 1]);

  return (
    <div className="relative flex min-h-[460px] items-center justify-center lg:min-h-0">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[14%] h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(66,85,255,0.12),transparent_72%)] blur-3xl" />
        <div className="absolute bottom-[16%] right-[10%] h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(66,85,255,0.12),transparent_74%)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[760px] [perspective:1800px]">
        <motion.div
          className="relative mx-auto aspect-[1.12/1] w-full max-w-[660px]"
          style={{ rotateY: stageRotateY, rotateX: stageRotateX, scale: stageScale, y: stageY }}
        >
          <div className="absolute inset-[3%] rounded-[42px] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,247,255,0.96))] shadow-[0_34px_80px_rgba(27,38,77,0.12)]" />

          <motion.div
            className="absolute left-[11%] top-[8%] h-[68%] w-[52%] rounded-[34px] border border-[#dbe2ff] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(27,38,77,0.08)]"
            style={{ opacity: noteOpacity, rotateZ: noteRotateZ, filter: noteBlur }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              Raw notes
            </div>
            <div className="space-y-3">
              {NOTE_LINES.map((line, index) => (
                <motion.div
                  key={`${line.top}-${line.left}`}
                  className="h-3 rounded-full bg-[#d9dff6]"
                  style={{
                    width: line.width,
                    marginLeft: line.left,
                    marginTop: index === 0 ? '0.25rem' : undefined,
                  }}
                />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <motion.div className="h-14 rounded-[18px] bg-[#f6f8ff]" />
              <motion.div className="h-10 rounded-[18px] bg-[#f3f6fd]" />
            </div>
          </motion.div>

          <motion.div
            className="absolute left-[17%] top-[17%] z-10 h-[52%] w-[56%]"
            style={{ opacity: transformOpacity, scale: transformScale }}
          >
            {[
              { x: '0%', y: '6%', w: '58%' },
              { x: '48%', y: '18%', w: '42%' },
              { x: '10%', y: '48%', w: '46%' },
              { x: '54%', y: '58%', w: '32%' },
            ].map((card, index) => (
              <motion.div
                key={`${card.x}-${card.y}`}
                className="absolute rounded-[22px] border border-[#dce3ff] bg-white px-4 py-3 shadow-[0_16px_32px_rgba(27,38,77,0.08)]"
                style={{
                  left: card.x,
                  top: card.y,
                  width: card.w,
                  rotateZ: `${index % 2 === 0 ? -6 : 5}deg`,
                }}
              >
                <div className="h-2.5 w-16 rounded-full bg-primary/16" />
                <div className="mt-3 space-y-2">
                  <div className="h-2 rounded-full bg-[#dbe1f6]" />
                  <div className="h-2 w-[78%] rounded-full bg-[#e6ebfb]" />
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="absolute inset-0" style={{ opacity: stackOpacity }}>
            <motion.div
              className="absolute left-[34%] top-[16%] h-[52%] w-[38%] rounded-[30px] border border-[#d6defc] bg-[#f5f7ff] shadow-[0_20px_54px_rgba(27,38,77,0.1)]"
              style={{ y: 16, x: -64, rotateZ: -12, scale: 0.9 }}
            />
            <motion.div
              className="absolute left-[38%] top-[19%] h-[52%] w-[38%] rounded-[30px] border border-[#d6defc] bg-[#edf1ff] shadow-[0_20px_54px_rgba(27,38,77,0.1)]"
              style={{ y: 4, x: 34, rotateZ: 8, scale: 0.93 }}
            />

            <motion.div
              className="absolute left-[31%] top-[20%] h-[56%] w-[40%] [transform-style:preserve-3d]"
              style={{ y: frontCardY, rotateZ: frontCardRotate, scale: frontCardScale }}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                style={{ rotateY: flipRotate }}
              >
                <div className="absolute inset-0 rounded-[34px] border border-[#d6defc] bg-white px-6 py-6 shadow-[0_28px_70px_rgba(27,38,77,0.16)] [backface-visibility:hidden]">
                  <div className="inline-flex rounded-full bg-primary/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                    Flashcard
                  </div>
                  <div className="mt-10 space-y-5">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-on-surface-variant">Question</p>
                    <h3 className="text-2xl font-black leading-tight tracking-[-0.04em] text-on-surface">
                      What happens to ATP production when oxygen availability drops?
                    </h3>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface-variant">Swipe or flip</span>
                    <CornerDownRight className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="absolute inset-0 rounded-[34px] border border-[#d6defc] bg-white px-6 py-6 shadow-[0_28px_70px_rgba(27,38,77,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="inline-flex rounded-full bg-[#e8f8ef] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#2f9d64]">
                    Answer
                  </div>
                  <p className="mt-8 text-lg leading-relaxed text-on-surface">
                    Oxygen is the final electron acceptor. When it drops, the chain slows, proton pumping falls, and ATP output drops with it.
                  </p>
                  <motion.div
                    className="mt-6 rounded-[22px] bg-[#eff8f2] px-4 py-4 text-[#1f7d4f]"
                    style={{ opacity: feedbackOpacity, y: feedbackY }}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em]">Feedback</p>
                    <p className="mt-1 text-sm font-bold">Correct. Weak areas update after this card.</p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute right-[9%] top-[15%] w-[28%] rounded-[30px] border border-[#dce3ff] bg-white px-5 py-5 shadow-[0_18px_42px_rgba(27,38,77,0.08)]"
            style={{ opacity: progressOpacity, scale: progressScale }}
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Progress</p>
                <p className="text-sm font-bold text-on-surface">Session lift</p>
              </div>
            </div>
            <div className="mt-5 flex h-28 items-end gap-2">
              {[34, 46, 58, 49, 73, 92].map((height, index) => (
                <motion.div
                  key={height}
                  className="w-full rounded-t-[10px] bg-primary/80"
                  style={{
                    height: useTransform(progress, [0.78, 0.94], ['0%', `${height}%`]),
                    opacity: useTransform(progress, [0.78, 0.94], [0.35, 1]),
                  }}
                  transition={{ delay: index * 0.03 }}
                />
              ))}
            </div>
            <motion.div className="mt-4 space-y-2" style={{ opacity: weakOpacity }}>
              {['Enzyme regulation', 'Respiration order', 'Lab interpretation'].map((topic, index) => (
                <div key={topic} className="flex items-center justify-between gap-3 rounded-[16px] bg-[#f5f7ff] px-3 py-2">
                  <span className="text-sm font-medium text-on-surface">{topic}</span>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#d2763b]">
                    {index === 0 ? 'Weak' : index === 1 ? 'Rising' : 'Stable'}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute bottom-[9%] left-[16%] flex items-center gap-3 rounded-full border border-[#dce3ff] bg-white/90 px-4 py-3 shadow-[0_16px_36px_rgba(27,38,77,0.08)]"
            style={{ opacity: feedbackOpacity, y: feedbackY }}
          >
            <div className="rounded-full bg-[#eef3ff] p-2 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Continuous flow</p>
              <p className="text-sm font-bold text-on-surface">Messy source becomes study signal.</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
