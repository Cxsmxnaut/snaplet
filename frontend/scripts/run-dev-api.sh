#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/local-runtime.sh"

ensure_vercel_link
load_local_runtime_env

API_PORT="${SNAPLET_API_PORT:-3000}"

cd "$FRONTEND_DIR"
exec npx vercel dev --listen "$API_PORT"
