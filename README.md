# Snaplet

Snaplet is an AI-assisted study platform built around active recall, adaptive review, and fast source-to-question generation.

## Repo Layout

```text
snaplet/
└── frontend/
    ├── api/        # Vercel serverless backend
    ├── postman/    # Newman/Postman collections and fixtures
    ├── scripts/    # automation helpers
    └── src/        # Vite + React frontend
```

## Local Development

Prerequisites:
- Node.js
- a linked Vercel project in `frontend/.vercel/project.json`
- a real `frontend/.env.local` copied from `frontend/.env.example`

Run locally:

```bash
cd frontend
cp .env.example .env.local
npx vercel link
npm install
npm run dev:full
```

That starts the Vercel API runtime on `http://localhost:3000` and the Vite frontend on `http://localhost:5173`.

The frontend runs with Vite, and the backend lives under `frontend/api` for Vercel-compatible serverless execution.

## Environment

Canonical local runtime env files:
- `frontend/.env.example` is the template
- `frontend/.env.local` is the real local runtime file
- root `.env.local` is optional local-only override state and is not required for normal setup

Important values include:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_PROXY_TARGET`
- `OLLAMA_API_KEY`
- `OCR_SPACE_API_KEY`

## API Testing

Newman/Postman assets live in `frontend/postman`.

Useful commands:

```bash
cd frontend
npm run dev:api
```

```bash
cd frontend
export SNAPLET_POSTMAN_AUTH_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"
npm run test:api
```

`npm run test:api` now exits with a clear message if:
- `frontend/.env.local` is missing
- the Vercel project is not linked
- `SNAPLET_POSTMAN_AUTH_TOKEN` is missing
- the API target is unreachable

## Deployment

Snaplet is structured to deploy from `frontend/` on Vercel with:
- a Vite frontend
- serverless endpoints in `frontend/api`
- route behavior defined in `frontend/vercel.json`

## Project Memory

The canonical long-lived project reference is:
- `Snaplet_NorthStar.md`
