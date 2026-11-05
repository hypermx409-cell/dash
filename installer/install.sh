#!/usr/bin/env bash
set -euo pipefail

# Euphoria Panel installer (embedded common helpers)
EP_APP_NAME="Euphoria Panel"
EP_DEFAULT_INSTALL_DIR="/opt/euphoria-panel"
EP_STATE_DIR="/etc/euphoria-panel"

# Colors
if [ -t 1 ]; then
  R='\033[0m'; B='\033[1m'; BL='\033[1;34m'; GR='\033[1;32m'; YL='\033[1;33m'; RD='\033[1;31m'; CY='\033[1;36m'
else
  R=''; B=''; BL=''; GR=''; YL=''; RD=''; CY=''
fi
info(){ echo -e "${BL}[INFO]${R} $*"; }
ok(){ echo -e "${GR}[✓]${R} $*"; }
warn(){ echo -e "${YL}[!]${R} $*"; }
error(){ echo -e "${RD}[ERROR]${R} $*" >&2; }
die(){ error "$*"; exit 1; }
step(){ echo -e "${B}${CY}==> $*${R}"; }
banner(){ echo -e "${CY}"; cat <<'BANNER'
╔══════════════════════════════════════════╗
║                                          ║
║           EUPHORIA PANEL                 ║
║          VPS INSTALLER                   ║
║                                          ║
║              EP SYSTEM                   ║
║                                          ║
╚══════════════════════════════════════════╝
BANNER
  echo -e "${R}"; }

check_command(){ command -v "$1" >/dev/null 2>&1; }
require_root(){ [ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash install.sh"; }
detect_os(){
  [ -f /etc/os-release ] || die "Cannot detect OS"
  . /etc/os-release
  EP_OS_ID="${ID:-unknown}"; EP_OS_VERSION="${VERSION_ID:-unknown}"
  case "$EP_OS_ID" in ubuntu|debian) ;; *) die "Unsupported OS: ${PRETTY_NAME:-$EP_OS_ID}" ;; esac
  if [ "$EP_OS_ID" = "ubuntu" ]; then case "$EP_OS_VERSION" in 22.04|24.04) ;; *) warn "Ubuntu $EP_OS_VERSION not tested" ;; esac; fi
  if [ "$EP_OS_ID" = "debian" ] && [ "$EP_OS_VERSION" != "12" ]; then warn "Debian $EP_OS_VERSION not tested"; fi
}
rand_secret(){ if command -v openssl >/dev/null 2>&1; then openssl rand -hex "${1:-32}"; else tr -dc 'A-Za-z0-9' </dev/urandom | head -c "${1:-32}"; echo; fi; }
port_free(){ command -v ss >/dev/null 2>&1 || return 0; ! ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$1\$"; }
validate_port(){ case "$1" in ''|*[!0-9]*) return 1;; esac; [ "$1" -ge 1 ] && [ "$1" -le 65535 ]; }

prompt_var(){
  # $1 varname $2 prompt $3 default $4 mode(password?) $5 skip_if_set
  local __var="$1" __prompt="$2" __default="${3:-}" __mode="${4:-text}" value
  eval "value=\"\${$__var:-}\""
  if [ -n "$value" ]; then return 0; fi
  if [ -n "${EP_NONINTERACTIVE:-}" ]; then eval "$__var=\"\$__default\""; return 0; fi
  local suffix=""; [ -n "$__default" ] && suffix=" [$__default]"
  if [ "$__mode" = "password" ]; then read -r -s -p "$__prompt$suffix: " value; echo; else read -r -p "$__prompt$suffix: " value; fi
  [ -z "$value" ] && value="$__default"
  eval "$__var=\"\$value\""
}

install_system_packages(){
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends curl ca-certificates gnupg git docker.io docker-compose-v2 openssl ufw
}

install_docker(){
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker already installed"; return
  fi
  step "Installing Docker Engine and Compose"
  install_system_packages
  if ! (command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1); then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
  fi
  systemctl enable --now docker
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || die "Docker installation failed"
  ok "Docker ready"
}

verify_requirements(){
  [ "$(uname -m)" = "x86_64" ] || [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ] || die "Unsupported architecture: $(uname -m)"
  detect_os
  local ram_kb disk_kb
  ram_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
  [ "$ram_kb" -ge 900000 ] || die "At least 1 GB RAM required"
  disk_kb=$(df -k / | awk 'NR==2{print $4}')
  [ "$disk_kb" -ge 5242880 ] || die "At least 5 GB free disk space required"
  check_command curl || install_system_packages
}

