#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${TMPDIR:-/tmp}/snaplet-vercel-dev-test.log"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/local-runtime.sh"

ensure_vercel_link
load_local_runtime_env

if [ -z "${SNAPLET_POSTMAN_AUTH_TOKEN:-}" ]; then
  cat >&2 <<EOF
Missing SNAPLET_POSTMAN_AUTH_TOKEN.

The API Postman suite runs authenticated requests. Export a real bearer token first, for example:
  export SNAPLET_POSTMAN_AUTH_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"

Then rerun:
  npm run test:api
EOF
  exit 1
fi

BASE_URL="$(runtime_base_url)"
export SNAPLET_POSTMAN_BASE_URL="$BASE_URL"

API_PID=""
cleanup() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if ! wait_for_http "$BASE_URL" 2; then
  case "$BASE_URL" in
    http://localhost:*|http://127.0.0.1:*)
      local_port="$(printf '%s' "$BASE_URL" | sed -E 's#^http://[^:]+:([0-9]+).*$#\1#')"
      npx vercel dev --listen "$local_port" >"$LOG_FILE" 2>&1 &
      API_PID=$!
      if ! wait_for_http "$BASE_URL" 60; then
        echo "Snaplet API test target did not become ready at $BASE_URL." >&2
        echo "Vercel dev log: $LOG_FILE" >&2
        tail -n 40 "$LOG_FILE" >&2 || true
        exit 1
      fi
      ;;
    *)
      cat >&2 <<EOF
Could not reach SNAPLET_POSTMAN_BASE_URL=$BASE_URL

Start that API target first, or override the base URL:
  export SNAPLET_POSTMAN_BASE_URL="http://localhost:3000"
EOF
      exit 1
      ;;
  esac
fi

cd "$FRONTEND_DIR"
node ./scripts/init-postman.mjs
./node_modules/.bin/newman run \
  ./postman/Snaplet.postman_collection.json \
  -e ./postman/Snaplet.local.postman_environment.json \
  --reporters cli \
  --color on \
  "$@"
