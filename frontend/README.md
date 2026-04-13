# Snaplet Frontend

This directory contains the full Snaplet application runtime:
- Vite + React frontend in `src/`
- Vercel serverless backend in `api/`
- Postman/Newman assets in `postman/`

## Run Locally

Prerequisites:
- Node.js
- Vercel CLI (`npm i -g vercel` or `npx vercel`)
- a real local `.env.local` with Supabase browser/runtime keys

Recommended local flows:

```bash
npm install
npm run dev:full
```

That starts:
- Vercel API runtime on `http://localhost:3000`
- Vite frontend on `http://localhost:5173`

If you only need the frontend shell and already have an API target running:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## API Testing

Initialize and run the API collection:

```bash
npm run postman:init
npm run test:api
```

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
- `OLLAMA_ANSWER_CHECK_MODEL`
- `OCR_SPACE_API_KEY`
- `ANSWER_CHECK_PROVIDERS`
- `GROQ_API_KEYS`
- `OPENROUTER_API_KEYS`
- `GROQ_ANSWER_CHECK_MODEL`
- `OPENROUTER_ANSWER_CHECK_MODEL`
- `SEMANTIC_ANSWER_MIN_CONFIDENCE`
- `SEMANTIC_ANSWER_TIMEOUT_MS`
- `SEMANTIC_ANSWER_LOGGING`
- `OLLAMA_LOGGING`

Semantic answer-check evaluation:

```bash
npm run test:semantic-check
```

## Notes

- Keep `api/` intact to preserve route compatibility.
- Use `../Snaplet_NorthStar.md` as the project memory and architecture reference.
- Real Supabase-backed persistence is the default now. Local file state is only available when `SNAPLET_ENABLE_FILE_STATE_FALLBACK=true` is set explicitly for development.