banner
require_root
verify_requirements
info "OS: $(grep PRETTY_NAME /etc/os-release | cut -d= -f2- | tr -d '\"')"
info "Architecture: $(uname -m)"

# Source selection
DEFAULT_SOURCE=""
[ -d /home/ubuntu/euphoria-panel ] && DEFAULT_SOURCE="/home/ubuntu/euphoria-panel"
EP_SOURCE_DEFAULT="${EP_GIT_REPO:-https://github.com/YOUR-ORG/euphoria-panel.git}"

prompt_var EP_INSTALL_DIR "Installation directory" "${EP_INSTALL_DIR:-$EP_DEFAULT_INSTALL_DIR}"
prompt_var EP_FRONTEND_PORT "Frontend port" "${EP_FRONTEND_PORT:-3001}"
prompt_var EP_BACKEND_PORT "Backend port" "${EP_BACKEND_PORT:-8001}"
validate_port "$EP_FRONTEND_PORT" || die "Invalid frontend port"
validate_port "$EP_BACKEND_PORT" || die "Invalid backend port"
[ "$EP_FRONTEND_PORT" = "$EP_BACKEND_PORT" ] && die "Frontend and backend ports must differ"
port_free "$EP_FRONTEND_PORT" || die "Frontend port $EP_FRONTEND_PORT is already in use"
port_free "$EP_BACKEND_PORT" || die "Backend port $EP_BACKEND_PORT is already in use"

prompt_var EP_DB_NAME "PostgreSQL database name" "${EP_DB_NAME:-euphoria_panel}"
prompt_var EP_DB_USER "PostgreSQL database user" "${EP_DB_USER:-euphoria}"
EP_DB_PASSWORD_DEFAULT="$(rand_secret 24)"
prompt_var EP_DB_PASSWORD "PostgreSQL password (leave blank to auto-generate)" "$EP_DB_PASSWORD_DEFAULT" "password"

prompt_var EP_PTERO_URL "Pterodactyl panel URL (optional)" "${EP_PTERO_URL:-}"
prompt_var EP_PTERO_API_KEY "Pterodactyl application API key (optional)" "${EP_PTERO_API_KEY:-}" "password"

prompt_var EP_ADMIN_EMAIL "Administrator email (optional)" "${EP_ADMIN_EMAIL:-}"
prompt_var EP_ADMIN_PASSWORD "Administrator password (optional)" "${EP_ADMIN_PASSWORD:-}" "password"
prompt_var EP_DOMAIN "Domain name (optional, e.g. panel.example.com)" "${EP_DOMAIN:-}"
prompt_var EP_ENABLE_SSL "Enable Let's Encrypt SSL? (yes/no)" "${EP_ENABLE_SSL:-no}"
prompt_var EP_DISCORD_CLIENT_ID "Discord client ID (optional)" "${EP_DISCORD_CLIENT_ID:-}"
prompt_var EP_DISCORD_CLIENT_SECRET "Discord client secret (optional)" "${EP_DISCORD_CLIENT_SECRET:-}" "password"

install_docker

if [ -d "$EP_INSTALL_DIR" ]; then
  warn "Installation directory already exists: $EP_INSTALL_DIR"
  if [ -z "${EP_FORCE_OVERWRITE:-}" ]; then
    read -r -p "Overwrite application code? Existing .env and database volumes will be preserved [y/N]: " ans
    [ "${ans,,}" = "y" ] || die "Aborted by user"
  fi
fi

step "Obtaining Euphoria Panel source"
mkdir -p "$EP_INSTALL_DIR"
if [ -n "${EP_SOURCE_DIR:-}" ] && [ -d "$EP_SOURCE_DIR" ]; then
  info "Using local source: $EP_SOURCE_DIR"
  rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='*.pyc' "$EP_SOURCE_DIR"/ "$EP_INSTALL_DIR"/
elif [ -n "${EP_SOURCE_ARCHIVE:-}" ] && [ -f "$EP_SOURCE_ARCHIVE" ]; then
  info "Extracting source archive: $EP_SOURCE_ARCHIVE"
  tar -xzf "$EP_SOURCE_ARCHIVE" -C "$EP_INSTALL_DIR" --strip-components=1
