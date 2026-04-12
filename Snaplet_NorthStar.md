# Snaplet North Star

Last consolidated update: 2026-04-11 21:10 PDT

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

These priorities override lower-value feature work until they are stable.

The main product goal right now is not feature expansion. It is making Snaplet feel real, durable, and demo-ready from end to end.

Priority order:

1. Perfect the core demo flow
   - Status: completed on 2026-04-10
   - The highest-value path is:
     - paste notes or upload material
     - generate questions
     - review/edit the kit
     - start a study session
     - complete the session
     - see meaningful progress
   - This flow should feel smooth, trustworthy, and production-grade.
   - Verified complete on the live app:
     - auth
     - paste-notes generation
     - review
     - study mode selection
     - live study session
     - session completion
     - progress update
     - upload-to-review flow
   - Important scope note:
     - this means the core user-facing demo loop works end to end in production
     - it does not mean all local-dev or backend-consistency work is finished

2. Fix upload endpoint reliability and FormData parsing edge cases
   - Status: completed on 2026-04-11
   - Upload and import need to be boringly reliable.
   - File parsing, request validation, and fallback behavior should be consistent across environments.
   - If upload is flaky, the product feels fake no matter how polished the UI is.
   - Verified complete on the live app:
     - valid `.txt` upload returns generated questions
     - valid `.csv` upload returns the correct number of questions without duplication
     - empty file upload returns a clear `400`
     - unsupported file upload returns a clear `400`
     - malformed non-multipart upload returns a clear `400`
     - upload review states are truthful for `failed`, `needs_attention`, and `ready`
   - Important scope note:
     - this means upload parsing and user-facing import behavior are now production-safe for the supported happy path and core failure cases
     - it does not mean every PDF/DOCX extraction quality issue has been perfected

3. Normalize API response and status behavior
   - Status: completed on 2026-04-11
   - API routes should behave consistently across create/read/update/session flows.
   - Avoid mismatched `200` vs `201` semantics, inconsistent payload shapes, and route-specific surprises.
   - Frontend expectations and backend responses should line up cleanly.
   - Verified complete on the live app:
     - wrong-method requests now return `405` instead of `400`
     - malformed JSON bodies now return `400` instead of `500`
     - missing resources like sources and sessions now return `404`
     - state conflicts like empty-start session flows and invalid session progression now map to `409`
     - create-style routes continue to return `201`
   - Important scope note:
     - this pass normalized the route-status semantics and common error classes
     - it did not fully unify every payload envelope into one global response schema

4. Remove or harden any remaining `demo_user` or fake-user fallbacks
   - Status: completed on 2026-04-11
   - Development shortcuts are acceptable only when they are explicit and isolated.
   - Production and realistic local workflows should resolve real authenticated users.
   - Hidden fake-user behavior should not silently power core app logic.
   - Verified complete on the live app:
     - unauthenticated requests return `401`
     - `x-snaplet-user-id` alone no longer grants access in production
     - frontend API calls now require a real Supabase session and bearer token
     - a newly created real Supabase user can still call authenticated routes successfully
   - Important scope note:
     - a dev-only header override still exists, but only when `SNAPLET_ALLOW_DEV_USER_OVERRIDE=true`
     - that override is intended for explicit local testing only, not normal product behavior

5. Improve answer checking quality and semantic acceptance
   - Status: completed on 2026-04-11
   - Snaplet should accept clearly correct answers even when phrasing differs.
   - Overly rigid grading makes the app feel dumb.
   - Overly loose grading makes the analytics feel untrustworthy.
   - This area directly affects product credibility.
   - Verified complete in implementation:
     - deterministic grading and lexical-semantic rules still run first
     - model-based semantic checking only runs when deterministic grading says the answer is wrong
     - provider fallback chain now supports `ollama -> groq -> openrouter`
     - key pools are supported for all three providers:
       - `OLLAMA_API_KEYS`
       - `GROQ_API_KEYS`
       - `OPENROUTER_API_KEYS`
     - answer-check model envs are independently configurable:
       - `OLLAMA_ANSWER_CHECK_MODEL`
       - `GROQ_ANSWER_CHECK_MODEL`
       - `OPENROUTER_ANSWER_CHECK_MODEL`
     - semantic answer-check benchmarking exists at `frontend/scripts/eval-semantic-check.mjs`
   - Benchmark result from the local provider-eval dataset:
     - Groq performed best on both accuracy and latency
     - OpenRouter was usable but slower and slightly stricter
     - Ollama is still first in the fallback order by user request, but local evaluation hit TLS/certificate failures against the configured endpoint
   - Important scope note:
     - the app is now wired for ordered provider failover and easy key expansion
     - Groq is the current strongest answer-check provider on the measured dataset, even though Ollama remains first in the default chain

