#!/usr/bin/env bash
# Applies every migration to a throwaway local PostgreSQL cluster (with a
# minimal Supabase stand-in) and runs the RLS / integrity tests.
#
# Usage: supabase/tests/local/run.sh
# Requires PostgreSQL 15+ server binaries (initdb, pg_ctl) and psql.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-54329}"
WORK="$(mktemp -d)"

as_pg() {
  # initdb refuses to run as root; fall back to the postgres system user.
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}

cleanup() {
  as_pg "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

[ "$(id -u)" = "0" ] && chown postgres "$WORK"

as_pg "$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
as_pg "$PGBIN/pg_ctl" -D "$WORK/data" -l "$WORK/log" \
  -o "-p $PORT -k $WORK -c listen_addresses=''" -w start >/dev/null

run_sql() {
  psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$1"
}

run_sql "$ROOT/supabase/tests/local/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate: $(basename "$f")"
  run_sql "$f"
done
echo "tests:   rls_and_integrity.sql"
run_sql "$ROOT/supabase/tests/local/rls_and_integrity.sql"
echo "All migrations applied and all tests passed."