else
  if [ -n "${EP_GIT_REPO:-}" ]; then
    GIT_REPO="$EP_GIT_REPO"
  elif [ -n "$DEFAULT_SOURCE" ]; then
    GIT_REPO="file://$DEFAULT_SOURCE"
  else
    GIT_REPO="${EP_GIT_REPO_DEFAULT:-https://github.com/YOUR-ORG/euphoria-panel.git}"
  fi
  EP_GIT_REF="${EP_GIT_REF:-main}"
  info "Cloning $GIT_REPO (ref: $EP_GIT_REF)"
  rm -rf "$EP_INSTALL_DIR"/* "$EP_INSTALL_DIR"/.[!.]* 2>/dev/null || true
  git clone --depth 1 --branch "$EP_GIT_REF" "$GIT_REPO" "$EP_INSTALL_DIR"
fi
ok "Source ready"

step "Generating environment configuration"
SECRET_KEY="$(rand_secret 64)"
if [ -n "$EP_DOMAIN" ]; then
  PUBLIC_ORIGIN="https://${EP_DOMAIN}"
  [ "${EP_ENABLE_SSL,,}" != "yes" ] && PUBLIC_ORIGIN="http://${EP_DOMAIN}"
  CORS_ORIGINS="${PUBLIC_ORIGIN}"
  FRONTEND_URL="${PUBLIC_ORIGIN}"
  # backend URL is derived from frontend origin if same host
  NEXT_PUBLIC_API_URL="${PUBLIC_ORIGIN}"
else
  PUBLIC_ORIGIN="http://localhost:${EP_FRONTEND_PORT}"
  CORS_ORIGINS="http://localhost:${EP_FRONTEND_PORT},http://localhost:${EP_BACKEND_PORT}"
  FRONTEND_URL="$PUBLIC_ORIGIN"
  NEXT_PUBLIC_API_URL=""
fi

ENV_FILE="$EP_INSTALL_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  cp -a "$ENV_FILE" "$ENV_FILE.pre-update-$(date +%Y%m%d%H%M%S)"
fi

cat > "$ENV_FILE" <<EOF
POSTGRES_USER=${EP_DB_USER}
POSTGRES_PASSWORD=${EP_DB_PASSWORD}
POSTGRES_DB=${EP_DB_NAME}

SECRET_KEY=${SECRET_KEY}
COOKIE_SECURE=$([ "${EP_ENABLE_SSL,,}" = "yes" ] && echo true || echo false)
CORS_ORIGINS=${CORS_ORIGINS}
FRONTEND_URL=${FRONTEND_URL}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

PTERO_PANEL_URL=${EP_PTERO_URL}
PTERO_API_KEY=${EP_PTERO_API_KEY}
PTERO_DEFAULT_NODE_ID=
PTERO_DEFAULT_LOCATION_ID=
PTERO_DEFAULT_EGG_ID=
PTERO_DEFAULT_NEST_ID=
PTERO_DEFAULT_ALLOCATION_ID=

DISCORD_CLIENT_ID=${EP_DISCORD_CLIENT_ID}
DISCORD_CLIENT_SECRET=${EP_DISCORD_CLIENT_SECRET}
DISCORD_REDIRECT_URI=http://${EP_DOMAIN:-localhost}:${EP_BACKEND_PORT}/api/discord/callback
DISCORD_REWARD_COINS=50

MAX_SERVERS_PER_USER=3
ADMIN_EMAIL=${EP_ADMIN_EMAIL}
ADMIN_PASSWORD=${EP_ADMIN_PASSWORD}

MAINTENANCE_MODE=false
REGISTRATION_ENABLED=true
CLAIMS_ENABLED=true
EOF
chmod 600 "$ENV_FILE"
# Docker Compose automatically reads .env in project dir
cp "$ENV_FILE" "$EP_INSTALL_DIR/backend/.env" 2>/dev/null || true
chmod 600 "$EP_INSTALL_DIR/backend/.env" 2>/dev/null || true
ok "Environment written"

step "Saving installation state"
mkdir -p /etc/euphoria-panel
printf '%s\n' "$EP_INSTALL_DIR" > /etc/euphoria-panel/install_dir
printf '%s\n' "$EP_FRONTEND_PORT" > /etc/euphoria-panel/frontend_port
printf '%s\n' "$EP_BACKEND_PORT" > /etc/euphoria-panel/backend_port
chmod 755 /etc/euphoria-panel
chmod 644 /etc/euphoria-panel/*
ok "State saved"

step "Building and starting Euphoria Panel"
cd "$EP_INSTALL_DIR"
FRONTEND_PORT="$EP_FRONTEND_PORT" BACKEND_PORT="$EP_BACKEND_PORT" docker compose up -d --build

step "Waiting for health checks"
EP_BACKEND_URL="http://127.0.0.1:${EP_BACKEND_PORT}"
for i in $(seq 1 60); do
  if curl -fsSL "${EP_BACKEND_URL}/api/health" >/dev/null 2>&1; then
    ok "Backend healthy"
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then die "Backend did not become healthy"; fi
done

for i in $(seq 1 60); do
  if curl -fsSL "http://127.0.0.1:${EP_FRONTEND_PORT}" >/dev/null 2>&1; then
    ok "Frontend healthy"
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then die "Frontend did not become healthy"; fi
done

step "Installing EP management command"
cat > /usr/local/bin/ep <<'EPCLI'
#!/usr/bin/env bash
# Euphoria Panel management command
EP_STATE_DIR="/etc/euphoria-panel"
get_state(){ [ -f "$EP_STATE_DIR/$1" ] && cat "$EP_STATE_DIR/$1"; }
INSTALL_DIR="$(get_state install_dir)"; INSTALL_DIR="${INSTALL_DIR:-/opt/euphoria-panel}"
FRONTEND_PORT="$(get_state frontend_port)"; FRONTEND_PORT="${FRONTEND_PORT:-3001}"
BACKEND_PORT="$(get_state backend_port)"; BACKEND_PORT="${BACKEND_PORT:-8001}"
cd "$INSTALL_DIR" 2>/dev/null || { echo "Install directory not found: $INSTALL_DIR" >&2; exit 1; }
compose(){ docker compose "$@"; }
case "${1:-}" in
  ""|status) compose ps ;;
  start) compose up -d ;;
  stop) compose stop ;;
  restart) compose restart ;;
  logs) shift; compose logs -f --tail=200 "$@" ;;
  install) echo "Already installed at $INSTALL_DIR" ;;
  update) exec "$INSTALL_DIR/installer/update.sh" ;;
  backup) exec "$INSTALL_DIR/installer/backup.sh" ;;
  restore) shift; exec "$INSTALL_DIR/installer/restore.sh" "$@" ;;
  configure) exec "$INSTALL_DIR/installer/configure.sh" ;;
  version) grep -m1 version frontend/package.json 2>/dev/null | sed 's/.*"version": *"//;s/".*//' || echo "unknown" ;;
  uninstall) exec "$INSTALL_DIR/installer/uninstall.sh" ;;
  *) echo "Usage: ep {status|start|stop|restart|logs|update|backup|restore|configure|version|uninstall}" >&2; exit 2 ;;
