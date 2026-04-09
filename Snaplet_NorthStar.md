# Snaplet North Star

Last consolidated update: 2026-04-08 19:29:52 PDT

## Purpose

This file is the authoritative long-lived project memory for Snaplet in this workspace.

Rules:
- update this file whenever the project meaningfully changes
- prefer consolidation over append-only notes
- timestamp new or changed facts
- remove stale or duplicate information when the truth changes

## Current Identity

Official project name:
- Snaplet

Current product description:
- Snaplet is an AI-assisted study platform for turning notes and uploads into study kits, questions, adaptive sessions, and progress insights.

### [2026-04-08 19:26:53 PDT] Rebrand Status

Completed in the repo:
- the previous branding was migrated to `Snaplet`
- Postman assets were renamed to `Snaplet.*`
- the persistent knowledge file was renamed to `Snaplet_NorthStar.md`
- UI copy, local storage keys, script env vars, metadata, and docs were updated to Snaplet naming

Still external to the repo:
- GitHub repository rename itself must be completed on GitHub if the remote repository name should also become Snaplet
- Vercel project naming can be updated separately if platform-level naming should match the new brand everywhere

## Repo Shape

Canonical local workspace root:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet`

Canonical app directory:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend`

High-level structure:

```text
snaplet/
├── README.md
├── .env.local
├── .gitignore
├── Snaplet_NorthStar.md
├── .tools/
└── frontend/
    ├── .env.example
    ├── .env.local
    ├── .gitignore
    ├── README.md
    ├── api/
    ├── postman/
    ├── scripts/
    ├── src/
    ├── index.html
    ├── metadata.json
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── vercel.json
    └── vite.config.ts
```

Current repo rule:
- keep one clear application structure centered on `frontend/`
- do not reintroduce duplicate backend/frontend copies

## Repo History

Consolidated findings:
- the tracked `frontend/` source tree had already matched the canonical GitHub source at comparison time
- most cleanup work was structural rather than code-merge work

Previously removed clutter:
- root `.next`
- root `.vercel`
- root `src`
- root `node_modules`
- root `next-env.d.ts`
- duplicate embedded backend/frontend copies
- generated folders like `frontend/dist` and old disposable local runtime artifacts

## Frontend Architecture

Framework/runtime:
- Vite
- React 19
- React Router
- TypeScript

Main frontend entry:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/src/App.tsx`

Safe internal frontend refactor already completed:
- `App.tsx` was reduced toward a router + layout shell
- feature logic moved into hooks and services
- overall architecture was preserved
- `frontend/api` was intentionally not moved or renamed

Current feature-oriented structure:

```text
frontend/src
├── App.tsx
├── components
│   ├── AppShell.tsx
│   ├── LegalPage.tsx
│   ├── MissingState.tsx
│   └── shared UI
├── features
│   ├── auth/hooks/useAuthSession.ts
│   ├── navigation/logic/routes.ts
│   ├── kits
│   │   ├── hooks/useKitsState.ts
│   │   └── services/{kitMapper,kitStorage}.ts
│   ├── progress/hooks/useProgressState.ts
│   └── study
│       ├── hooks/useStudyFlow.ts
│       └── services/sessionStorage.ts
├── lib
├── pages
└── types.ts
```

Frontend refactor goals:
- keep state close to usage
- reduce prop drilling
- centralize API usage
- preserve deploy behavior

## Backend Architecture

Backend location:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/api`

Backend model:
- Vercel serverless functions
- shared backend logic in `api/_lib`

