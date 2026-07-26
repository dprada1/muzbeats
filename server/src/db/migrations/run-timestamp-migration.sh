#!/usr/bin/env bash
# Run 002_timestamp_to_timestamptz.sql against local MuzBeats databases.
# Idempotent — safe if some columns are already TIMESTAMPTZ.
#
# Usage (from repo root or server/):
#   ./src/db/migrations/run-timestamp-migration.sh
#
# Override connection defaults:
#   PGUSER=postgres PGHOST=localhost ./src/db/migrations/run-timestamp-migration.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/002_timestamp_to_timestamptz.sql"

PGUSER="${PGUSER:-postgres}"
PGHOST="${PGHOST:-localhost}"

DATABASES=(muzbeats_test muzbeats_dev muzbeats_prod)

for db in "${DATABASES[@]}"; do
    echo ""
    echo "=========================================="
    echo "Migrating: ${db} (@${PGUSER}@${PGHOST})"
    echo "=========================================="
    psql -U "${PGUSER}" -h "${PGHOST}" -d "${db}" -f "${SQL_FILE}"
done

echo ""
echo "Done. All databases processed."
