#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

EP_INSTALL_DIR="${EP_INSTALL_DIR:-$(get_install_dir)}"
cd "$EP_INSTALL_DIR"
# shellcheck source=/dev/null
. "$EP_INSTALL_DIR/.env"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/euphoria-panel}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/euphoria-panel-backup-$TIMESTAMP.tar.gz"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

step(){ echo "[EP] $*"; }
step "Creating database dump"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "$TMP_DIR/database.sql"

step "Archiving configuration"
cp "$EP_INSTALL_DIR/.env" "$TMP_DIR/.env" 2>/dev/null || true
chmod 600 "$TMP_DIR/.env" 2>/dev/null || true

step "Creating backup archive"
tar -czf "$BACKUP_FILE" -C "$TMP_DIR" database.sql .env
chmod 600 "$BACKUP_FILE"

# Integrity check
gzip -t "$BACKUP_FILE" || { rm -f "$BACKUP_FILE"; ep_die "Backup integrity check failed"; }

# Retain last 10
ls -1t "$BACKUP_DIR"/euphoria-panel-backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

ok "Backup created: $BACKUP_FILE"
info "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
