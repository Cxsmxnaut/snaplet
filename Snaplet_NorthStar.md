# Snaplet North Star

Last consolidated update: 2026-04-17 08:20 PDT

## Purpose

This file is the authoritative long-lived project memory for Snaplet in this workspace.

If this file and a short-lived chat summary disagree, prefer this file after updating it to match the latest truth.

Rules:
- update this file whenever the project meaningfully changes
- prefer consolidation over append-only notes
- timestamp important changes when the historical context matters
- remove stale facts when the truth changes
- keep this usable as a handoff document for another model or engineer

## Current Priorities (DO NOT IGNORE)

Last reframed from the external audit: 2026-04-14

This section is the active execution roadmap. It replaces the older “completed priorities” mindset with a stricter rule:

- first fix trust debt
- then fix persistence and data-truth debt
- then turn visible feature debt into real product capabilities
- only after that add new polish or new surface area

Important interpretation rule:
- if the audit called something “dead UI,” do not assume removal
- if the surface is part of the intended product, keep it and implement it for real
- only remove UI when it is the wrong product direction, not merely unfinished

Working rule:
- trust debt beats feature debt
- product truth beats aesthetic polish
- durable data beats convenient fallback
- explicit failure beats believable lies

### Priority 1: Make Product Truth Real

Status:
- completed on 2026-04-14

Why this matters:
- this is the single biggest adoption and trust blocker
- users will forgive rough edges before they forgive feeling misled
- Snaplet cannot become habit-forming if “saved,” “progress,” and “session complete” are not fully real

Problems included:
- silent local session fallback when session start fails
- session completion implying durable save semantics when the backend truth may not exist
- study routes not being truly session-addressable
- quitting a study session just navigating away instead of having explicit close/resume behavior
- progress load failures collapsing to believable empty-state truth
- in-session metric wording that overclaims what is actually being measured
- any copy that implies durability or adaptivity beyond what the backend actually guarantees

Definition of done:
- session start, continue, quit, resume, and complete are server-truth by default
- progress failures render as actual errors or degraded states, not “empty but fine”
- no core study path silently falls back to browser-local truth unless Snaplet explicitly supports offline mode
- every visible metric and label says exactly what the system can prove

Do not work on before this is stable:
- streak gamification
- extra “coach” messaging
- premium habit loops

Likely systems involved:
- study flow hooks
- session routes
- completion page
- progress fetching
- navigation/state restoration

### Priority 2: Replace Fragile Persistence Architecture

Status:
- completed on 2026-04-14

Why this matters:
- the current data model is still too dependent on `user_states`
- whole-user JSON writes are concurrency-unsafe and not a real long-term product architecture
- this will become a serious scale, debugging, and reliability blocker

Problems included:
- required `user_states` dependency not being fully created or reproducible from repo truth alone
- whole-user JSON bucket writes
- last-write-wins risk across serverless instances
- split truth between legacy bucket data and newer relational analytics
- backfill and migration assumptions that are too optimistic

Definition of done:
- the repo can recreate the persistence layer from migrations alone
- sources, questions, sessions, attempts, and derived progress are row-addressable relational data
- core product behavior no longer depends on whole-bucket upserts
- legacy bucket usage is either eliminated or tightly scoped, documented, and non-critical

Completion notes:
- normalized core-state tables now exist in Supabase and are created by repo migrations:
  - `study_sources`
  - `source_files`
  - `extraction_runs`
  - `study_questions`
- existing legacy core state was backfilled into those tables with a dedicated migration
- the store layer now reads relational state first and writes successful product changes to relational rows instead of a whole-user JSON blob
- paste-kit creation, CSV import, question editing, and review-state creation were verified against the real Supabase project
- `question_progress` contract mismatches that previously caused partial relational writes were fixed
- CSV import was rewritten to use a single atomic mutation instead of a brittle two-step reread flow
- normal relational users no longer silently fall back to `user_states` on write failure; those failures now surface honestly
- `user_states` still exists only as tightly scoped legacy-read / explicit local fallback support, not as the normal source of truth

Do not work on before this is stable:
- collaboration
- public/shared kits
- institutional features
- large analytics expansion

Likely systems involved:
- Supabase migrations
- server store layer
- source/session/question persistence
- analytics backfill

### Priority 3: Fix Cache and Device-Local Trust Leaks

Status:
- completed on 2026-04-14

Why this matters:
- convenience caching is okay
- cross-user contamination, stale truth, and local privacy leaks are not
- this is both a trust problem and a real shared-device risk

Problems included:
- `localStorage` caches that are not scoped by authenticated user
- cached sources/questions being merged into authoritative server lists
- logout not fully purging user-sensitive local truth
- raw study material cached locally in ways that outlive the intended session
- device-local mastery, last-studied, or recency signals leaking into the main product experience

Definition of done:
- all client caches are user-scoped or clearly marked non-authoritative
- logout purges sensitive local state
- cached records never override or silently supplement server truth
- no raw source material is persisted locally by default unless explicitly intended and documented

Completion notes:
- removed the old browser source/question caches from `frontend/src/lib/api.ts`
- `listSources()` no longer merges cached sources into authoritative server truth
- `listSourceQuestions()` no longer resurrects cached questions when the backend returns an empty list
- create-kit draft storage is now explicitly user-scoped instead of global
- logout now purges user-scoped local drafts/cache plus legacy global cache keys
- device-local kit mastery and last-session state are no longer written to `localStorage`
- dashboard / kit recency and mastery now sync from backend `progress.kitBreakdown`, not browser-only maps
- app cache hydration was reduced to non-sensitive UI context (`currentKitId`) instead of restoring kits/progress from local storage
- `/api/sources` now returns source summaries only, so raw study material is not exposed through list payloads
- remaining local storage use is now limited to benign UI preferences or explicitly user-scoped convenience state

Do not work on before this is stable:
- richer personalization
- multi-device “smart” continuity
- offline niceties

Likely systems involved:
- frontend API cache helpers
- local storage utilities
- kit state hooks
- auth/logout flow

### Priority 4: Fix Auth and Identity Model

Status:
- completed on 2026-04-14

Why this matters:
- auth confusion is one of the fastest ways to lose new users
- recovery/reset must match the identity users think they have
- login should never secretly behave like signup

Problems included:
- email vs username/local alias confusion
- login path auto-signing users up on failure
- password reset only working for “real email” flows while the UI suggests broader input support
- auth copy that does not match the actual identity model
- trust loss at the very first interaction with the product

Definition of done:
- Snaplet has one clear primary sign-in model
- login and signup are truly separate and explicit
- password recovery matches the actual identifier users enter
- auth UX no longer contains surprise behavior

Completion notes:
- password auth is now explicitly email-based in the primary auth form
- the hidden username-to-`@snaplet.local` alias path was removed from the frontend auth flow
- login no longer auto-creates accounts on sign-in failure
- signup remains explicit and separate from login
- password reset now validates and uses the same email identity model the form presents to users
- the reset affordance is shown only in login mode, where it is actually relevant
- auth copy and validation errors now align with the real email-based flow

