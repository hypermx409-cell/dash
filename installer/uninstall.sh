#!/usr/bin/env bash
set -u

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

EP_INSTALL_DIR="${EP_INSTALL_DIR:-$(get_install_dir)}"

echo "Euphoria Panel uninstaller"
echo "Install directory: $EP_INSTALL_DIR"
echo "WARNING: This can permanently remove application data."
read -r -p "Choose [1] Remove application (preserve data/volumes) or [2] Complete removal: " choice

case "$choice" in
  1)
    read -r -p "Confirm remove application only? [y/N]: " ans
    [ "${ans,,}" = "y" ] || { echo "Aborted"; exit 0; }
    cd "$EP_INSTALL_DIR"
    docker compose stop || true
    docker compose rm -f backend frontend nginx 2>/dev/null || true
    rm -f /usr/local/bin/ep
    echo "Application removed. Database volume and install directory preserved."
    ;;
  2)
    echo "This will delete containers, volumes, database, configuration and application files."
    read -r -p "Type 'DELETE' to confirm complete removal: " ans
    [ "$ans" = "DELETE" ] || { echo "Aborted"; exit 0; }
    cd "$EP_INSTALL_DIR" 2>/dev/null || true
    docker compose down -v --remove-orphans 2>/dev/null || true
    rm -f /usr/local/bin/ep
    rm -rf "$EP_INSTALL_DIR"
    rm -rf /etc/euphoria-panel
    rm -rf /var/backups/euphoria-panel 2>/dev/null || true
    echo "Complete removal finished."
    ;;
  *)
    echo "Invalid choice"; exit 2 ;;
esac