Backend internal layout:

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
│   ├── auth.ts
│   ├── http.ts
│   ├── ollama.ts
│   ├── semantic-check.ts
│   ├── service.ts
│   └── store.ts
└── vercel-bridge.ts
```

Responsibilities:
- `domain/`: extraction, generation, evaluation, normalization, queue logic
- `server/auth.ts`: resolves current user from `x-snaplet-user-id` or bearer token
- `server/store.ts`: persistence abstraction using Supabase or local fallback
- `server/service.ts`: business logic for sources, questions, sessions, attempts, and progress
- `vercel-bridge.ts`: bridges Vercel request/response objects to Fetch-style request/response handling

## Authentication Model

Current behavior:
- `x-snaplet-user-id` is accepted if present and valid-looking
- bearer token may be resolved through Supabase auth
- if neither resolves, the backend falls back to `demo_user`

Important note:
- this is convenient for MVP/testing
- it is not hardened multi-tenant auth

Default test/demo header:
- `x-snaplet-user-id: demo_user`

## API Routes

Canonical backend routes present:
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

Route behavior notes:
- source-question creation and duplication are intended to return `201`
- route handlers are intentionally thin and delegate into `api/_lib/server/service.ts`

## Postman And Newman Setup

Project-local tooling:
- a local Node runtime is installed under `.tools/`
- Newman is installed in `frontend`

Assets:
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/postman/Snaplet.postman_collection.json`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/postman/Snaplet.local.postman_environment.json`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/postman/fixtures/upload-sample.txt`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/scripts/init-postman.mjs`
- `/Users/slolakap/ALL_FILES_ONE_FOLDER/snaplet/frontend/scripts/run-newman.sh`

Relevant package scripts:
- `postman:init`
- `test:api`

Environment generation behavior:
- collection environment is derived from local `.env.local`
- base URL can be overridden with `SNAPLET_POSTMAN_BASE_URL`

Useful commands:

```bash
PATH="$PWD/.tools/bin:$PATH" ./frontend/scripts/run-newman.sh
```

```bash
PATH="$PWD/.tools/bin:$PATH" ./.tools/bin/npm --prefix frontend run test:api
```

## Deployment And Runtime Notes

Current deploy shape:
- deploy from `frontend/`
- keep `frontend/api` intact for route compatibility
- use `frontend/vercel.json` for dynamic route handling and SPA fallback

### [2026-04-08 19:14:04 PDT] Production Runtime Fixes Applied

Important fixes that were already applied:
- explicit `.js` ESM imports across `frontend/api` and `frontend/api/_lib`
- dynamic route handling cleanup in `frontend/vercel.json`
- fallback storage switched away from the read-only deployment bundle to a writable temp directory on Vercel

Why these mattered:
- deployed Node ESM functions were failing on extensionless relative imports
- dynamic route handlers initially resolved incorrectly in local Vercel testing
- the original local fallback tried to write into a read-only runtime path

## Persistence Model

Current persistence implementation in `frontend/api/_lib/server/store.ts`:
- first tries Supabase table `user_states`
- falls back to local JSON state if Supabase is unavailable or writes fail

Local/dev fallback:
- local `.snaplet/state.json`

Vercel fallback:
- writable temp-directory fallback

Important production reality:
- temp-directory fallback is not durable across separate serverless invocations
- real production persistence requires working Supabase writes

### [2026-04-08 19:14:04 PDT] Current Production Persistence Blocker

Confirmed facts:
- Supabase table `user_states` exists
- reads with the anon key succeed
- writes with the anon key fail with RLS error `42501`
- no service-role key was present in the local environment configuration at the time of verification

Consequence:
- single requests can succeed in production
- cross-request flows that depend on stored state may fail or lose data

Recommended permanent fix:
- add a server-side `SUPABASE_SERVICE_ROLE_KEY` and use it for backend persistence
or
- adjust Supabase RLS so the backend credential in use can upsert `user_states`

## Verification Snapshot

### [2026-04-08 19:14:04 PDT] Verified Runtime Behavior

Confirmed working on the live deployment alias in use at the time:
- `GET /`
- `GET /api/progress`
- `POST /api/sources`
- `POST /api/import/upload`

Still not fully durable:
- follow-up requests involving newly created source IDs can fail when persistence falls back to ephemeral storage
- this is a persistence-layer issue, not a route-shape issue

## Environment Variables

Variables known to matter:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `APP_URL`
- `OLLAMA_API_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OCR_SPACE_API_KEY`
- `ANSWER_CHECK_PROVIDERS`
- `GROQ_ANSWER_CHECK_MODEL`
- `OPENROUTER_ANSWER_CHECK_MODEL`
- `SEMANTIC_ANSWER_MIN_CONFIDENCE`
- `SEMANTIC_ANSWER_TIMEOUT_MS`
- `GROQ_API_KEYS`
- `OPENROUTER_API_KEYS`

Recommended for durable production persistence:
- `SUPABASE_SERVICE_ROLE_KEY`

Optional internal override:
- `SNAPLET_STATE_DIR`

## Workflow Guidance

Preferred workflow:
- preserve `frontend/` as the single app root
- avoid moving `frontend/api` unless there is an explicit architecture change
- check this file first before major refactors
- prefer low-risk internal refactors over structural rewrites
- validate with build and Newman where possible
- verify runtime-sensitive changes against the actual deployment target

### [2026-04-08 19:29:52 PDT] Directory Naming Decision

Decision:
- keep the top-level app directory named `frontend/`

Reason:
- the backend currently lives inside `frontend/api`
- Vercel linkage, scripts, Postman assets, and known paths already assume `frontend/`
- renaming that folder would be a higher-risk structural refactor with little immediate product value

## Future Work Checklist

Production-readiness:
- [ ] add service-role-based Supabase persistence or fix RLS for `user_states`
- [ ] verify cross-request source/session workflows after persistence fix
- [ ] connect deployment workflows to Git if preview branch flows are needed
- [ ] align platform-level external resource names with Snaplet if desired

Frontend maintainability:
- [ ] continue moving page-specific UI into `features/*/components`
- [ ] keep reusable UI in `src/components`
- [ ] keep API usage centralized in `src/lib/api.ts` or feature services

Testing:
- [ ] re-run Newman against the main deployment after persistence fix
- [ ] add a durable smoke test for create -> fetch -> mutate -> delete source flow
- [ ] add a smoke test for the full study-session lifecycle

## Operational Notes

If a future task asks about this project:
- start from `Snaplet_NorthStar.md`
- treat it as the canonical memory file
- update the affected section in place when the truth changes
