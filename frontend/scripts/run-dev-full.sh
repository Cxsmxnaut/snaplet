#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${TMPDIR:-/tmp}/snaplet-vercel-dev.log"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/local-runtime.sh"

ensure_vercel_link
load_local_runtime_env

API_PORT="${SNAPLET_API_PORT:-3000}"
WEB_PORT="${SNAPLET_WEB_PORT:-5173}"
export VITE_PROXY_TARGET="${VITE_PROXY_TARGET:-http://localhost:${API_PORT}}"

cd "$FRONTEND_DIR"

npx vercel dev --listen "$API_PORT" >"$LOG_FILE" 2>&1 &
API_PID=$!

cleanup() {
  kill "$API_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

if ! wait_for_http "http://localhost:${API_PORT}" 60; then
  echo "Snaplet API did not become ready on port ${API_PORT}." >&2
  echo "Vercel dev log: $LOG_FILE" >&2
  tail -n 40 "$LOG_FILE" >&2 || true
  exit 1
fi

exec vite --port="$WEB_PORT" --host=0.0.0.0
