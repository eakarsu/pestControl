#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL is required" >&2; exit 1; fi
source_file="${1:-}"
confirmation="${2:-}"
if [[ ! -f "$source_file" || "$confirmation" != "RESTORE_CONFIRMED" ]]; then echo "Usage: npm run restore -- /absolute/path/backup.dump RESTORE_CONFIRMED" >&2; exit 1; fi
pg_restore --exit-on-error --no-owner --no-acl --clean --if-exists --dbname="$DATABASE_URL" "$source_file"
echo "Restore completed"