Do not work on before this is stable:
- deeper profile systems
- social/account linking polish
- identity-adjacent growth experiments

Likely systems involved:
- auth page
- Supabase auth integration
- auth hooks
- password reset flow

### Priority 5: Make Progress and Analytics Honest

Status:
- completed on 2026-04-14

Why this matters:
- progress is the retention loop
- if accuracy, mastery, pressure, streak, or recency feel fake, users stop believing the app is helping
- analytics must fail loudly enough to be fixed, not quietly enough to be ignored

Problems included:
- device-local mastery and last-studied values
- placeholder dashboard chart bars or faux trend surfaces
- streak surface without a real durable writer
- analytics sync swallowing database failures
- progress backfill overstating success
- progress reads soft-failing into empty but plausible UI

Definition of done:
- dashboard, progress, and session-complete metrics all come from durable backend truth
- analytics write failures are visible and operationally actionable
- backfills are complete, idempotent, and measurable
- no major stat is local-only unless clearly labeled as such

Completion notes:
- the dedicated Progress page now renders real backend-driven totals, trends, kit breakdowns, recent sessions, weak-question pressure, and recommendation states with explicit loading, empty, and error handling
- dashboard summary cards now use durable backend totals instead of browser-local progress maps
- the dashboard activity chart now reflects real `timeSeries` attempts per day instead of placeholder bar math derived from unrelated outcome counts
- the dashboard weak-focus list no longer invents a fake “success rate”; it now surfaces real recent-miss and near-miss counts
- session-complete and in-session wording were aligned earlier under Priority 1 so they no longer imply fake streak semantics
- the top-bar habit surface now represents real weekly study activity derived from backend session data rather than a pseudo-streak concept with no durable writer
- progress fetch failures now surface honestly instead of collapsing into believable empty-state truth

Do not work on before this is stable:
- more coach copy
- more progress cards
- deeper gamification

Likely systems involved:
- progress page
- analytics write path
- session completion
- dashboard summary surfaces

### Priority 6: Make AI Generation and Answer Checking Product-Grade

Status:
- completed on 2026-04-14

Why this matters:
- Snaplet’s core promise lives or dies on generation quality and believable grading
- if the output is weak, users experience the app as cleanup labor rather than leverage

Problems included:
- generation still being too close to Ollama-or-heuristics
- weak quality gates for generated questions
- answer-check provider order not always matching measured best provider
- provider failure handling and observability not being strong enough
- product messaging implying stronger AI reliability than the implementation can support

Definition of done:
- generation uses a real multi-provider strategy with explicit quality expectations
- answer checking defaults reflect measured best provider quality, not legacy preference
- provider failures, timeouts, and fallbacks are observable
- Snaplet has a lightweight but real evaluation harness for generation and semantic checking

Completion notes:
- question generation and title generation no longer depend on an Ollama-only path; they now use a provider router with pooled keys, timeout handling, parse validation, and ordered fallback across Groq, OpenRouter, and Ollama before dropping to heuristics
- semantic answer checking still only runs after deterministic grading and lexical-equivalence checks say an answer is wrong
- semantic answer checking now defaults to `groq,openrouter,ollama`, matching the best measured provider order rather than the old legacy preference
- provider failures for both generation and semantic grading now log in a structured way instead of disappearing silently
- the repo now includes a second evaluation harness, `npm run test:generation-quality`, alongside `npm run test:semantic-check`
- generation quality can now be compared by parse success, title success, pair count, latency, and structural quality score
- after pulling production envs from Vercel, the live benchmark picture on this machine is:
  - semantic answer checking:
    - `groq`: `100%` on the local benchmark set, `255ms` average latency, one unavailable row (`ATP` abbreviation case)
    - `openrouter`: `95.2%`, `1030ms` average latency
    - `ollama`: unusable in this environment
  - generation/title creation:
    - `groq`: `3/3` question success, `3/3` title success, `584ms` average question latency, quality score `100`
    - `openrouter`: `3/3` question success, `3/3` title success, `2543ms` average question latency, quality score `85`
    - `ollama`: unusable in this environment (`fetch failed`)
- current best measured default remains `groq -> openrouter -> ollama` for both grading and generation in this deployment context

Do not work on before this is stable:
- bigger AI marketing claims
- advanced coach/explanation surfaces that depend on weak output quality

Likely systems involved:
- generation domain logic
- provider clients
- semantic-check routing
- evaluation scripts

### Priority 7: Turn Placeholder or Dead UI Into Real Features

Status:
- complete
- verified:
  - kits sorting is real
  - regenerate is exposed as a real review action
  - profile avatar presets and upgrade CTA are real, not decorative only
  - delete-account now routes into a real support request instead of sitting disabled
  - processing copy is now truthful instead of fake multi-phase theater
  - Auto Review kits are called out explicitly in review/library UI
  - create-kit visibility is wired for private/public
  - shared kit routing is live end to end after adding the missing Vercel dynamic route entries
  - public shared kits load read-only question pages when visibility is `public`
  - switching the same kit back to `private` makes the shared route return `404 Shared kit not found`

Why this matters:
- if a user sees a control, Snaplet should eventually make it real
- visible feature debt should become roadmap, not trash
- unfinished surfaces are acceptable only when they are truthful and intentionally staged

Problems included:
- kits sort control
- upgrade surface
- avatar presets and plus affordance
- create-kit `Public` state without a sharing model
- regenerate UI expectations without an exposed regenerate flow
- fake or theatrical “processing” UI without real async jobs/status/retry semantics
- hidden Auto Review kit creation/editing behavior that appears as normal user content
- any other visible control that exists before the feature does

Definition of done:
- every visible product surface is either:
  - implemented for real
  - disabled with truthful explanation
  - or clearly marked as upcoming in-product
- hidden system behaviors become explicit product concepts if kept
- async processing and regeneration are real capabilities, not theater

Do not work on before this is stable:
- more decorative UI
- more placeholder controls
- more “coming soon” surfaces without a build plan

Likely systems involved:
- create kit
- review flow
- settings/profile UI
- kits page controls
- processing screen

### Priority 8: Fix Legal, Privacy, and Data Disclosure

Status:
- complete
- verified:
  - `/legal/privacy`, `/legal/terms`, `/legal/methodology`, and `/legal/contact` are no longer one-line placeholders
  - the legal surfaces now disclose Supabase-backed storage, public shared-kit visibility, OCR.space fallback, local Tesseract fallback, and AI provider routing across Groq, OpenRouter, and Ollama
  - privacy/methodology copy now reflects the real grading flow: deterministic answer checks first, model fallback second
  - retention and support realities are stated plainly, including support-routed delete-account handling
  - lint and build pass after the rewrite

Why this matters:
- the app uses OCR and multiple AI providers on user-supplied material
- placeholder legal pages are not compatible with serious trust
- this becomes much more important the moment real users, parents, or schools evaluate the product

Problems included:
- placeholder privacy/terms/methodology/contact pages
- missing disclosure for OCR.space and third-party AI provider usage
- no real retention or processor explanation
- product behavior and legal copy not matching

Definition of done:
- legal and privacy pages reflect real runtime behavior
- third-party processors and basic retention rules are disclosed clearly
- the app no longer asks users to trust invisible data flows