esac
EPCLI
chmod 755 /usr/local/bin/ep
if [ -d "$EP_INSTALL_DIR/installer" ]; then
  cp /home/ubuntu/euphoria-panel/installer/*.sh "$EP_INSTALL_DIR/installer/" 2>/dev/null || true
fi
ok "EP command installed"

step "Configuring firewall (if active)"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "$EP_FRONTEND_PORT"/tcp >/dev/null 2>&1 || true
  ufw allow "$EP_BACKEND_PORT"/tcp >/dev/null 2>&1 || true
  [ -n "$EP_DOMAIN" ] && { ufw allow 80/tcp >/dev/null 2>&1 || true; ufw allow 443/tcp >/dev/null 2>&1 || true; }
  ok "Firewall rules added"
else
  warn "UFW is not active; skipped firewall configuration"
fi

echo
echo -e "${GR}EUPHORIA PANEL INSTALLED SUCCESSFULLY${R}"
echo
echo "Management command: ep status"
if [ -n "$EP_DOMAIN" ]; then
  echo "Frontend URL:      ${PUBLIC_ORIGIN}"
else
  echo "Frontend URL:      http://IP_OR_DOMAIN:${EP_FRONTEND_PORT}"
fi
[ -n "$EP_DOMAIN" ] && echo "Domain URL:        https://${EP_DOMAIN}" || true
echo
echo "Secrets are stored in $EP_INSTALL_DIR/.env (mode 600)."
echo "Never share this file."
