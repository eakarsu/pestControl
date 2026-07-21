#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL is required" >&2; exit 1; fi
if [[ -z "${JWT_SECRET:-}" || ${#JWT_SECRET} -lt 32 ]]; then echo "JWT_SECRET must contain at least 32 characters" >&2; exit 1; fi
if [[ -z "${CORS_ALLOWED_ORIGINS:-}" ]]; then echo "CORS_ALLOWED_ORIGINS is required" >&2; exit 1; fi
if [[ ! -d "$project_dir/frontend/dist" ]]; then echo "Frontend build is missing; run npm ci && npm run build in frontend" >&2; exit 1; fi
if [[ ! -d "$project_dir/backend/node_modules/.prisma/client" ]]; then echo "Prisma client is missing; run npm ci && npm run prisma:generate in backend" >&2; exit 1; fi

export NODE_ENV="${NODE_ENV:-production}"
export FRONTEND_DIST_DIR="$project_dir/frontend/dist"
cd "$project_dir/backend"
exec node src/index.js
