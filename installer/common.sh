#!/usr/bin/env bash
# Euphoria Panel installer common helpers

EP_APP_NAME="Euphoria Panel"
EP_SHORT="EP"
EP_DEFAULT_INSTALL_DIR="/opt/euphoria-panel"
EP_STATE_DIR="/etc/euphoria-panel"

if [ -t 1 ]; then
  EP_COLOR_RESET="\033[0m"
  EP_COLOR_BOLD="\033[1m"
  EP_COLOR_BLUE="\033[1;34m"
  EP_COLOR_GREEN="\033[1;32m"
  EP_COLOR_YELLOW="\033[1;33m"
  EP_COLOR_RED="\033[1;31m"
  EP_COLOR_CYAN="\033[1;36m"
else
  EP_COLOR_RESET=""
  EP_COLOR_BOLD=""
  EP_COLOR_BLUE=""
  EP_COLOR_GREEN=""
  EP_COLOR_YELLOW=""
  EP_COLOR_RED=""
  EP_COLOR_CYAN=""
fi

ep_banner() {
  echo -e "${EP_COLOR_CYAN}"
  cat <<'BANNER'
╔══════════════════════════════════════════╗
║                                          ║
║           EUPHORIA PANEL                 ║
║          VPS INSTALLER                   ║
║                                          ║
║              EP SYSTEM                   ║
║                                          ║
╚══════════════════════════════════════════╝
BANNER
  echo -e "${EP_COLOR_RESET}"
}

ep_info() { echo -e "${EP_COLOR_BLUE}[INFO]${EP_COLOR_RESET} $*"; }
ep_ok() { echo -e "${EP_COLOR_GREEN}[✓]${EP_COLOR_RESET} $*"; }
ep_warn() { echo -e "${EP_COLOR_YELLOW}[!]${EP_COLOR_RESET} $*"; }
ep_error() { echo -e "${EP_COLOR_RED}[ERROR]${EP_COLOR_RESET} $*" >&2; }
ep_die() { ep_error "$*"; exit 1; }
ep_step() { echo -e "${EP_COLOR_BOLD}${EP_COLOR_CYAN}==> $*${EP_COLOR_RESET}"; }

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    ep_die "This installer must be run as root. Use sudo."
  fi
}

detect_os() {
  if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
  else
    ep_die "Cannot detect operating system."
  fi
  EP_OS_ID="${ID:-unknown}"
  EP_OS_VERSION="${VERSION_ID:-unknown}"
  EP_OS_PRETTY="${PRETTY_NAME:-$EP_OS_ID $EP_OS_VERSION}"
  case "$EP_OS_ID" in
    ubuntu|debian) ;;
    *) ep_die "Unsupported operating system: $EP_OS_PRETTY. Supported: Ubuntu 22.04/24.04, Debian 12." ;;
  esac
  if [ "$EP_OS_ID" = "ubuntu" ]; then
    case "$EP_OS_VERSION" in
      22.04|24.04) ;;
      *) ep_warn "Ubuntu $EP_OS_VERSION has not been tested. Continuing." ;;
    esac
  fi
  if [ "$EP_OS_ID" = "debian" ] && [ "$EP_OS_VERSION" != "12" ]; then
    ep_warn "Debian $EP_OS_VERSION has not been tested. Continuing."
  fi
}

detect_arch() {
  EP_ARCH="$(uname -m)"
  case "$EP_ARCH" in
    x86_64|aarch64|arm64) ;;
    *) ep_die "Unsupported architecture: $EP_ARCH." ;;
  esac
}

check_command() { command -v "$1" >/dev/null 2>&1; }

check_internet() {
  if ! (curl -fsSL --max-time 10 https://www.google.com >/dev/null 2>&1 \
     || wget -qO- --timeout=10 https://www.google.com >/dev/null 2>&1); then
    ep_warn "Internet connectivity check failed. Continuing, but installation may fail."
  fi
}

random_secret() {
  local len="${1:-48}"
  if check_command openssl; then
    openssl rand -base64 "$len" | tr -d '\n=/+' | head -c "$len"
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$len"
  fi
  echo
}

validate_port() {
  local port="$1"
  case "$port" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$port" -ge 1 ] && [ "$port" -le 65535 ]
}

port_in_use() {
  local port="$1"
  if check_command ss; then
    ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${port}$"
  elif check_command netstat; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${port}$"
  else
    return 1
  fi
}

ep_prompt() {
  # usage: ep_prompt VAR_NAME "Prompt text" "default value" "optional:password"
  local var_name="$1" prompt_text="$2" default_value="${3:-}" mode="${4:-text}"
  local value="${!var_name:-}"
  if [ -n "$value" ]; then
    return 0
  fi
  if [ -n "${EP_NONINTERACTIVE:-}" ]; then
    eval "$var_name=\"$default_value\""
    return 0
  fi
  local suffix=""
  if [ -n "$default_value" ]; then
    suffix=" [$default_value]"
  fi
  if [ "$mode" = "password" ]; then
    read -r -s -p "${prompt_text}${suffix}: " value
    echo
  else
    read -r -p "${prompt_text}${suffix}: " value
  fi
  if [ -z "$value" ]; then
    value="$default_value"
  fi
  eval "$var_name=\"$value\""
}

install_system_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y --no-install-recommends curl ca-certificates gnupg git \
      docker.io docker-compose-plugin openssl ufw 2>/dev/null || true
  else
    ep_die "apt-get not found. Install dependencies manually."
  fi
}

install_docker_if_needed() {
  if check_command docker && docker compose version >/dev/null 2>&1; then
    ep_ok "Docker and Docker Compose already installed"
    return
  fi
  ep_step "Installing Docker"
  if check_command docker; then
    ep_warn "Docker found but Compose plugin missing; installing system packages"
  fi
  install_system_packages
  if ! (check_command docker && docker compose version >/dev/null 2>&1); then
    ep_step "Fallback: installing Docker via official script"
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
  fi
  systemctl enable --now docker
  if ! (check_command docker && docker compose version >/dev/null 2>&1); then
    ep_die "Docker installation failed."
  fi
  ep_ok "Docker ready"
}

save_install_dir() {
  local dir="$1"
  mkdir -p "$EP_STATE_DIR"
  printf '%s\n' "$dir" > "$EP_STATE_DIR/install_dir"
  chmod 755 "$EP_STATE_DIR"
  chmod 644 "$EP_STATE_DIR/install_dir"
}

get_install_dir() {
  if [ -f "$EP_STATE_DIR/install_dir" ]; then
    cat "$EP_STATE_DIR/install_dir"
  else
    echo "$EP_DEFAULT_INSTALL_DIR"
  fi
}

ep_compose() {
  local dir
  dir="$(get_install_dir)"
  if [ ! -f "$dir/compose.yml" ]; then
    ep_die "Compose file not found at $dir/compose.yml"
  fi
  (cd "$dir" && docker compose "$@")
}