Do not work on before this is stable:
- school or institution outreach
- broad public distribution that assumes high trust

Likely systems involved:
- legal pages
- extraction pipeline
- provider routing
- public marketing copy

### Priority 9: Add Product Instrumentation

Status:
- completed on 2026-04-14

Why this matters:
- without instrumentation, the team is flying blind
- it is impossible to improve activation, retention, or provider quality if the funnel is invisible
- strong opinions about what users do are not enough

Problems included:
- no meaningful activation funnel tracking
- no durable visibility into source creation/upload success and failure
- weak visibility into generation/provider failure rates
- no usable instrumentation for session start, quit, complete, or weak-review entry
- no way to measure whether changes actually improve the product

Definition of done:
- key product moments are instrumented end to end
- failures are measurable, not anecdotal
- provider quality and user funnel breakage are visible enough to prioritize confidently

Completion notes:
- Snaplet now records product events into `public.product_events` in Supabase with RLS-enabled policies for:
  - authenticated user-owned inserts
  - anonymous pre-auth inserts with `user_id is null`
- frontend event capture now covers:
  - auth page viewed
  - OAuth started
  - password auth submitted
  - password reset requested
  - sign in
  - sign up
  - sign out
  - source create started / failed
  - upload started / failed
  - weak review opened
  - recommended review opened
  - progress load failed
- backend instrumentation now captures durable server-truth events for:
  - source create succeeded
  - upload succeeded / failed
  - generation succeeded / failed
  - session started
  - session completed
  - provider failures in generation and semantic answer checking
- `/api/events` exists as a best-effort ingestion endpoint for lightweight frontend funnel events
- runtime verification was completed on 2026-04-14:
  - local `POST /api/events` returned `202`
  - matching `auth_viewed` rows were verified in Supabase after the table move to `public.product_events`

Do not work on before this is stable:
- growth experiments based on guesswork
- advanced retention tactics without measurement

Likely systems involved:
- frontend event capture
- API write paths
- provider routing/logging
- analytics dashboards or exported event sinks

### Priority 10: Fix Local Dev and Repo Truth

Status:
- complete
- verified:
  - local runtime scripts now enforce real prerequisites instead of relying on hidden shell state
  - `dev:api` and `dev:full` load `frontend/.env.local` explicitly
  - `dev:api` and `dev:full` fail clearly if `frontend/.vercel/project.json` is missing
  - `test:api` now documents and enforces the `SNAPLET_POSTMAN_AUTH_TOKEN` requirement
  - Postman base URL generation now prefers API-target envs instead of accidentally picking a frontend site URL
  - root and frontend READMEs now describe the actual local bootstrap path
  - repo truth no longer depends on root `.env.local` existing
  - branch/docs truth now reflects `main` instead of the old feature branch

Why this matters:
- a product team moves slower when the repo lies about what is reproducible
- onboarding and debugging both degrade when docs, env assumptions, and actual bootstrap behavior drift apart
- if the project memory is wrong, every future model or teammate starts from fiction

Problems included:
- local dev bootstrap not being fully reproducible on a clean machine
- `dev:full` and test commands depending on hidden setup
- docs and memory referencing files or states that are not actually in repo truth
- environment assumptions not being clear enough
- North Star and README drift from actual runtime reality

Definition of done:
- there is one verified local bootstrap path for frontend, API, auth, and Supabase-backed behavior
- test commands clearly state prerequisites or manage them automatically
- repo docs describe what actually exists, not what used to exist
- North Star stays current enough to trust as handoff memory

Do not work on before this is stable:
- expanding contributor surface area
- assuming new machines will “just work”

Likely systems involved:
- root README
- frontend README
- package scripts
- local env examples
- North Star itself

### Priority Ordering Notes

What would stop Snaplet from becoming widely used if left unfixed:
- users realizing that “saved,” “progress,” and “session complete” are not consistently durable
- weak first-run trust due to auth confusion, fake processing, and hidden fallback behavior
- AI quality that feels like extra cleanup work instead of leverage
- no real legal/privacy trust layer for OCR and AI processing
- no instrumentation to learn what is actually breaking activation and retention

How to sequence the work:
- Priorities 1 through 5 are trust debt and product-truth debt
- Priorities 6 through 8 are quality and trust-expansion debt
- Priorities 9 and 10 are force-multipliers that make every other priority easier to execute well

Explicit anti-distraction rule:
- do not add new study modes, sharing, premium loops, notifications, or extra dashboard polish until the active trust-debt priorities are materially stable
- any trust-heavy user segment push

### Remaining Backend Reality After The 2026-04-17 Hardening Pass

These are still real and should be treated as active backend debt even after the public-sharing fix landed:

- Public sharing is now routed through published snapshot tables, and raw `study_sources` / `study_questions` are no longer publicly readable through anon access.
- The largest remaining backend risk is still the bucket-style write path in `frontend/api/_lib/server/store.ts`.
  - writes are safer than before because file fallback and `user_states` runtime persistence were removed from the real product path
  - broad delete-missing cleanup was also removed, which lowers the chance of accidental destructive rewrites
  - but the architecture is still not truly row-level, transactional, or cross-instance concurrency-safe
- Analytics are still a shadow system rather than canonical truth.
  - progress is much more honest than before
  - but `frontend/api/_lib/server/analytics.ts` is still a best-effort side channel, not a transactional extension of core writes
- Product events are safer than before but not fully hardened.
  - there is now app-layer rate limiting and the public insert policies were removed
  - but event ingestion still needs a more deliberate server-only durability and abuse strategy if it becomes operationally important
- OCR privacy is improved but not fully productized.
  - OCR.space is now opt-in by env gate
  - but there is still no in-product consent/control surface for users uploading sensitive documents
- Account deletion/export and some privacy/account settings are still not real backend capabilities.
  - support and deletion still lean on manual workflows
  - some settings still imply durability that the backend does not truly own yet

What changed materially on 2026-04-17:
- raw public sharing leak was closed by moving public reads to `published_sources` / `published_questions`
- public `get_landing_stats()` RPC was removed
- generation now records provenance so heuristic fallback no longer masquerades as provider-backed success
- normal server data access no longer defaults to service-role scope for user data paths
- duplicate open sessions were constrained with a unique partial index in Supabase

What should happen next on the backend:
1. replace bucket-level writes with row-level transactional writes or RPC-backed mutations
2. decide whether analytics should become canonical events/tables or stay derived and explicitly best-effort
3. finish real account deletion/export and privacy controls before broader trust-sensitive growth

### Completed Foundation Work

These were important and are still true, but they are no longer the active top priorities:

1. Core demo flow
- completed on 2026-04-10
- auth → create/upload → review → study → complete → progress works in production

2. Upload endpoint reliability and FormData parsing
- completed on 2026-04-11
- supported happy path and core failure cases were hardened

3. API response and status normalization
- completed on 2026-04-11
- route status semantics were normalized across major flows

4. Removal/hardening of fake-user auth fallback
- completed on 2026-04-11
- production now requires real auth; explicit dev override remains opt-in only

