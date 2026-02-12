#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SOURCE_DB_URL:-}" ]]; then
  echo "ERROR: SOURCE_DB_URL is required (Neon connection string)"
  echo "Usage: SOURCE_DB_URL='postgresql://...' $0"
  exit 1
fi

TARGET_ADMIN_URL="${TARGET_ADMIN_URL:-postgresql://gitpins:gitpins@localhost:5432/postgres}"
TARGET_DB_URL="${TARGET_DB_URL:-postgresql://gitpins:gitpins@localhost:5432/gitpins_local_clone}"
TARGET_DB_NAME="${TARGET_DB_NAME:-gitpins_local_clone}"
DUMP_FILE="${DUMP_FILE:-/tmp/gitpins-neon-$(date +%s).dump}"

for cmd in pg_dump pg_restore psql; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: $cmd is required"
    exit 1
  fi
done

echo "Creating local DB if missing: ${TARGET_DB_NAME}"
psql "$TARGET_ADMIN_URL" -v ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE DATABASE "${TARGET_DB_NAME}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TARGET_DB_NAME}')\gexec
SQL

echo "Dumping Neon database to ${DUMP_FILE}"
pg_dump "$SOURCE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "$DUMP_FILE"

echo "Restoring dump into local database"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "$TARGET_DB_URL" \
  "$DUMP_FILE"

echo "Verifying cloned data counts"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'users' AS table, count(*) FROM users
UNION ALL
SELECT 'repo_orders', count(*) FROM repo_orders
UNION ALL
SELECT 'user_tokens', count(*) FROM user_tokens
UNION ALL
SELECT 'sync_logs', count(*) FROM sync_logs;
SQL

echo "Removing temporary dump file"
rm -f "$DUMP_FILE"

echo "Clone complete"
