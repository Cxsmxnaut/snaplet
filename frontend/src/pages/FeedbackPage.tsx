import { ArrowUpRight, Bug, Lightbulb, MessageSquareHeart } from 'lucide-react';

const feedbackActions = [
  {
    title: 'Report a bug',
    description: 'Tell us what broke, what you expected, and which kit or session was involved.',
    cta: 'Email bug report',
    href: 'mailto:support@snaplet.app?subject=Snaplet%20Bug%20Report',
    icon: Bug,
  },
  {
    title: 'Share a product idea',
    description: 'Send workflow ideas, study-mode requests, or anything you wish the app did better.',
    cta: 'Send product feedback',
    href: 'mailto:support@snaplet.app?subject=Snaplet%20Product%20Feedback',
    icon: Lightbulb,
  },
  {
    title: 'General feedback',
    description: 'Use this for quick reactions, design notes, or anything that would improve the experience.',
    cta: 'Send general feedback',
    href: 'mailto:support@snaplet.app?subject=Snaplet%20Feedback',
    icon: MessageSquareHeart,
  },
] as const;

export const FeedbackPage = ({ onBackToApp }: { onBackToApp?: (() => void) | null }) => {
  return (
    <div className="min-h-screen bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-outline-variant/10 bg-surface p-10 ambient-shadow">
        {onBackToApp ? (
          <button
            type="button"
            onClick={onBackToApp}
            className="mb-6 inline-flex items-center rounded-full border border-outline-variant/16 bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
          >
            Back to app
          </button>
        ) : null}
        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-primary">Feedback</p>
        <h1 className="mb-4 text-4xl font-headline font-black tracking-tight text-on-surface md:text-5xl">
          Help shape Snaplet
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-on-surface-variant">
          If something feels off, missing, or especially helpful, send it through here. We read bug reports,
          product ideas, and rough notes about what would make studying smoother.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {feedbackActions.map((action) => {
            const Icon = action.icon;

            return (
              <a
                key={action.title}
                href={action.href}
                className="group rounded-[24px] border border-outline-variant/14 bg-surface-container-low p-6 transition-colors hover:border-primary/20 hover:bg-surface-container"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-headline font-bold tracking-tight text-on-surface">
                  {action.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                  {action.description}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  <span>{action.cta}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-10 rounded-[24px] border border-outline-variant/12 bg-surface-container-low px-6 py-5">
          <h2 className="text-xl font-headline font-bold text-on-surface">What helps most</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-on-surface-variant">
            <li>Include the kit title or study mode if your note is tied to a specific flow.</li>
            <li>Mention what you expected to happen and what actually happened instead.</li>
            <li>Screenshots or short repro steps help a lot when something feels broken.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
