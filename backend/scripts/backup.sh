#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL is required" >&2; exit 1; fi
destination="${1:-}"
if [[ "$destination" != /* ]]; then echo "Usage: npm run backup -- /absolute/path/backup.dump" >&2; exit 1; fi
pg_dump --format=custom --no-owner --no-acl --file="$destination" "$DATABASE_URL"
echo "Backup written to $destination"
