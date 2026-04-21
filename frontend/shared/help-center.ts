export const HELP_TASKS = [
  {
    id: "create-kit",
    icon: "book",
    eyebrow: "Start studying",
    title: "Create a new kit",
    description: "Paste notes or upload a file to generate a study kit.",
    bullets: ["Best for first-time setup", "Fastest way to get into review"],
    cta: "Open creator",
  },
  {
    id: "recover-session",
    icon: "wrench",
    eyebrow: "Fix a session",
    title: "Recover a session",
    description: "Return to the dashboard, reopen the kit, and resume from the latest study state.",
    bullets: ["Use this if a session did not load cleanly", "Resume works best from the kit itself"],
    cta: "Go to dashboard",
  },
  {
    id: "streaks",
    icon: "flame",
    eyebrow: "Understand streaks",
    title: "How to earn a streak",
    description: "One completed study session before local midnight keeps the streak going.",
    bullets: ["Standard, Focus, Fast Drill, and Weak Review all count", "Missing a full day resets the streak"],
    cta: "Jump to streaks",
  },
  {
    id: "contact-support",
    icon: "lifebuoy",
    eyebrow: "Talk to us",
    title: "Contact support",
    description: "Send what happened, what you expected, and the kit or session involved.",
    bullets: ["Useful for account and deletion requests", "Useful for broken generation or session bugs"],
    cta: "Email support",
  },
] as const;

export const HELP_STREAK_GUIDE = [
  {
    title: "What counts",
    body: "Finish at least one study session on a calendar day. Standard, Focus, Fast Drill, and Weak Review all count once the run completes.",
  },
  {
    title: "When it resets",
    body: "Your streak breaks if you miss a full local day. The next completed session starts a new count.",
  },
  {
    title: "What the calendar means",
    body: "Filled dates show days where you completed study. Weak Review days still extend the streak.",
  },
  {
    title: "Best way to keep it alive",
    body: "Pick one active kit and do a short daily pass. Small sessions are enough if you complete them.",
  },
] as const;

export const HELP_QUICK_FIXES = [
  {
    title: "Session would not open",
    body: "Return to the dashboard, reopen the same kit, and resume from there.",
  },
  {
    title: "Kit looks empty",
    body: "Generation may have failed. Reopen the kit and regenerate from cleaner source text.",
  },
  {
    title: "Progress looks stale",
    body: "Refresh once after a completed session. The latest successful load will stay visible if sync lags.",
  },
  {
    title: "Sign-in is failing",
    body: "Retry with email and password, then reach support if the same provider keeps failing.",
  },
] as const;

export const HELP_FAQS = [
  {
    question: "Why is my kit empty?",
    answer: "A kit can appear empty if extraction or generation failed. Re-open the kit, check the status, then regenerate from cleaner source text.",
  },
  {
    question: "Why do I see retries in sessions?",
    answer: "Retries happen on near-miss answers. The session engine gives you one quick correction chance before marking final correctness.",
  },
  {
    question: "How should I review weak topics?",
    answer: "Use Weak Review or revisit the Progress page to find prompts that need another pass.",
  },
  {
    question: "How do I earn a streak?",
    answer: "Complete at least one study session before local midnight. Any finished study mode counts, and a missed day resets the streak.",
  },
] as const;

export function buildHelpKnowledgeText(): string {
  const tasks = HELP_TASKS.map((task) => {
    return [
      `- ${task.title}: ${task.description}`,
      ...task.bullets.map((bullet) => `  - ${bullet}`),
    ].join("\n");
  }).join("\n");

  const streaks = HELP_STREAK_GUIDE.map((item) => `- ${item.title}: ${item.body}`).join("\n");
  const quickFixes = HELP_QUICK_FIXES.map((item) => `- ${item.title}: ${item.body}`).join("\n");
  const faqs = HELP_FAQS.map((item) => `- ${item.question}: ${item.answer}`).join("\n");

  return [
    "Help Center knowledge:",
    "Tasks:",
    tasks,
    "",
    "Streak guide:",
    streaks,
    "",
    "Quick fixes:",
    quickFixes,
    "",
    "Frequently asked questions:",
    faqs,
  ].join("\n");
}
