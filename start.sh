#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$project_dir/.env" ] || { echo "Missing .env; copy .env.example and configure it" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$project_dir/.env"
set +a
if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL is required" >&2; exit 1; fi
if [[ -z "${JWT_SECRET:-}" || ${#JWT_SECRET} -lt 32 ]]; then echo "JWT_SECRET must contain at least 32 characters" >&2; exit 1; fi
if [[ -z "${CORS_ALLOWED_ORIGINS:-}" ]]; then echo "CORS_ALLOWED_ORIGINS is required" >&2; exit 1; fi
if [[ ! -d "$project_dir/frontend/dist" ]]; then echo "Frontend build is missing; run npm ci && npm run build in frontend" >&2; exit 1; fi
if [[ ! -d "$project_dir/backend/node_modules/.prisma/client" ]]; then echo "Prisma client is missing; run npm ci && npm run prisma:generate in backend" >&2; exit 1; fi

export NODE_ENV="${NODE_ENV:-production}"
export FRONTEND_DIST_DIR="$project_dir/frontend/dist"
for port_name in BACKEND_PORT FRONTEND_PORT; do
  value="${!port_name:-}"
  [[ "$value" =~ ^[0-9]+$ ]] && (( value >= 1024 && value <= 65535 )) || { echo "$port_name must be an explicit integer between 1024 and 65535" >&2; exit 1; }
done
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo "BACKEND_PORT and FRONTEND_PORT must differ" >&2; exit 1; }
for assigned_port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  lsof -nP -iTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Assigned port $assigned_port is occupied" >&2; exit 1; }
done
export PORT="$BACKEND_PORT"
export HOST=127.0.0.1
export VITE_API_PROXY_TARGET="http://127.0.0.1:$BACKEND_PORT"

backend_pid=''
frontend_pid=''
cleanup() {
  [[ -n "$backend_pid" ]] && kill "$backend_pid" 2>/dev/null || true
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
(cd "$project_dir/backend" && node src/index.js) &
backend_pid=$!
attempt=0
while ! lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  kill -0 "$backend_pid" 2>/dev/null || { echo "Backend exited before binding $BACKEND_PORT" >&2; wait "$backend_pid"; exit 1; }
  (( attempt < 120 )) || { echo "Backend did not bind $BACKEND_PORT within 30 seconds" >&2; exit 1; }
  sleep 0.25
  attempt=$((attempt + 1))
done
(cd "$project_dir/frontend" && npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort) &
frontend_pid=$!
wait "$backend_pid" "$frontend_pid"