5. Semantic answer checking upgrade
- completed on 2026-04-11
- deterministic grading first, model fallback second, provider chain implemented

6. Local dev path and observability improvements
- completed on 2026-04-11 to 2026-04-12
- docs, scripts, and provider logging improved materially

Working rule:
- when choosing between shipping a feature and making Snaplet more truthful, choose truth first
- when a visible feature exists but is not real yet, prefer implementing it or truthfully disabling it over deleting it blindly
- when documenting future work, map it into one of the priorities above instead of creating parallel ad hoc lists

## Current Identity

Official project name:
- Snaplet

Current product description:
- Snaplet is an AI-assisted study platform that turns pasted notes and uploaded files into study kits, generated questions, adaptive study sessions, and progress insights.

Current product promise:
- ingest source material
- generate study questions
- review and edit generated questions
- run adaptive study sessions in multiple modes
- persist progress and session analytics
- surface weak spots and study recommendations

Current branding reality:
- the repo and UI have been rebranded to `Snaplet`
- the GitHub repo exists at the lowercase-canonical URL `https://github.com/Cxsmxnaut/snaplet`
- the local git `origin` still points to `https://github.com/Cxsmxnaut/Snaplet.git`, and GitHub redirects it to the lowercase repo

## Canonical Workspace

Canonical local workspace root:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet`

Canonical app directory:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend`

Single-app rule:
- `frontend/` is the only app root that matters
- do not reintroduce duplicate frontend/backend copies outside `frontend/`
- do not move `frontend/api` unless there is an explicit architecture migration

## Repo Shape

Current high-level structure:

```text
snaplet/
├── README.md
├── .gitignore
├── Snaplet_NorthStar.md
├── frontend/
│   ├── .env.example
│   ├── .env.local
│   ├── .vercel/
│   ├── README.md
│   ├── api/
│   ├── postman/
│   ├── scripts/
│   ├── src/
│   ├── index.html
│   ├── metadata.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vercel.json
│   └── vite.config.ts
├── supabase/
│   └── migrations/
├── nimble/                         # local reference material, untracked
└── stitch_snaplet_ui_redesign/     # local reference material, untracked
```

Current untracked/reference-only local items:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/nimble`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/stitch_snaplet_ui_redesign`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/stitch_snaplet_ui_redesign.zip`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/assets`

Important note:
- these reference/design assets are local and currently not part of the committed app state unless explicitly staged later

## Git And Deployment State

Primary git branch in active use:
- `main`

Recent important commits:
- `692cea1` — Fix service typing for deployment build
- `0927f14` — Add Supabase analytics tables and progress sync
- `9d1d470` — Add progress preview mode and refine collapsed sidebar
- `2b46c36` — Overhaul progress insights and refine sidebar shell
- `b03289f` — Refine Snaplet UI flows and shell

Git remotes:
- `origin` → `https://github.com/Cxsmxnaut/Snaplet.git`
- `snaplet-new` → `https://github.com/Cxsmxnaut/snaplet.git`

Canonical GitHub repo to reference:
- `https://github.com/Cxsmxnaut/snaplet`

Current Vercel project linked in `frontend/.vercel/project.json`:
- project name: `frontend`
- project id: `prj_8VOiGx11GNpCYRFMKATJp2gdxbz5`
- org id: `team_aV7ZPHmb0bSI0nAwIJF9gCzx`

Current production URLs known to be live:
- alias: `https://frontend-five-beige-27.vercel.app`
- most recent production deployment at last verification: `https://frontend-1mpuwvsb8-bhavithcosmos-projects.vercel.app`

## Product And UX State

### Current public-site behavior

Public routes:
- `/`
- `/auth`
- `/legal/privacy`
- `/legal/terms`
- `/legal/methodology`
- `/legal/contact`

Public UX direction:
- light theme only
- editorial / premium academic styling
- public landing and auth are intentionally lighter than the signed-in app

### Current signed-in app routes

Main app routes:
- `/app/dashboard`
- `/app/kits`
- `/app/create`
- `/app/progress`
- `/app/help`
- `/app/settings`
- `/app/review/:kitId`
- `/app/study-mode/:kitId`
- `/app/study/:kitId?mode=<mode>`
- `/app/session/:sessionId/complete`

Current signed-in product flows:
1. landing
2. auth
3. dashboard
4. create or upload study source
5. review generated questions
6. choose study mode
7. run adaptive session
8. complete session
9. inspect progress
10. manage settings / help

### Current page inventory

App pages currently implemented in `frontend/src/pages`:
- `LandingPage.tsx`
- `AuthPage.tsx`
- `Dashboard.tsx`
- `KitsPage.tsx`
- `CreateKit.tsx`
- `Processing.tsx`
- `ReviewKit.tsx`
- `StudyModeSelection.tsx`
- `StudySession.tsx`
- `SessionComplete.tsx`
- `ProgressPage.tsx`
- `SettingsPage.tsx`
- `HelpPage.tsx`

### Current UX direction

The current UI is not a dark SaaS dashboard anymore.

The intended design language is:
- light, calm, high-contrast
- editorial and academic
- reduced card overuse
- cool whites, intellectual blues, restrained gray-blue text
- closer in rhythm to Quizlet light mode, but not a direct clone
- public pages and app shell have been manually tuned toward Quizlet-like spacing and sidebar behavior

### Design system source of truth

The standing UI guidance file is:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/design.md`

Important design rules from that file:
- no heavy borders for layout sectioning
- hierarchy through surface shifts instead of boxed cards
- Plus Jakarta Sans for headlines
- Inter for body
- cool white surface hierarchy
- primary gradient `#4255FF` → `#2A3BFF`
- avoid muddy grays, default shadows, and generic SaaS card spam

### Current visual token direction

Core light token family in active use / intended use:
- background: `#FFFFFF`
- surface-container-low: `#F9FAFD`
- surface-container: `#F6F7FB`
- surface-container-high: `#F0F2F8`
- primary: `#4255FF`
- primary-strong: `#2A3BFF`
- primary-container: `#E0E2FF`
- on-surface: `#282E3E`
- on-surface-variant: `#586380`
- outline-variant: `#D9DEE9`

### Sidebar state

Current sidebar goals:
- visually closer to Quizlet’s light sidebar
- narrow icon-only collapsed state
- lighter active fill
- softer dividers
- quieter blue-gray icons/text

Current known behavior:
- collapsed state was refined to behave more like a true icon rail
- top-left toggle icon was changed toward a simpler menu-style icon
- the sidebar is not meant to be a big boxed dashboard column

## Frontend Architecture

Framework/runtime:
- Vite
- React 19
- React Router
- TypeScript

Main entry:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/main.tsx`

Main app shell:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/App.tsx`

Key app shell components:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/components/AppShell.tsx`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/components/Sidebar.tsx`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/components/TopBar.tsx`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/components/Button.tsx`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/components/LegalPage.tsx`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/components/MissingState.tsx`

Feature structure:

