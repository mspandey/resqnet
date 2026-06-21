#!/usr/bin/env bash
# infra/init.sh
# PostgreSQL initialisation script — run once by docker-entrypoint-initdb.d
# Installs extensions and runs migrations in order.
# Called automatically by the postgres Docker image on first startup.
set -euo pipefail

echo "=== ResQNet DB init: installing extensions ==="
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /migrations/001_extensions.sql

echo "=== ResQNet DB init: running core schema migration ==="
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /migrations/002_core_schema.sql

echo "=== ResQNet DB init: creating indexes ==="
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /migrations/003_indexes.sql

echo "=== ResQNet DB init: applying auth and admin schema updates ==="
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /migrations/004_auth_and_admin.sql

# Seed only in development
if [ "${ENVIRONMENT:-development}" = "development" ]; then
  echo "=== ResQNet DB init: loading dev seed data ==="
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -f /seed/dev_seed.sql
fi

echo "=== ResQNet DB init: complete ==="
