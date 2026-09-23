#!/usr/bin/env bash
set -euo pipefail

# ---------- Gurita Panel installer ----------
# Verifies OS, Node.js, sets up dirs, runs create-admin.

RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; NC="\033[0m"
say()   { printf "${GREEN}==>${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}!!${NC} %s\n" "$*"; }
die()   { printf "${RED}xx${NC} %s\n" "$*"; exit 1; }

need_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "Please run as root (sudo)."
  fi
}

detect_os() {
  if [ ! -f /etc/os-release ]; then die "Cannot detect OS."; fi
  # shellcheck disable=SC1091
  . /etc/os-release
  if [ "${ID:-}" != "ubuntu" ] && [ "${ID_LIKE:-}" != *"ubuntu"* ] && [ "${ID:-}" != "debian" ]; then
    warn "OS $ID not explicitly supported; continuing anyway."
  fi
  say "OS: ${PRETTY_NAME:-unknown}"
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major=$(node -p 'process.versions.node.split(".")[0]')
    if [ "$major" -lt 18 ]; then
      die "Node.js >= 18 required (found $(node -v))."
    fi
    say "Node $(node -v) OK"
  else
    die "Node.js not installed. Install Node.js 18+ and re-run."
  fi
}

install_dir() {
  local appdir="${GURITA_DIR:-/opt/gurita-panel}"
  say "Installing to $appdir"
  mkdir -p "$appdir"
  # copy current dir contents if running from source
  if [ -n "${GURITA_SRC:-}" ] && [ -d "$GURITA_SRC" ]; then
    cp -r "$GURITA_SRC"/. "$appdir/"
  fi
  cd "$appdir"
  echo "$appdir"
}

setup_env() {
  local appdir="$1"
  cd "$appdir"
  if [ ! -f .env ]; then
    say "Creating .env"
    cp .env.example .env
    local secret
    secret=$(head -c 64 /dev/urandom | base64 | tr -d '\n=' | cut -c1-64)
    sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$secret|" .env
  else
    warn ".env already exists — leaving as-is."
  fi
  mkdir -p database storage/servers storage/backups storage/logs
  chmod 700 database storage
}

npm_install() {
  cd "$1"
  say "Installing npm dependencies…"
  npm install --omit=dev --no-audit --no-fund
}

check_cgroups() {
  if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
    say "cgroups v2 detected — resource limits will be enforced."
    if ! grep -q memory /sys/fs/cgroup/cgroup.controllers 2>/dev/null; then
      warn "memory controller not delegated; cgroup memory limits may not apply."
    fi
  else
    warn "cgroups v2 not detected. Resource limits will be recorded but not enforced."
  fi
}

check_systemd() {
  if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
    say "systemd detected. You may install gurita.service for supervision."
  else
    warn "systemd not detected — use 'nohup node server.js &' or your own supervisor."
  fi
}

create_admin() {
  cd "$1"
  say "Creating first admin. You will be prompted for credentials."
  echo "  (Password will never be echoed or stored in plaintext.)"
  node scripts/create-admin.js
}

print_summary() {
  cat <<EOF

==================================================
 Gurita Panel installation complete
==================================================
 App dir : $1
 Start   : cd $1 && npm start
 Panel   : http://127.0.0.1:3000  (adjust HOST in .env for LAN)
 Docs    : $1/README.md
==================================================
EOF
}

main() {
  need_root
  detect_os
  ensure_node
  local appdir
  appdir=$(install_dir)
  setup_env "$appdir"
  npm_install "$appdir"
  check_cgroups
  check_systemd
  create_admin "$appdir"
  print_summary "$appdir"
}

main "$@"