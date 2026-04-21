import { useState, type ReactNode, type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;
type NavPill = { label: string; href: string; active?: boolean };
type SocialCard = { thumbnail: string; views: string; caption?: string };

const NAV_PILLS: NavPill[] = [
  { label: 'Students', href: '/', active: true },
  { label: 'Teachers', href: 'https://knowt.com/teachers' },
  { label: 'Schools', href: 'https://knowt.com/schools' },
  { label: 'Explore', href: 'https://knowt.com/explore' },
  { label: 'Exams', href: 'https://knowt.com/exams' },
] as const;

const HERO_ACTIONS = [
  { label: 'App Store', subtitle: 'Download on the', icon: '/landing-clone/images/apple-icon-white.svg', kind: 'auth' as const },
  { label: 'Google Play', subtitle: 'Get it on', icon: '/landing-clone/images/play-store.svg', kind: 'noop' as const },
  { label: 'Website', subtitle: 'Continue on the', icon: '/landing-clone/images/computer-colored.svg', kind: 'scroll' as const, target: 'downloads-section' },
] as const;

const FLOATING_CARDS = [
  {
    icon: '/landing-clone/images/live-recording.png',
    iconBg: '#FCE4EC',
    title: 'AI Lecture Notetaker',
    body: 'Record your next lecture and instantly get detailed notes, flashcards, quizzes, and games',
    offset: 'left-0',
    top: 'top-[185px]',
  },
  {
    icon: '/landing-clone/images/ai-summarizer-purple-sparkle.svg',
    iconBg: '#E9E4FC',
    title: 'AI PDF Summarizer',
    body: 'Uploads long readings or slides to turn them into study guides or interactive active recall study methods.',
    offset: 'right-0',
    top: 'top-[260px]',
  },
  {
    icon: '/landing-clone/images/call-with-kai-icon.png',
    iconBg: '#E3F7EE',
    title: 'Voice Tutoring & Podcasts',
    body: 'Kai can quiz you out loud or make you a podcast on any subject or subtopic.',
    offset: 'left-0',
    top: 'top-[360px]',
  },
] as const;

const UNIVERSITIES = ['Harvard', 'Yale1', 'Northwestern', 'UCBerkeley', 'UC-Davis', 'Rutgers', 'Stanford', 'Michigan', 'Princeton'] as const;
const MARQUEE_UNIVERSITIES = [...UNIVERSITIES, ...UNIVERSITIES];

const COMPARISON_BULLETS = [
  { icon: FileTextIcon, label: 'Upload your PDFs to our', link: 'PDF Summarizer' },
  { icon: VideoIcon, label: 'Find or upload a YouTube video to our', link: 'Video Summarizer' },
  { icon: MicIcon, label: 'Record your lectures on our', link: 'AI Lecture Summarizer' },
] as const;

const SOCIAL_CARDS: SocialCard[] = [
  { thumbnail: '/landing-clone/images/landing/landing-video-0-thumbnail.png', views: '14M' },
  { thumbnail: '/landing-clone/images/landing/landing-video-1-thumbnail.png', views: '282.7K' },
  { thumbnail: '/landing-clone/images/landing/landing-video-2-thumbnail.png', views: '1.3M' },
  { thumbnail: '/landing-clone/images/landing/landing-video-3-thumbnail.png', views: '344.5K', caption: 'This is how you can\nget a 5 in AP Gov' },
  { thumbnail: '/landing-clone/images/landing/landing-video-4-thumbnail.png', views: '281K', caption: 'How to actually learn\nyour practice problems' },
  { thumbnail: '/landing-clone/images/landing/landing-video-5-thumbnail.png', views: '4.7M' },
  { thumbnail: '/landing-clone/images/landing/landing-video-6-thumbnail.png', views: '1.8M' },
  { thumbnail: '/landing-clone/images/landing/landing-video-7-thumbnail.png', views: '923K' },
  { thumbnail: '/landing-clone/images/landing/landing-video-8-thumbnail.png', views: '612K' },
  { thumbnail: '/landing-clone/images/landing/landing-video-9-thumbnail.png', views: '2.4M' },
  { thumbnail: '/landing-clone/images/landing/landing-video-10-thumbnail.png', views: '500K' },
] as const;

const REVIEWS = [
  {
    title: 'a lifesaver in studying',
    body: 'even if Quizlet had not ceased to be a free service, I have to say I would still choose Knowt over it. overall, it\'s a fantastic resource and perfect for students.',
  },
  {
    title: "Quizlet's cheaper, younger, hotter, cooler sister!!",
    body: "I love Knowt, the free version is much better than Quizlet. It's a great app and I highly recommend it",
  },
  {
    title: 'Amazing app!',
    body: "Has so many great pre-made resources like notes and flashcards and it's all free to use, unlike some other flashcard apps (I'm looking at you Quizlet). I'm so grateful to the developers of Knowt, thank you!",
  },
] as const;

const AP_BULLETS = [
  { icon: DocumentCheckIcon, label: 'Detailed study guides & flashcards in our', link: 'AP Exam Hub' },
  { icon: ChecklistIcon, label: 'Do unlimited problems in our', link: 'Practice Test Room' },
  { icon: PencilSquareIcon, label: 'Practice unlimited FRQs with automatic grading in our', link: 'Free-Response Room' },
  { icon: CalculatorIcon, label: 'Worried about how you\'ll do? Try our', link: 'AP Score Calculator' },
] as const;

const NOTES = [
  { title: 'Le Cours intensif 2 - Leçon 4', pages: 142, updated: '4d ago' },
  { title: 'GI06 - Viral Gastroenteritis and…', pages: 140, updated: '44d ago' },
  { title: 'Chemie: namen en symbolen van…', pages: 55, updated: '430d ago' },
  { title: 'Unit 9: Protein Synthesis', pages: 32, updated: '399d ago' },
  { title: 'OP Part A Khan Study Guide…', pages: 25, updated: '871d ago' },
  { title: 'Expérience en cours', pages: 83, updated: '1226d ago' },
  { title: 'FUNGI CHAPTER 24', pages: 45, updated: '529d ago' },
  { title: 'Unit 6 Gradesavers Kaji', pages: 47, updated: '1124d ago' },
  { title: 'AP Biology Chapter 14 Review', pages: 96, updated: '212d ago' },
  { title: 'Chapter 1: The Cell Cycle', pages: 28, updated: '87d ago' },
  { title: 'Ancient Rome Study Guide', pages: 62, updated: '301d ago' },
  { title: 'Statistics Chapter 7 Notes', pages: 74, updated: '155d ago' },
] as const;

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: 'Why is Knowt the best free Quizlet alternative?',
    a: (
      <>
        5 million free flashcards, notes and study guides created by students, and also free AI study tools for
        studying them completely free in seconds. You can go through unlimited rounds of our free learn mode,
        matching game, spaced repetition or practice test mode. Plus, if you want, you can also create your own
        flashcards or have AI <a href="#" className="underline underline-offset-4">make Flashcards from your lecture videos</a>,
        pdfs, notes, and more! If that&apos;s not for you, you can find millions of free flashcards made by
        other students at your fingertips. There&apos;s a lot of great free study tools and resources to take
        advantage on Knowt that make it a great free quizlet alternative.
      </>
    ),
  },
  { q: 'How can I make new flashcards on Knowt?', a: 'Creating flashcards on Knowt takes seconds — upload a PDF or video and our AI generates them instantly, or type them out manually in our clean editor.' },
  { q: 'What features are paid on Quizlet?', a: "Most of Quizlet's core study modes (Learn, Test, Match advanced) are now paywalled. On Knowt, every mode is free forever." },
  { q: 'How do I use learn mode on Knowt?', a: "Open any flashcard set and tap Learn. Knowt's adaptive algorithm surfaces the cards you're struggling with more often so you master the set faster." },
  { q: 'What makes Knowt better than Quizlet?', a: 'Knowt gives you AI notetaking, PDF and lecture summarization, and unlimited free flashcard study modes in one place. No paywalls, no ads between study rounds.' },
  { q: 'Does Knowt replace traditional study methods?', a: 'It complements them. Students use Knowt to actively recall material faster than re-reading notes, then switch to long-form practice when exams get closer.' },
  { q: 'What types of files can Knowt take notes on?', a: "PDFs, lecture videos, YouTube links, PowerPoint slides, spreadsheets, Google Drive files — anything you'd pull up before an exam." },
  { q: 'What are the different types of flashcard study modes on Knowt?', a: 'Learn, Spaced Repetition, Match, Practice Test, Write mode and Voice Quizzing — all free.' },
  { q: 'What subjects do Knowt’s AI study tools work on?', a: 'Every subject — AP, IB, A-Level, GCSE, language courses, university material, professional certifications and more.' },
  { q: 'Can I use Knowt to study for AP exams?', a: 'Yes — we built a dedicated AP Exam Hub with cram sheets, FRQ practice, mock exams and a score calculator for every AP subject.' },
  { q: 'Is it Knowt or Knowit?', a: "It's Knowt — no 'i'. But we answer to both." },
];