```text
frontend/src
├── App.tsx
├── assets/
├── components/
├── features
│   ├── auth/hooks/useAuthSession.ts
│   ├── kits/hooks/useKitsState.ts
│   ├── kits/services/{kitMapper,kitStorage}.ts
│   ├── navigation/logic/routes.ts
│   ├── progress/hooks/useProgressState.ts
│   └── study
│       ├── hooks/useStudyFlow.ts
│       └── services/sessionStorage.ts
├── lib/
├── pages/
└── types.ts
```

Important frontend services:
- `src/lib/api.ts` → primary client/backend contract
- `src/lib/supabase.ts` → browser Supabase client
- `src/lib/debug.ts` → debug logging

## Backend Architecture

Backend location:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api`

Backend model:
- Vercel serverless functions
- thin route files
- shared domain and server logic in `api/_lib`

Current backend internal structure:

```text
frontend/api/_lib
├── domain
│   ├── csv.ts
│   ├── evaluation.ts
│   ├── extraction.ts
│   ├── generation.ts
│   ├── normalize.ts
│   ├── queue.ts
│   └── types.ts
├── server
│   ├── analytics.ts
│   ├── auth.ts
│   ├── http.ts
│   ├── ollama.ts
│   ├── request-context.ts
│   ├── semantic-check.ts
│   ├── service.ts
│   ├── store.ts
│   └── supabase-server.ts
└── vercel-bridge.ts
```

Responsibilities:
- `domain/*` handles extraction, generation, answer evaluation, normalization, and adaptive queueing
- `server/auth.ts` resolves auth context from bearer token and only allows `x-snaplet-user-id` under an explicit local dev override
- `server/request-context.ts` provides request-scoped auth context via `AsyncLocalStorage`
- `server/supabase-server.ts` creates backend Supabase clients
- `server/store.ts` handles the legacy bucket persistence layer
- `server/analytics.ts` handles relational analytics sync and analytics-based progress reads
- `server/service.ts` is the main business-logic layer for sources, questions, sessions, attempts, and progress
- `vercel-bridge.ts` adapts Vercel requests to Fetch-style handlers

## Authentication Model

Current frontend auth:
- browser auth uses Supabase
- `useAuthSession()` is the main auth hook
- sign-in methods include:
  - email/password
  - Google OAuth
  - Apple OAuth
- auth redirect and reset-password flows are handled in `AuthPage.tsx`

Current backend auth:
- route handlers resolve auth context per request
- `authorization: Bearer <supabase access token>` is preferred
- unauthenticated requests now fail with `401 Authentication required`
- `x-snaplet-user-id` is only accepted when `SNAPLET_ALLOW_DEV_USER_OVERRIDE=true` and the request is local (`localhost` / `127.0.0.1`)
- there is no silent `demo_user` fallback anymore

Important reality:
- auth is functional in production
- backend auth is now materially stricter than the earlier MVP state
- client API calls require a real Supabase session token
- any local override is explicit and opt-in

## Persistence And Data Model

### Current persistence reality

The app currently uses two persistence layers:

1. `user_states`
- still stores the main bucket of sources, source files, extraction runs, questions, review states, sessions, and attempts
- still matters for the source/question/session product flow

2. relational analytics tables
- now store progress/session analytics in Supabase
- are the primary source for the richer Progress tab

### Current Supabase project

Project ref:
- `rpbcsawsjpczvzwmhfen`

Known table from earlier system:
- `public.user_states`

Current analytics tables added:
- `public.study_sessions`
- `public.session_attempts`
- `public.question_progress`

Analytics migration files:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/supabase/migrations/20260410_add_analytics_tables.sql`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/supabase/migrations/20260410_add_session_attempts_session_index.sql`

### Current write/read behavior

Verified current behavior:
- creating a source writes through the existing bucket path
- starting a session syncs a `study_sessions` row
- submitting an attempt syncs `session_attempts` and `question_progress`
- ending a session updates the `study_sessions` row with final counts and accuracy
- `GET /api/progress` prefers relational analytics reads
- if no relational analytics rows exist yet, the backend can backfill analytics from the legacy bucket

Verified directly against Supabase during migration:
- real test users wrote rows into:
  - `user_states`
  - `study_sessions`
  - `session_attempts`
  - `question_progress`

### Current storage fallback behavior

`frontend/api/_lib/server/store.ts` behavior:
- first tries Supabase
- falls back to local JSON state if Supabase is unavailable

Local fallback:
- `frontend/.snaplet/state.json`

Serverless fallback:
- writable temp directory under `/tmp`

Important warning:
- fallback temp storage is not durable across independent serverless invocations
- real production durability depends on Supabase writes succeeding

### RLS and security state

Current RLS status:
- RLS is enabled on:
  - `user_states`
  - `study_sessions`
  - `session_attempts`
  - `question_progress`

Current policies:
- authenticated users can select/insert/update/delete only their own rows on those tables

Current backend access pattern:
- backend can use the signed-in user’s JWT via request-scoped Supabase client creation
- if a `SUPABASE_SERVICE_ROLE_KEY` is later added, backend persistence can be simplified and hardened further

Current Supabase advisor state last checked:
- security warning:
  - leaked password protection is disabled in Supabase Auth
- performance note:
  - some indexes are currently reported as unused, which is informational, not blocking
- the missing foreign-key index on `session_attempts.session_id` was already fixed

Recommended security follow-up outside code:
- enable leaked password protection in Supabase Auth settings

## Progress System

Current Progress tab is significantly upgraded compared with the original flat stats view.

Current data contract includes:
- `totals`
- `outcomes`
- `weakQuestions`
- `recentSessions`
- `timeSeries`
- `kitBreakdown`
- `comparisons`
- `recommendations`

Current Progress UX:
- coaching hero with CTA
- trend chart
- comparison summaries
- weak-focus rows
- recent session table
- kit ranking block
- empty/loading/error states
- preview-mode mock data when there is no real history yet

Current backend source of truth for Progress:
- relational analytics tables first
- legacy bucket-derived fallback if relational data is missing

Important implementation note:
- numeric metrics like accuracy/mastery/pressure are deterministic
- Ollama is not used to invent these numbers
- future AI summaries can be layered on top later if desired

## Study Session And Adaptive Logic

Current study modes:
- `standard`
- `focus`
- `weak_review`
- `fast_drill`

Current adaptive session behavior:
- queueing logic lives in `domain/queue.ts`
- study mode affects question cap and review streak behavior
- recent performance influences how aggressively weak items are surfaced
- weak-question pressure and recent correctness influence progress recommendations

Current session persistence:
- sessions start in the bucket and sync to `study_sessions`
- attempts are stored in the bucket and sync to `session_attempts`
- review state updates sync to `question_progress`

## Generation And AI Model Usage

Current generation path:
- source/question generation lives in `frontend/api/_lib/domain/generation.ts`
- multi-provider routing lives in `frontend/api/_lib/server/generation-providers.ts`
- legacy Ollama-specific request code still lives in `frontend/api/_lib/server/ollama.ts` as a provider implementation detail, not the main product strategy

Current generation behavior:
- provider order is controlled by `GENERATION_PROVIDERS`
- default generation order is `groq,openrouter,ollama`
- if a provider errors, times out, or returns invalid JSON, Snaplet rotates to the next configured provider
- only after all configured providers fail does Snaplet fall back to heuristic generation

Important fix already applied:
- Ollama fetch failures now fail soft instead of crashing source creation

Current semantic answer checking:
- handled in `frontend/api/_lib/server/semantic-check.ts`
- only runs after deterministic grading and lexical-semantic checks still say “wrong”
- can use configured providers such as Groq, OpenRouter, and Ollama
- default answer-check provider order is now `groq,openrouter,ollama`

## API Routes

Current backend routes:
- `GET /api/progress`
- `GET /api/sources`
- `POST /api/sources`
- `GET /api/sources/:id`
- `DELETE /api/sources/:id`
- `GET /api/sources/:id/questions`
- `POST /api/sources/:id/questions`
- `POST /api/sources/:id/duplicate`
- `POST /api/sources/:id/generate`
- `PATCH /api/questions/:id`
- `POST /api/questions/bulk`
- `POST /api/import/csv`
- `POST /api/import/upload`
- `POST /api/sessions`
- `POST /api/sessions/:id/attempts`

Route design rule:
- route files should stay thin
- business logic belongs in `frontend/api/_lib/server/service.ts`

## Environment Variables

Variables currently known to matter:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OLLAMA_API_KEY`
- `OLLAMA_API_KEYS`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_ANSWER_CHECK_MODEL`
- `OCR_SPACE_API_KEY`
- `ANSWER_CHECK_PROVIDERS`
- `GROQ_ANSWER_CHECK_MODEL`
- `OPENROUTER_ANSWER_CHECK_MODEL`
- `SEMANTIC_ANSWER_MIN_CONFIDENCE`
- `SEMANTIC_ANSWER_TIMEOUT_MS`
- `SEMANTIC_ANSWER_LOGGING`
- `GROQ_API_KEYS`
- `OPENROUTER_API_KEYS`
- `SNAPLET_ENABLE_FILE_STATE_FALLBACK`
- `SNAPLET_ALLOW_DEV_USER_OVERRIDE`
- `SNAPLET_STATE_DIR`
- `OLLAMA_LOGGING`
- `VITE_API_BASE_URL`
- `VITE_PROXY_TARGET`

Current local env fact:
- canonical local runtime env is `frontend/.env.local`
- root `.env.local` may exist as optional local-only override state, but it is not required for normal repo setup

## Local Development Reality

Current recommended local run modes:

1. `npm run dev:full` from `frontend`
- starts the runtime/API layer on `http://localhost:3000`
- starts the Vite frontend on `http://localhost:5173`
- this is the preferred full-stack local path now
- checks for `frontend/.env.local`
- checks for `frontend/.vercel/project.json`
- loads the local runtime env before starting `vercel dev`
- waits for the API runtime before starting Vite

2. `npm run dev` from `frontend`
- frontend-only or frontend-first path
- use this when the API/runtime target is already running elsewhere

3. `npm run dev:api` from `frontend`
- API/runtime only path
- loads `frontend/.env.local` before starting `vercel dev`
- fails clearly if the local Vercel project link is missing

4. `npm run test:api` from `frontend`
- authenticated Newman/Postman path
- requires `SNAPLET_POSTMAN_AUTH_TOKEN`
- prefers `SNAPLET_POSTMAN_BASE_URL`, `VITE_API_BASE_URL`, or `VITE_PROXY_TARGET` before falling back to `http://localhost:3000`
- auto-starts a local `vercel dev` target when the test target is localhost and not already running
- fails fast with a clear message if auth or runtime prerequisites are missing

Current local caveat:
- real Supabase-backed persistence is the default expectation now
- local file-state persistence only exists when explicitly enabled with `SNAPLET_ENABLE_FILE_STATE_FALLBACK=true`
- browser auth should not silently fall back to local Supabase anymore; missing config now fails loudly instead of pointing at `127.0.0.1:54321`

## Testing And Verification

Current automated verification available:
- `npm run build` in `frontend`
- `npm run lint` in `frontend` runs `tsc --noEmit`
- `npm run test:semantic-check` in `frontend` benchmarks answer-check providers
- `npm run test:generation-quality` in `frontend` benchmarks generation/title providers
- Postman/Newman assets exist in `frontend/postman`

Important current test reality:
- `npm run build` passes
- `npm run lint` passes after the latest TypeScript cleanup
- `npm run dev:api` was verified on an alternate port (`3010`)
- `npm run dev:full` was verified on alternate ports (`3011` API and `5180` frontend)
- `npm run test:api` now exits with a clear missing-token message when `SNAPLET_POSTMAN_AUTH_TOKEN` is not set

Current meaningful runtime checks already performed:
- source creation on local server path
- question generation fallback path
- session start
- attempt submission
- progress fetch
- relational analytics row creation in Supabase
- completed session sync into `study_sessions`
- production deploy after analytics migration
- local runtime health check returning `401 Authentication required` on `/api/progress` when unauthenticated

## Current Known Issues

Known non-blocking issues:
- build still emits a large-chunk warning for the main frontend bundle
- GitHub MCP is configured in Codex, but still does not currently have access to `Cxsmxnaut/snaplet`

Known product-shape compromise:
- app state is still split:
  - legacy bucket in `user_states`
  - analytics in relational tables
- this is workable now, but not the final ideal normalization

## Current Important Files

High-value reference files:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/Snaplet_NorthStar.md`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/design.md`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/App.tsx`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/lib/api.ts`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api/_lib/server/service.ts`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api/_lib/server/store.ts`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api/_lib/server/analytics.ts`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api/_lib/server/auth.ts`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api/_lib/server/supabase-server.ts`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/pages/ProgressPage.tsx`

## Workflow Guidance

Preferred workflow:
- treat `Snaplet_NorthStar.md` as the first file to consult before major changes
- preserve `frontend/` as the single app root
- keep `frontend/api` stable unless there is a planned architectural migration
- validate backend-sensitive changes against actual runtime paths, not only the frontend bundle build
- use Supabase relational tables for analytics-related future work
- use `design.md` as the UI rulebook for future visual changes

When working on UI:
- public pages remain light
- signed-in app may diverge slightly, but should stay in the same design family
- avoid generic dashboard card clutter
- prefer editorial spacing and surface hierarchy

When working on backend/data:
- check whether logic belongs in the legacy bucket or the new analytics tables
- avoid adding more fake/local-only fallbacks without documenting them here
- prefer deterministic metrics for progress

## External Audit Snapshot (2026-04-14)

Source:
- separate Codex audit pass requested to identify anything stopping Snaplet from becoming a widely used, trusted product

### Executive Summary

This repo is not ready to be trusted by a large user base. The UI is polished enough to demo, but the product truth layer is still shaky: sessions can silently drop to browser-local mode, progress can fail soft to empty, and several core stats are still fake or device-local. The backend state model is also fragile: primary product data still rides on a whole-user JSON blob in `user_states`, and the repo does not create that table from migrations. On the trust side, auth is confused, legal/privacy pages are placeholder copy, and the code is wired to send data to third-party OCR/AI providers without real disclosure. On the AI side, generation is still basically Ollama-or-heuristics, while the app presents a much stronger product promise than the implementation can support. Growth readiness is weak too: there is essentially no product instrumentation, the first-run “aha” path is thin, and the canonical project memory overclaims what is actually working. This audit was produced by tracing the code end to end, running `npm run lint` and `npm run build`, exercising the local UI with Playwright, and attempting `npm run dev:full`, `npm run test:api`, and `npm run test:semantic-check`.

### Critical Findings

1. Cross-user/stale browser cache contamination
- Why it matters:
  - same-browser/shared-device users can inherit stale or foreign kits/questions
  - raw study material is cached globally in `localStorage`
  - `listSources()` merges cached sources back into server truth
- Paths:
  - `frontend/src/lib/api.ts` (line 154)
  - `frontend/api/_lib/server/service.ts` (line 33)
  - `frontend/src/features/kits/services/kitStorage.ts` (line 3)
  - `frontend/src/pages/CreateKit.tsx` (line 33)
  - `frontend/src/App.tsx` (line 166)
- Affects:
  - trust
  - privacy
  - reliability
  - scale
- Recommended fix:
  - scope every browser cache by user
  - purge on logout
  - stop merging cached sources into authoritative lists
  - stop serving cached questions when the backend says `[]`
  - do not return full source content in list endpoints

2. Session durability is fake
- Why it matters:
  - any session-start failure silently becomes a browser-local session
  - completion state is restored from `localStorage`
  - the completion page says the run is “saved”
  - study routes are not session-addressable
  - quitting just navigates away
- Paths:
  - `frontend/src/lib/api.ts` (line 507)
  - `frontend/src/features/study/hooks/useStudyFlow.ts` (line 29)
  - `frontend/src/pages/SessionComplete.tsx` (line 38)
  - `frontend/src/features/navigation/logic/routes.ts` (line 43)
  - `frontend/src/pages/StudySession.tsx` (line 113)
  - `frontend/src/App.tsx` (line 433)
  - `frontend/api/_lib/server/analytics.ts` (line 551)
- Affects:
  - trust
  - reliability
  - retention
- Recommended fix:
  - remove silent local fallback from the default product path
  - make sessions server-truth only unless the app explicitly supports offline mode
  - make study URLs session-id based
  - add resume/close semantics
  - back the completion page from server data

3. Core persistence is non-reproducible and concurrency-unsafe
- Why it matters:
  - the app depends on `public.user_states`, but the repo does not create that table
  - state writes upsert the entire bucket JSON
  - concurrent requests are last-write-wins across serverless instances
- Paths:
  - `frontend/api/_lib/server/store.ts` (line 113)
  - `frontend/api/_lib/server/store.ts` (line 191)
  - `supabase/migrations/20260410_add_analytics_tables.sql` (line 169)
  - `supabase/migrations/20260410_add_analytics_tables.sql` (line 1)
- Affects:
  - scale
  - reliability
  - engineering readiness
- Recommended fix:
  - add the missing migration immediately
  - stop using a whole-user JSON blob for core entities
  - move sources/questions/sessions/attempts to normalized tables with row-level writes

4. Analytics and progress fail soft into lies
- Why it matters:
  - analytics sync ignores database errors
  - backfill declares success if any `study_sessions` row exists
  - progress load failures collapse to a truthful-looking empty payload instead of an error
- Paths:
  - `frontend/api/_lib/server/analytics.ts` (line 279)
  - `frontend/api/_lib/server/analytics.ts` (line 323)
  - `frontend/api/_lib/server/analytics.ts` (line 377)
  - `frontend/api/_lib/server/service.ts` (line 1378)
- Affects:
  - trust
  - retention
  - reliability
- Recommended fix:
  - treat write failures as first-class operational errors
  - add retries or a queue
  - make backfill idempotent and complete
  - return explicit failure states when progress truth is unavailable

### High Findings

1. Auth is confusing and unsafe for real users
- Why it matters:
  - the UI says “Email,” but the code also maps non-email identifiers to `@snaplet.local`
  - password reset only works for real emails
  - login auto-signs users up on failure
- Paths:
  - `frontend/src/pages/AuthPage.tsx` (line 17)
  - `frontend/src/pages/AuthPage.tsx` (line 76)
  - `frontend/src/pages/AuthPage.tsx` (line 117)
  - `frontend/src/pages/AuthPage.tsx` (line 318)
- Affects:
  - trust
  - onboarding
  - retention
  - reliability
- Recommended fix:
  - pick one identity model
  - never auto-signup from the login path
  - make recovery/reset match the actual login primitive

2. User-facing progress and habit surfaces are still fake or device-local
- Why it matters:
  - kit mastery and “last studied” come from `localStorage`
  - the streak key has no writer
  - the dashboard uses placeholder chart bars
  - settings imply real behavior that never reaches the backend
- Paths:
  - `frontend/src/features/kits/hooks/useKitsState.ts` (line 38)
  - `frontend/src/features/kits/services/kitStorage.ts` (line 39)
  - `frontend/src/features/study/hooks/useStudyFlow.ts` (line 53)
  - `frontend/src/components/TopBar.tsx` (line 28)
  - `frontend/src/pages/Dashboard.tsx` (line 33)
  - `frontend/src/pages/SettingsPage.tsx` (line 31)
- Affects:
  - trust
  - retention
  - growth
  - UX
- Recommended fix:
  - either wire these to durable backend truth or remove them from the core experience

3. Study mode promise does not match implementation
- Why it matters:
  - Focus Mode is functionally the same as Standard Mode
  - sessions hard-stop after 5 minutes with no user-facing explanation
- Paths:
  - `frontend/src/pages/StudyModeSelection.tsx` (line 22)
  - `frontend/api/_lib/server/service.ts` (line 763)
- Affects:
  - UX
  - trust
  - retention
- Recommended fix:
  - make Focus materially different or remove it
  - expose or remove the hidden time cap

4. The “processing” pipeline is mostly theater
- Why it matters:
  - the app shows staged processing UI, but kit creation/upload is synchronous request-time work
  - review/help copy tells users to regenerate, but the frontend exposes no regenerate action
- Paths:
  - `frontend/src/App.tsx` (line 179)
  - `frontend/api/_lib/server/service.ts` (line 226)
  - `frontend/src/pages/Processing.tsx` (line 20)
  - `frontend/src/pages/ReviewKit.tsx` (line 62)
  - `frontend/src/pages/HelpPage.tsx` (line 48)
  - `frontend/api/sources/[id]/generate.ts` (line 1)
- Affects:
  - reliability
  - UX
  - trust
- Recommended fix:
  - either build a real async job/status/retry flow or stop pretending one exists

5. AI generation quality and routing are not product-grade yet
- Why it matters:
  - question generation is effectively Ollama-only, then falls back to naive colon/sentence heuristics
  - answer checking still defaults to Ollama first even though the project memory says Groq performed best and Ollama had reliability issues
- Paths:
  - `frontend/api/_lib/domain/generation.ts` (line 51)
  - `frontend/api/_lib/server/ollama.ts` (line 1)
  - `frontend/api/_lib/server/semantic-check.ts` (line 52)
  - `Snaplet_NorthStar.md` (line 113)
- Affects:
  - AI quality
  - trust
  - retention
- Recommended fix:
  - add real multi-provider routing for generation
  - add evals/quality gates
  - default to the best measured provider rather than the legacy preference

6. The backend silently creates hidden “Auto Review” kits
- Why it matters:
  - wrong answers can spawn or rewrite `Auto Review · <Topic>` kits with no explicit UI explanation
  - they render like normal user kits
- Paths:
  - `frontend/api/_lib/server/service.ts` (line 1031)
  - `frontend/api/_lib/server/service.ts` (line 1261)
  - `frontend/src/features/kits/services/kitMapper.ts` (line 46)
- Affects:
  - trust
  - UX
  - retention
- Recommended fix:
  - either expose this as an explicit system-generated queue with user control or remove it until the UX is designed

7. Legal/privacy trust is not real
- Why it matters:
  - the legal pages are one-line placeholders
  - the app is wired to send PDFs to OCR.space and study text/answers to external AI providers
  - this is especially risky in production if those keys are enabled
- Paths:
  - `frontend/src/App.tsx` (line 285)
  - `frontend/src/components/LegalPage.tsx` (line 1)
  - `frontend/api/_lib/domain/extraction.ts` (line 62)
  - `frontend/api/_lib/server/semantic-check.ts` (line 227)
  - `frontend/api/_lib/server/ollama.ts` (line 176)
- Affects:
  - trust
  - compliance
  - growth
- Recommended fix:
  - replace placeholder legal copy with real processor/data-retention disclosures
  - align the product behavior with that policy

8. There is essentially no product instrumentation
- Why it matters:
  - there is no meaningful activation/funnel/event capture in the app layer
  - the only analytics code is learning-state persistence
  - the team cannot improve activation, retention, or provider quality without measurement
- Paths:
  - `frontend/src`
  - `frontend/api`
  - `frontend/api/_lib/server/analytics.ts` (line 279)
- Affects:
  - growth
  - retention
  - prioritization
- Recommended fix:
  - instrument auth
  - source creation/upload
  - generation success/failure
  - session start/quit/complete
  - weak-review opens
  - provider failures

### Medium Findings

1. Local-only: the documented dev/test workflow is not actually reproducible, and the project memory is stale
- Why it matters:
  - `npm run dev:full` did not start the API on a clean machine because `vercel dev` required linking/scope
  - `.env.local`, `frontend/.env.local`, `design.md`, and `.vercel/project.json` were missing despite docs/NorthStar claiming they exist or were verified
  - `npm run test:api` assumes an already-running server
  - `npm run test:semantic-check` had no usable providers configured
- Paths:
  - `frontend/package.json` (line 7)
  - `README.md` (line 16)
  - `frontend/README.md` (line 8)
  - `Snaplet_NorthStar.md` (line 121)
  - `Snaplet_NorthStar.md` (line 227)
- Affects:
  - engineering velocity
  - onboarding
  - local confidence
- Recommended fix:
  - either make bootstrap real or stop claiming it is
  - rewrite North Star from repo truth
  - add a one-command verified setup path

2. Dead or misleading UI controls keep breaking trust
- Why it matters:
  - the Kits sort button is dead
  - “Upgrade now” is dead
  - avatar presets and the `+` affordance are dead
  - Create Kit shows a Public state with no sharing model
- Paths:
  - `frontend/src/pages/KitsPage.tsx` (line 59)
  - `frontend/src/pages/SettingsPage.tsx` (line 71)
  - `frontend/src/pages/SettingsPage.tsx` (line 86)
  - `frontend/src/pages/CreateKit.tsx` (line 154)
- Affects:
  - UX
  - trust
- Recommended fix:
  - remove or disable-with-explanation anything that is not wired
  - stop implying product surfaces that do not exist

### Low Findings

1. Placeholder/mockup leftovers still leak through
- Why it matters:
  - stock picsum imagery and leftover “kinetic intelligence” copy make parts of the app feel like a prototype, not a product
- Paths:
  - `frontend/src/pages/CreateKit.tsx` (line 277)
  - `frontend/src/pages/LandingPage.tsx` (line 212)
- Affects:
  - trust
  - polish
- Recommended fix:
  - replace with product-native content or delete

2. One small but obvious metric lie remains in-session
- Why it matters:
  - the study footer labels total correct answers as a “streak,” which is false
- Path:
  - `frontend/src/pages/StudySession.tsx` (line 408)
- Affects:
  - UX
  - trust
- Recommended fix:
  - rename it to `Correct so far` or implement a real consecutive streak

### What Would Stop This From Becoming Widely Used?

- Users will realize quickly that Snaplet is overclaiming product truth: what is “saved,” what counts as “progress,” and what is “your streak” are not consistently durable or server-backed.
- The first-run path does not create a clean aha moment. The landing page is static marketing, auth is confusing, the dashboard is thin for new users, and generation relies on fake processing theater instead of a reliably magical result.
- AI output quality is not dependable enough yet to be habit-forming. When generation is weak, the product effectively asks users to clean their notes, retry, or manually edit, which feels like unpaid labor.
- Trust/compliance is undercooked. Placeholder legal pages plus undisclosed OCR/AI provider flows are enough to make serious users, schools, and parents bounce.
- The team cannot compound improvements fast because there is almost no product instrumentation and the repo memory/docs are not a reliable source of truth.

### What Should The Next 3 Priorities Be?

1. Make state truthful end to end
- remove silent local session fallback
- fix cache isolation and logout purge
- make sessions resumable and server-backed
- stop letting progress fail soft to empty

2. Replace the fragile persistence model
- add the missing schema
- move off the whole-user JSON bucket
- make sources/questions/sessions/attempts relational and concurrency-safe

3. Fix trust at the edges
- clean up auth
- add real regenerate/job status flows
- disclose third-party OCR/AI handling
- instrument the activation/session funnel so you can see where users actually break

### What Should NOT Be Worked On Yet?

- Do not add new study modes, sharing/public-kit features, premium upgrade flows, or notifications.
- Do not spend time on extra dashboard cards, streak gamification, or “coach” copy until the underlying metrics are real.
- Do not do another design polish pass beyond deleting placeholder/stale UI; the product truth layer is the real blocker, not the spacing or gradients.

## Future Work Checklist

High-priority backend/product work:
- [ ] decide whether to fully normalize sources/questions/sessions out of `user_states`
- [ ] add stronger local full-stack dev flow documentation or fix `vercel dev`
- [ ] enable leaked-password protection in Supabase Auth
- [ ] re-run Newman/smoke tests against the current deployment

High-priority UX work:
- [ ] change `frontend/index.html` title back to Snaplet
- [ ] keep refining public/auth/app visual consistency
- [ ] continue reducing over-carded UI where it still exists

Testing:
- [ ] add a durable smoke test for create → review → study → complete → progress
- [ ] add a smoke test for analytics table writes
- [ ] add a smoke test for auth-required production flows

## Operational Rule

If a future task asks about this project:
- start from `Snaplet_NorthStar.md`
- use it as the canonical memory file
- update the affected sections in place when the truth changes
