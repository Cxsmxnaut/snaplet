# Snaplet Frontend

This directory contains the full Snaplet application runtime:
- Vite + React frontend in `src/`
- Vercel serverless backend in `api/`
- Postman/Newman assets in `postman/`

## Run Locally

Prerequisites:
- Node.js

Steps:

```bash
npm install
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
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`

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

Semantic answer-check evaluation:

```bash
npm run test:semantic-check
```

## Notes

- Keep `api/` intact to preserve route compatibility.
- Use `../Snaplet_NorthStar.md` as the project memory and architecture reference.
