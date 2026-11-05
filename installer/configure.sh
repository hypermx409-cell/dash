#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

EP_INSTALL_DIR="${EP_INSTALL_DIR:-$(get_install_dir)}"
cd "$EP_INSTALL_DIR"
ENV_FILE="$EP_INSTALL_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  ep_die "Configuration file not found: $ENV_FILE"
fi

cp -a "$ENV_FILE" "$ENV_FILE.pre-configure-$(date +%Y%m%d%H%M%S)"
chmod 600 "$ENV_FILE.pre-configure-"* 2>/dev/null || true

echo "Current configuration: $ENV_FILE"
echo "Edit values below. Press Enter to keep the displayed value."
# shellcheck source=/dev/null
. "$ENV_FILE"

# helper to update or append key
set_env(){ key="$1"; val="$2"; if grep -q "^${key}=" "$ENV_FILE"; then sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"; else echo "${key}=${val}" >> "$ENV_FILE"; fi; }

read -r -p "Pterodactyl panel URL [${PTERO_PANEL_URL:-}]: " v; [ -n "$v" ] && set_env PTERO_PANEL_URL "$v"
read -r -s -p "Pterodactyl API key [hidden, Enter to keep]: " v; echo; [ -n "$v" ] && set_env PTERO_API_KEY "$v"
read -r -p "Admin email [${ADMIN_EMAIL:-}]: " v; [ -n "$v" ] && set_env ADMIN_EMAIL "$v"
read -r -s -p "Admin password [hidden, Enter to keep]: " v; echo; [ -n "$v" ] && set_env ADMIN_PASSWORD "$v"
read -r -p "Discord client ID [${DISCORD_CLIENT_ID:-}]: " v; [ -n "$v" ] && set_env DISCORD_CLIENT_ID "$v"
read -r -p "Discord client secret [hidden, Enter to keep]: " v; [ -z "$v" ] || set_env DISCORD_CLIENT_SECRET "$v"
read -r -p "Registration enabled (true/false) [${REGISTRATION_ENABLED:-true}]: " v; [ -n "$v" ] && set_env REGISTRATION_ENABLED "$v"
read -r -p "Maintenance mode (true/false) [${MAINTENANCE_MODE:-false}]: " v; [ -n "$v" ] && set_env MAINTENANCE_MODE "$v"

chmod 600 "$ENV_FILE"
ok "Configuration updated. Run 'ep restart' to apply changes."
