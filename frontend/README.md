# Snaplet Frontend

This directory contains the full Snaplet application runtime:
- Vite + React frontend in `src/`
- Vercel serverless backend in `api/`
- Postman/Newman assets in `postman/`

## Run Locally

Prerequisites:
- Node.js
- a local `frontend/.env.local` copied from `.env.example`
- a linked Vercel project (`npx vercel link`) so `frontend/.vercel/project.json` exists

Recommended local flows:

```bash
cp .env.example .env.local
npx vercel link
npm install
npm run dev:full
```

That starts:
- Vercel API runtime on `http://localhost:3000`
- Vite frontend on `http://localhost:5173`

`npm run dev:full` now:
- checks for `frontend/.env.local`
- checks for `frontend/.vercel/project.json`
- loads the local runtime env before starting `vercel dev`
- waits for the API runtime before starting Vite

If you only need the frontend shell and already have an API target running:

```bash
npm run dev
```

If you only need the API/runtime:

```bash
npm run dev:api
```

## Build

```bash
npm run build
```

## API Testing

Initialize and run the API collection:

```bash
export SNAPLET_POSTMAN_AUTH_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"
npm run test:api
```

`npm run test:api` now:
- loads `frontend/.env.local`
- uses `VITE_API_BASE_URL` or `VITE_PROXY_TARGET` before falling back to `http://localhost:3000`
- starts a local `vercel dev` runtime automatically if the target is localhost and not already running
- fails fast with a clear message if `SNAPLET_POSTMAN_AUTH_TOKEN` is missing

## Environment

Core frontend/runtime variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `VITE_PROXY_TARGET`
- `SNAPLET_ALLOW_DEV_USER_OVERRIDE`
- `SNAPLET_ENABLE_FILE_STATE_FALLBACK`

AI and evaluation variables:
- `OLLAMA_API_KEY`
- `OLLAMA_API_KEYS`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_GENERATION_MODEL`
- `OLLAMA_TITLE_MODEL`
- `OLLAMA_ANSWER_CHECK_MODEL`
- `OCR_SPACE_API_KEY`
- `GENERATION_PROVIDERS`
- `ANSWER_CHECK_PROVIDERS`
- `GROQ_API_KEYS`
- `OPENROUTER_API_KEYS`
- `GROQ_GENERATION_MODEL`
- `OPENROUTER_GENERATION_MODEL`
- `GROQ_TITLE_MODEL`
- `OPENROUTER_TITLE_MODEL`
- `GROQ_ANSWER_CHECK_MODEL`
- `OPENROUTER_ANSWER_CHECK_MODEL`
- `GENERATION_TIMEOUT_MS`
- `GENERATION_LOGGING`
- `SEMANTIC_ANSWER_MIN_CONFIDENCE`
- `SEMANTIC_ANSWER_TIMEOUT_MS`
- `SEMANTIC_ANSWER_LOGGING`
- `OLLAMA_LOGGING`

Semantic answer-check evaluation:

```bash
npm run test:semantic-check
```

Generation quality evaluation:

```bash
npm run test:generation-quality
```

The generation path now prefers a multi-provider order controlled by `GENERATION_PROVIDERS`.
If one provider errors, times out, or returns invalid JSON, Snaplet rotates to the next configured provider before falling back to heuristics.

## Notes

- Keep `api/` intact to preserve route compatibility.
- Use `../Snaplet_NorthStar.md` as the project memory and architecture reference.
- Real Supabase-backed persistence is the default now. Local file state is only available when `SNAPLET_ENABLE_FILE_STATE_FALLBACK=true` is set explicitly for development.
- Root `.env.local` is optional local-only override state, not the canonical repo setup path.
- `.vercel/project.json` is expected locally for API runs, but it is local machine state created by `npx vercel link`, not something the repo can guarantee on a fresh clone.