const FOOTER_COLUMNS = [
  {
    heading: 'Get Knowt',
    links: [
      ['Mobile App', 'https://knowt.com/mobile'],
      ['Chrome Extension', 'https://knowt.com/chrome-extension'],
      ['Bulk Discounts', 'https://knowt.com/schools/bulk-pricing'],
      ['Teachers', 'https://knowt.com/free-ai-tools-for-teachers'],
      ['Feedback', 'https://feedback.knowt.com/'],
      ['Student Plans', 'https://knowt.com/plans'],
      ['Teacher Plans', 'https://knowt.com/plans'],
      ['Knowt vs Quizlet', 'https://knowt.com/free-quizlet-alternative'],
      ['Knowt vs Fiveable', 'https://knowt.com/free-fiveable'],
    ],
  },
  {
    heading: 'Study Tools',
    links: [
      ['AI Flashcards', 'https://knowt.com/flashcards'],
      ['AI PDF Summarizer', 'https://knowt.com/ai-pdf-summarizer'],
      ['AI PPT Summarizer', 'https://knowt.com/ai-powerpoint-summarizer'],
      ['AI Video Summarizer', 'https://knowt.com/ai-video-summarizer'],
      ['AI Lecture Note Taker', 'https://knowt.com/ai-lecture-note-taker'],
      ['AI Spreadsheet Summarizer', 'https://knowt.com/ai-spreadsheet-summarizer'],
      ['Flashcard Maker', 'https://knowt.com/flashcards'],
    ],
  },
  {
    heading: 'Exams',
    links: [
      ['AP Exam Hub', 'https://knowt.com/exams/AP'],
      ['IB Exam Hub', 'https://knowt.com/exams/IB'],
      ['GCSE Exam Hub', 'https://knowt.com/exams/GCSE'],
      ['A-Level Exam Hub', 'https://knowt.com/exams/A-Level'],
      ['More Exam Hubs', 'https://knowt.com/exams'],
      ['Practice Test Room', 'https://knowt.com/exams/AP/practice-test-room'],
      ['Free-Response Room', 'https://knowt.com/exams/AP/frq-room'],
      ['AP Score Calculator', 'https://knowt.com/exams/AP/score-calculator'],
    ],
  },
  {
    heading: 'Resources',
    links: [
      ['FAQ', 'https://help.knowt.com/en/'],
      ['Contact Us', '#'],
      ['Student Discounts', 'https://connect.studentbeans.com/v4/hosted/knowt/us'],
      ['Blog', 'https://knowt.com/blog'],
      ['DMCA Takedown', 'https://airtable.com/appOQ60Ha2ExbRtqD/shrJ6uvoMURquZOSC'],
      ['Privacy Policy', 'https://knowt.com/privacy'],
      ['COPPA Notice', 'https://knowt.com/coppa-notice'],
      ['Terms of Service', 'https://knowt.com/terms'],
    ],
  },
  {
    heading: 'Subjects',
    links: [
      ['Science', 'https://knowt.com/subject/Science'],
      ['Social Studies', 'https://knowt.com/subject/Social-Studies'],
      ['Language', 'https://knowt.com/subject/Language'],
      ['Math', 'https://knowt.com/subject/Math'],
      ['Engineering', 'https://knowt.com/subject/Engineering'],
      ['Business', 'https://knowt.com/subject/Business'],
    ],
  },
] as const;

