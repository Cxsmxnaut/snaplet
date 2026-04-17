#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$FRONTEND_DIR/.." && pwd)"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env.local"
ROOT_ENV_FILE="$ROOT_DIR/.env.local"
VERCEL_PROJECT_FILE="$FRONTEND_DIR/.vercel/project.json"

ensure_frontend_env() {
  if [ -f "$FRONTEND_ENV_FILE" ]; then
    return
  fi

  cat >&2 <<EOF
Missing local runtime env: $FRONTEND_ENV_FILE

Create it from frontend/.env.example first, then retry.
EOF
  exit 1
}

ensure_vercel_link() {
  if [ -f "$VERCEL_PROJECT_FILE" ]; then
    return
  fi

  cat >&2 <<EOF
Missing Vercel project link: $VERCEL_PROJECT_FILE

Run this once from $FRONTEND_DIR:
  npx vercel link

That creates the local .vercel/project.json file this repo expects for local API runs.
EOF
  exit 1
}

load_local_runtime_env() {
  ensure_frontend_env

  set -a
  # shellcheck disable=SC1090
  source "$FRONTEND_ENV_FILE"
  if [ -f "$ROOT_ENV_FILE" ]; then
    # Optional local-only override file. Not required for normal repo setup.
    # shellcheck disable=SC1090
    source "$ROOT_ENV_FILE"
  fi
  set +a
}

runtime_base_url() {
  if [ -n "${SNAPLET_POSTMAN_BASE_URL:-}" ]; then
    printf '%s\n' "${SNAPLET_POSTMAN_BASE_URL%/}"
    return
  fi

  if [ -n "${VITE_API_BASE_URL:-}" ]; then
    printf '%s\n' "${VITE_API_BASE_URL%/}"
    return
  fi

  if [ -n "${VITE_PROXY_TARGET:-}" ]; then
    printf '%s\n' "${VITE_PROXY_TARGET%/}"
    return
  fi

  local port="${SNAPLET_API_PORT:-3000}"
  printf 'http://localhost:%s\n' "$port"
}

wait_for_http() {
  local url="$1"
  local attempts="${2:-60}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}