6. Stabilize the full local development workflow
   - Status: completed
   - Local frontend, local API behavior, env wiring, auth expectations, and Supabase integration should be understandable and repeatable.
   - `vercel dev`, Vite, and API routing should not feel like separate worlds.
   - Another engineer or model should be able to boot the app locally without detective work.
   - Completed outcome:
     - `frontend/package.json` now provides:
       - `npm run dev`
       - `npm run dev:api`
       - `npm run dev:full`
     - `npm run dev:full` is the documented full-stack local path:
       - `npx vercel dev --listen 3000` for the runtime/API layer
       - Vite frontend on `http://localhost:5173`
     - local verification confirmed:
       - Vite serving on `5173`
       - runtime responding on `3000`
       - `/api/progress` returning a real `401 Authentication required` when unauthenticated instead of hanging or pretending
     - docs were updated in:
       - `README.md`
       - `frontend/README.md`
       - `frontend/.env.example`

7. Finish replacing fake analytics and placeholder UX with real product behavior
   - Status: completed
   - Progress should be driven by real persisted analytics, not decorative placeholders.
   - Empty states are fine, but fake states should not masquerade as completed product behavior.
   - Every visible button and route should either work or be clearly marked as intentionally unavailable.
   - Completed outcome:
     - the Progress page no longer renders preview/sample analytics data
     - empty history now shows a truthful empty state instead of a fake populated dashboard
     - `/api/progress` now returns:
       - relational analytics when they exist
       - a zeroed, truthful empty payload when they do not
     - the old bucket-derived analytics fallback was removed from the progress route
     - relational analytics are now the only real source of progress truth
   - Remaining intentional disabled UX:
     - `Delete Account (Coming Soon)` in settings remains explicitly disabled and labeled as such

8. Remove stale branding and polish mismatched product copy
   - Status: completed
   - The app should not carry leftover naming from previous experiments or scaffolds.
   - Completed outcome:
     - `frontend/index.html` title now correctly reads `Snaplet`
     - stale AI Studio env/example copy was removed from `frontend/.env.example`
     - local run and environment docs were rewritten in Snaplet-native terms
   - Still worth watching:
     - continue trimming any future copied or inherited wording during normal feature work

9. Harden AI provider reliability and observability
   - Status: completed
   - The app now supports ordered semantic-check failover, but provider reliability still needs more operational polish.
   - Completed outcome:
     - semantic answer checking now logs provider failures and recovery/fallback events
     - failure kinds are distinguished:
       - `http_error`
       - `timeout`
       - `network_error`
       - `empty_response`
       - `parse_error`
     - Ollama generation/title requests now emit failure logs instead of silently returning `null`
     - provider logging is configurable with:
       - `SEMANTIC_ANSWER_LOGGING`
       - `OLLAMA_LOGGING`
   - Operational note:
     - local testing previously showed Ollama TLS/certificate problems against the configured endpoint
     - that issue is now observable in logs instead of disappearing into generic fallback behavior

Working rule:
- when choosing between adding a new feature and making one of the above more reliable, choose reliability first
- when a UI improvement conflicts with product truth, choose product truth
- when documenting or prompting future work, reference this section first

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
├── .env.local
├── .gitignore
├── Snaplet_NorthStar.md
├── design.md
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
- `codex/snapshot-light-theme-2026-04-08`

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
- Ollama client lives in `frontend/api/_lib/server/ollama.ts`

Current Ollama behavior:
- tries Ollama first for question generation and title generation
- falls back to heuristic generation if Ollama is unavailable or errors

Important fix already applied:
- Ollama fetch failures now fail soft instead of crashing source creation

Current semantic answer checking:
- handled in `frontend/api/_lib/server/semantic-check.ts`
- can use configured providers such as Groq or OpenRouter

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
- root `.env.local` contains working Supabase browser credentials and model-related envs used in local verification

## Local Development Reality

Current recommended local run modes:

1. `npm run dev:full` from `frontend`
- starts the runtime/API layer on `http://localhost:3000`
- starts the Vite frontend on `http://localhost:5173`
- this is the preferred full-stack local path now

2. `npm run dev` from `frontend`
- frontend-only or frontend-first path
- use this when the API/runtime target is already running elsewhere

Current local caveat:
- real Supabase-backed persistence is the default expectation now
- local file-state persistence only exists when explicitly enabled with `SNAPLET_ENABLE_FILE_STATE_FALLBACK=true`
- browser auth should not silently fall back to local Supabase anymore; missing config now fails loudly instead of pointing at `127.0.0.1:54321`

## Testing And Verification

Current automated verification available:
- `npm run build` in `frontend`
- `npm run lint` in `frontend` runs `tsc --noEmit`
- `npm run test:semantic-check` in `frontend` benchmarks answer-check providers
- Postman/Newman assets exist in `frontend/postman`

Important current test reality:
- `npm run build` passes
- `npm run lint` passes after the latest TypeScript cleanup
- `npm run dev:full` was verified to boot Vite on `5173` and the runtime on `3000`

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
