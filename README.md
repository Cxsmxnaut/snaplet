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

Run locally:

```bash
cd frontend
npm install
npm run dev:full
```

That starts the Vercel API runtime on `http://localhost:3000` and the Vite frontend on `http://localhost:5173`.

The frontend runs with Vite, and the backend lives under `frontend/api` for Vercel-compatible serverless execution.

## Environment

Key local environment variables live in:
- `.env.local`
- `frontend/.env.local`
- `frontend/.env.example`

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
PATH="$PWD/.tools/bin:$PATH" ./frontend/scripts/run-newman.sh
```

```bash
PATH="$PWD/.tools/bin:$PATH" ./.tools/bin/npm --prefix frontend run test:api
```

## Deployment

Snaplet is structured to deploy from `frontend/` on Vercel with:
- a Vite frontend
- serverless endpoints in `frontend/api`
- route behavior defined in `frontend/vercel.json`

## Project Memory

The canonical long-lived project reference is:
- `Snaplet_NorthStar.md`
