#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

export PATH="$ROOT_DIR/.tools/bin:$PATH"

node "$FRONTEND_DIR/scripts/init-postman.mjs"

BASE_URL="${SNAPLET_POSTMAN_BASE_URL:-}"
if [ -n "$BASE_URL" ]; then
  export SNAPLET_POSTMAN_BASE_URL="$BASE_URL"
fi

"$FRONTEND_DIR/node_modules/.bin/newman" run \
  "$FRONTEND_DIR/postman/Snaplet.postman_collection.json" \
  -e "$FRONTEND_DIR/postman/Snaplet.local.postman_environment.json" \
  --reporters cli \
  --color on \
  "$@"
