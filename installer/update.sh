#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

EP_INSTALL_DIR="${EP_INSTALL_DIR:-$(get_install_dir)}"
cd "$EP_INSTALL_DIR"
# shellcheck source=/dev/null
. "$EP_INSTALL_DIR/.env" 2>/dev/null || true

BACKUP_DIR="${BACKUP_DIR:-/var/backups/euphoria-panel}"
mkdir -p "$BACKUP_DIR"
if [ -x "$EP_INSTALL_DIR/installer/backup.sh" ]; then
  "$EP_INSTALL_DIR/installer/backup.sh"
fi

TARGET_REF="${1:-}"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git fetch --tags --prune
  if [ -n "$TARGET_REF" ]; then
    git checkout "$TARGET_REF"
  else
    latest_tag="$(git tag --sort=-version:refname | head -n1 || true)"
    if [ -n "$latest_tag" ]; then
      git checkout "$latest_tag"
    else
      git pull --ff-only origin "$(git branch --show-current)"
    fi
  fi
else
  ep_warn "Installation is not a git repository; cannot update source automatically."
fi

chmod +x installer/*.sh 2>/dev/null || true

EP_FRONTEND_PORT="$(cat /etc/euphoria-panel/frontend_port 2>/dev/null || echo 3001)"
EP_BACKEND_PORT="$(cat /etc/euphoria-panel/backend_port 2>/dev/null || echo 8001)"
export FRONTEND_PORT="$EP_FRONTEND_PORT"
export BACKEND_PORT="$EP_BACKEND_PORT"

if ! docker compose up -d --build; then
  ep_error "Update failed during container startup. Previous .env and database volume were preserved."
  exit 1
fi

health_ok=0
for i in $(seq 1 60); do
  if curl -fsSL "http://127.0.0.1:${EP_BACKEND_PORT}/api/health" >/dev/null 2>&1; then
    health_ok=1
    break
  fi
  sleep 2
done
[ "$health_ok" -eq 1 ] || ep_die "Application did not become healthy after update"
ok "Euphoria Panel updated successfully"