const SOCIALS = [
  { icon: TikTokIcon, href: 'https://www.tiktok.com/@getknowt', label: 'TikTok' },
  { icon: InstagramIcon, href: 'https://instagram.com/getknowt', label: 'Instagram' },
  { icon: FacebookIcon, href: 'https://www.facebook.com/getknowt', label: 'Facebook' },
  { icon: TwitterIcon, href: 'https://twitter.com/getknowt', label: 'Twitter' },
  { icon: LinkedInIcon, href: 'https://www.linkedin.com/company/knowt', label: 'LinkedIn' },
] as const;

export const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHeroAction = (action: (typeof HERO_ACTIONS)[number]) => {
    if (action.kind === 'auth') {
      onGetStarted();
      return;
    }
    if (action.kind === 'scroll') {
      scrollTo(action.target);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0D0D0D]">
      <nav className="sticky top-0 z-40 w-full bg-transparent">
        <div className="mx-auto flex w-full items-center justify-between gap-4 bg-white px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/landing-clone/images/knowt-mascot.png" alt="Knowt" className="h-[29px] w-[29px]" />
            <img src="/landing-clone/images/knowt-wordmark.svg" alt="Knowt" className="hidden h-5 w-[79px] md:block" />
          </a>

          <div className="hidden rounded-full border border-[#EEEEEE] bg-[#F7F8FA] p-1 md:flex">
            {NAV_PILLS.map((pill) =>
              pill.active ? (
                <span key={pill.label} className="flex items-center rounded-full bg-[#0D0D0D] px-6 py-2 text-[15px] font-semibold text-white">
                  {pill.label}
                </span>
              ) : (
                <a
                  key={pill.label}
                  href={pill.href}
                  className="flex items-center rounded-full px-6 py-2 text-[15px] font-medium text-[#0D0D0D] transition-colors hover:bg-white"
                >
                  {pill.label}
                </a>
              ),
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGetStarted}
              className="rounded-full border border-[#EEEEEE] bg-white px-5 py-2 text-[15px] font-semibold text-[#0D0D0D] transition-colors hover:bg-[#F7F8FA]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="hidden rounded-full bg-[#50D2C2] px-5 py-2 text-[15px] font-semibold text-[#0D0D0D] transition-colors hover:brightness-95 sm:inline-flex"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden bg-white pb-24 pt-10">
          <h1 className="mx-auto max-w-[1000px] px-6 text-center text-5xl font-extrabold leading-[1.05] tracking-tight text-[#0D0D0D] sm:text-6xl md:text-[76px]">
            Every AI Study Tool
            <br />
            You Need for a 4.0
          </h1>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 px-6">
            {HERO_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleHeroAction(action)}
                className="group flex items-center gap-3 rounded-full bg-[#0D0D0D] px-7 py-4 text-white transition-transform hover:scale-[1.02]"
              >
                <img src={action.icon} alt="" className="h-7 w-7" />
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium opacity-90">{action.subtitle}</span>
                  <span className="text-[17px] font-bold">{action.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="relative mx-auto mt-16 flex min-h-[640px] max-w-[1200px] items-start justify-center px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-10 h-[700px] w-[780px] -translate-x-1/2 rounded-full blur-3xl"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(227, 203, 247, 0.55), rgba(252, 228, 236, 0.35) 55%, transparent 80%)',
              }}
            />

            <div className="relative z-10">
              <img
                src="/landing-clone/images/iphone-17.png"
                alt="Knowt AI Lecture Summarizer on iPhone"
                className="mx-auto h-auto w-[320px] md:w-[365px]"
              />
            </div>

            <div className="pointer-events-none absolute inset-0 hidden md:block">
              {FLOATING_CARDS.map((card) => (
                <div
                  key={card.title}
                  className={`absolute ${card.offset} ${card.top} pointer-events-auto max-w-[300px] rounded-2xl border border-[#EEEEEE] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: card.iconBg }}>
                      <img src={card.icon} alt="" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[#0D0D0D]">{card.title}</p>
                      <p className="mt-1 text-[13px] leading-snug text-[#0D0D0D]/80">{card.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <svg aria-hidden className="pointer-events-none absolute left-[280px] top-[210px] z-[5] hidden md:block" width="180" height="120" viewBox="0 0 180 120" fill="none">
              <path d="M10 50 C 60 10, 120 10, 165 55" stroke="#0D0D0D" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M155 42 L 168 56 L 152 63" stroke="#0D0D0D" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg aria-hidden className="pointer-events-none absolute right-[280px] top-[300px] z-[5] hidden md:block" width="180" height="120" viewBox="0 0 180 120" fill="none">
              <path d="M170 60 C 130 20, 70 20, 15 70" stroke="#0D0D0D" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M24 60 L 12 72 L 28 78" stroke="#0D0D0D" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="mt-10 flex flex-col gap-4 px-6 md:hidden">
            {FLOATING_CARDS.map((card) => (
              <div key={card.title} className="rounded-2xl border border-[#EEEEEE] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: card.iconBg }}>
                    <img src={card.icon} alt="" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#0D0D0D]">{card.title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-[#0D0D0D]/80">{card.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white pb-24 pt-20">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[48px]">
              1,267,452 users across the top schools
            </h2>
            <p className="mt-4 text-lg text-[#0D0D0D]/90 sm:text-[20px]">
              If you&apos;re not using Knowt you&apos;re already behind.
            </p>
          </div>

          <div className="mt-14 overflow-hidden">
            <div className="flex w-max animate-[marquee-x_40s_linear_infinite]">
              {MARQUEE_UNIVERSITIES.map((university, index) => (
                <div key={`${university}-${index}`} className="mx-10 flex shrink-0 items-center justify-center">
                  <img
                    src={`/landing-clone/images/universities/${university}.png`}
                    alt={university.replace(/\d+$/, '')}
                    className="h-[80px] w-auto object-contain opacity-90"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0D0D0D] py-24 text-white">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-16 px-6 md:flex-row">
            <div className="relative w-full md:w-[55%]">
              <div className="absolute inset-0 -rotate-2 rounded-[32px] bg-[#BDE8C9]" />
              <div className="relative rounded-[24px] bg-[#141414] p-2 shadow-2xl">
                <img
                  src="/landing-clone/images/pdf-summarizer-dark.png"
                  alt="Knowt AI PDF Summarizer dark UI"
                  className="h-auto w-full rounded-[18px]"
                />
              </div>
            </div>

            <div className="w-full md:w-[45%]">
              <h2 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-[46px]">
                The #1 Quizlet Alternative with AI Study Tools
              </h2>
              <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-white/80">
                Picking the perfect AI study tool can be tough, so we built everything in one spot!
              </p>

              <ul className="mt-10 flex flex-col gap-6">
                {COMPARISON_BULLETS.map(({ icon: Icon, label, link }) => (
                  <li key={link} className="flex items-center gap-4 text-[16px]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      {label}{' '}
                      <a href="#" className="font-semibold underline-offset-4 hover:underline">
                        {link}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white pb-24 pt-24">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[48px]">
              Yes you&apos;ve seen us everywhere
            </h2>
            <p className="mt-4 text-[18px] text-[#0D0D0D]/90">
              On TikTok, Instagram, and all your campuses
            </p>
          </div>

          <div className="no-scrollbar mt-14 flex gap-5 overflow-x-auto px-6 pb-4 md:px-12">
            {SOCIAL_CARDS.map((card, index) => (
              <article
                key={card.thumbnail}
                className="group relative h-[480px] w-[250px] shrink-0 overflow-hidden rounded-[18px] bg-[#0D0D0D] shadow-md transition-transform hover:-translate-y-1"
              >
                <img src={card.thumbnail} alt={`Knowt video ${index + 1}`} className="h-full w-full object-cover" />
                {card.caption ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 px-4">
                    <p className="whitespace-pre-line text-center text-[18px] font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      {card.caption}
                    </p>
                  </div>
                ) : null}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-sm">
                  <PlayIcon className="h-3 w-3" />
                  {card.views}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#F7F8FA] pb-28 pt-24">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="flex items-center justify-center gap-6">
              <img src="/landing-clone/images/laurel-left.svg" alt="" className="h-[100px] w-auto md:h-[130px]" aria-hidden />
              <div className="text-center">
                <p className="text-5xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[56px]">4.8 Stars</p>
                <p className="mt-2 text-[18px] text-[#0D0D0D]/80">6,200+ Reviews</p>
              </div>
              <img src="/landing-clone/images/laurel-right.svg" alt="" className="h-[100px] w-auto md:h-[130px]" aria-hidden />
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {REVIEWS.map((review) => (
                <article key={review.title} className="flex flex-col items-center gap-4 rounded-2xl bg-white px-6 py-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <StarFilledIcon key={index} className="h-5 w-5" />
                    ))}
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0D0D0D]">{review.title}</h3>
                  <p className="text-[14px] leading-relaxed text-[#0D0D0D]/80">{review.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[48px]">
              50% of all AP Students use Knowt
            </h2>
            <p className="mx-auto mt-5 max-w-[700px] text-[18px] text-[#0D0D0D]/90">
              At least 700,000 of 1.3 million students used Knowt for the May 2025 AP season. What sign are you waiting for?
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-[1100px] items-center gap-12 px-6 md:grid-cols-2">
            <div className="relative">
              <div className="absolute inset-0 -rotate-2 rounded-[32px] bg-[#FFEEE2]" />
              <div className="relative rounded-[20px] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                <img src="/landing-clone/images/ap-chemistry-screen.png" alt="AP Chemistry exam hub preview" className="h-auto w-full rounded-[14px]" />
              </div>
            </div>

            <ul className="flex flex-col gap-6">
              {AP_BULLETS.map(({ icon: Icon, label, link }) => (
                <li key={link} className="flex items-start gap-4 text-[16px] text-[#0D0D0D]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7F8FA] text-[#0D0D0D]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-relaxed">
                    {label}{' '}
                    <a href="#" className="font-semibold underline underline-offset-4">
                      {link}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-[#F7F8FA] py-24">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mx-auto max-w-[800px] text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[48px]">
                Still not convinced?
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-[#0D0D0D]/80 sm:text-[18px]">
                Start browsing our top notes &amp; flashcards across a library of 5 million+ resources across every subject, language, and exam.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {NOTES.map((note) => (
                <article
                  key={note.title}
                  className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFEEE2] text-[#0D0D0D]">
                    <NotebookIcon className="h-6 w-6" />
                  </div>
                  <div className="mt-6 flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-[#0D0D0D]">{note.title}</h3>
                    <span className="rounded-md bg-[#F7F8FA] px-2 py-0.5 text-[12px] font-semibold text-[#0D0D0D]/70">
                      {note.pages}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#0D0D0D]/60">Updated {note.updated}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[13px] text-[#0D0D0D]/60">
                    <span>0.0</span>
                    <StarFilledIcon className="h-3.5 w-3.5 opacity-40" />
                    <span>(0)</span>
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-2">
                    <button type="button" aria-label="Bookmark" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F8FA] text-[#0D0D0D] transition-colors hover:bg-[#EEEEEE]">
                      <BookmarkIcon className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="More" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F8FA] text-[#0D0D0D] transition-colors hover:bg-[#EEEEEE]">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="downloads-section" className="bg-white py-24">
          <div className="mx-auto grid max-w-[1100px] gap-8 px-6 md:grid-cols-2">
            <article className="flex flex-col items-center gap-5 rounded-[28px] bg-[#F7F8FA] px-10 py-16 text-center">
              <h3 className="text-5xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[56px]">For Mobile</h3>
              <p className="text-[17px] text-[#0D0D0D]/80">Scan the QR code below</p>
              <img
                src="/landing-clone/images/knowt-mobile-qr.png"
                alt="Scan to download Knowt mobile app"
                className="mt-4 h-[200px] w-[200px] rounded-xl bg-white p-2 shadow-sm"
              />
            </article>

            <article className="flex flex-col items-center gap-5 rounded-[28px] bg-[#F7F8FA] px-10 py-16 text-center">
              <h3 className="text-5xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[56px]">For Desktop</h3>
              <p className="text-[17px] text-[#0D0D0D]/80">Use Knowt on your computer</p>
              <button
                type="button"
                onClick={onGetStarted}
                className="mt-4 flex h-[200px] w-[260px] flex-col items-center justify-center gap-3 rounded-[20px] bg-[#0D0D0D] text-white transition-transform hover:scale-[1.02]"
              >
                <div className="flex h-[70px] w-[90px] items-center justify-center">
                  <img src="/landing-clone/images/computer-colored.svg" alt="" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[13px] font-medium opacity-90">Continue on the</span>
                  <span className="text-[17px] font-bold">Website</span>
                </div>
              </button>
            </article>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-[1000px] px-6">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-[#0D0D0D] sm:text-[56px]">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-[18px] text-[#0D0D0D]/80">We&apos;re on the hot seat.</p>
            </div>

            <ul className="mt-14 flex flex-col gap-4">
              {FAQS.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <li key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-center justify-between gap-4 rounded-[28px] px-7 py-6 text-left transition-colors ${
                        isOpen ? 'bg-[#F7F8FA]' : 'bg-[#F7F8FA] hover:bg-[#EFF1F4]'
                      }`}
                    >
                      <span className="text-[17px] font-bold text-[#0D0D0D] sm:text-[18px]">{item.q}</span>
                      <span className="shrink-0 text-[#0D0D0D]">{isOpen ? <MinusIcon /> : <PlusIcon />}</span>
                    </button>
                    {isOpen ? (
                      <div className="mt-0 rounded-b-[28px] bg-[#F7F8FA] px-7 pb-8 text-[15px] leading-relaxed text-[#0D0D0D]/80 sm:text-[16px]">
                        {item.a}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-[#E7E7E7] px-6 pb-8 pt-14 sm:px-12">
        <div className="mx-auto max-w-[1300px]">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h4 className="text-[18px] font-extrabold text-[#0D0D0D]">{column.heading}</h4>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[15px] text-[#0D0D0D] transition-opacity hover:opacity-70">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <p className="text-[14px] text-[#0D0D0D]/80">© 2026 Knowt Inc.</p>
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D0D0D] text-white transition-transform hover:scale-105"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <p className="mt-10 max-w-[1200px] text-[11px] leading-relaxed text-[#0D0D0D]/70">
            Advanced Placement® AP®, and SAT® are trademarks registered by the College Board, which is not
            affiliated with, and does not endorse, this product. ACT® is a trademark registered by the ACT, Inc,
            which is not affiliated with, and does not endorse, this product.
          </p>
        </div>
      </footer>
    </div>
  );
};

function PlusIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MinusIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BookmarkIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MoreVerticalIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function StarFilledIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#F4B400" stroke="#F4B400" strokeWidth="1" className={className} {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PlayIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className={className} {...props}>
      <polygon points="8 5 19 12 8 19" />
    </svg>
  );
}

function DocumentCheckIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </svg>
  );
}

function ChecklistIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
      <path d="M9 17h6" />
    </svg>
  );
}

function PencilSquareIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function CalculatorIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="12" y1="10" x2="14" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="12" y1="14" x2="14" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="12" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function FileTextIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function VideoIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function MicIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="currentColor" strokeWidth="0" className={className} {...props}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TikTokIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={className} {...props}>
      <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.956-1.282-2.645h.004C16.368 1.105 16.4 0 16.4 0h-3.598v14.064c0 .19 0 .376-.008.56-.001.023-.003.044-.004.068l-.002.032v.007a3.092 3.092 0 0 1-1.554 2.447 3.04 3.04 0 0 1-1.51.404c-1.698 0-3.075-1.385-3.075-3.094 0-1.71 1.377-3.094 3.075-3.094.321 0 .641.052.946.155l.004-3.66a6.775 6.775 0 0 0-1.014-.076c-3.71 0-6.717 3.006-6.717 6.715S5.95 21.24 9.66 21.24 16.378 18.234 16.378 14.525V7.28a9.767 9.767 0 0 0 5.624 1.797V5.497a5.758 5.758 0 0 1-2.681.065z" />
    </svg>
  );
}

function InstagramIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={className} {...props}>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function TwitterIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={className} {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={className} {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function NotebookIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
