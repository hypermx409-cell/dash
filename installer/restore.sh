#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

EP_INSTALL_DIR="${EP_INSTALL_DIR:-$(get_install_dir)}"

if [ $# -lt 1 ]; then
  echo "Usage: ep restore /path/to/euphoria-panel-backup-YYYYMMDD-HHMMSS.tar.gz" >&2
  exit 2
fi

BACKUP_FILE="$1"
[ -f "$BACKUP_FILE" ] || ep_die "Backup file not found: $BACKUP_FILE"
gzip -t "$BACKUP_FILE" || ep_die "Backup archive is corrupt"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"

cd "$EP_INSTALL_DIR"
# shellcheck source=/dev/null
. "$EP_INSTALL_DIR/.env"

if [ -f "$TMP_DIR/.env" ]; then
  read -r -p "Restore environment configuration from backup? This overwrites .env [y/N]: " ans
  if [ "${ans,,}" = "y" ]; then
    cp -a "$TMP_DIR/.env" "$EP_INSTALL_DIR/.env"
    chmod 600 "$EP_INSTALL_DIR/.env"
    # shellcheck source=/dev/null
    . "$EP_INSTALL_DIR/.env"
    ok "Environment restored"
  fi
fi

step_restore(){ echo "[EP] $*"; }
step_restore "Stopping application"
docker compose stop backend frontend >/dev/null 2>&1 || true

step_restore "Restoring PostgreSQL database"
docker compose up -d postgres
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1 && break
  sleep 2
  [ "$i" -eq 30 ] && ep_die "PostgreSQL did not become ready"
done
docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${POSTGRES_DB} WITH (FORCE);" >/dev/null 2>&1 || true
docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE ${POSTGRES_DB};" >/dev/null
docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 < "$TMP_DIR/database.sql"
ok "Database restored"

step_restore "Starting application"
docker compose up -d
health_ok=0
for i in $(seq 1 60); do
  if curl -fsSL "http://127.0.0.1:${BACKEND_PORT:-8001}/api/health" >/dev/null 2>&1; then health_ok=1; break; fi
  sleep 2
done
[ "$health_ok" -eq 1 ] || ep_die "Application did not become healthy after restore"
ok "Restore completed successfully"
