#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${DIST_DIR:-$PROJECT_ROOT/dist}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/omnizap.xyz/current}"
NGINX_BIN="${NGINX_BIN:-nginx}"
SYSTEMCTL_BIN="${SYSTEMCTL_BIN:-systemctl}"
SERVICE_NAME="${SERVICE_NAME:-nginx}"

if command -v sudo >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  SUDO="sudo"
else
  SUDO=""
fi

run_root() {
  if [[ -n "$SUDO" ]]; then
    "$SUDO" "$@"
  else
    "$@"
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[deploy] erro: comando '$cmd' nao encontrado." >&2
    exit 1
  fi
}

require_cmd npm
require_cmd rsync
require_cmd "$NGINX_BIN"
require_cmd "$SYSTEMCTL_BIN"

cd "$PROJECT_ROOT"

echo "[deploy] build de producao (Vite gera assets com hash para cache bust)"
npm run build

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "[deploy] erro: arquivo '$DIST_DIR/index.html' nao encontrado apos build." >&2
  exit 1
fi

echo "[deploy] sincronizando arquivos para $DEPLOY_DIR"
run_root install -d "$DEPLOY_DIR"
# --delete remove assets antigos com hash anterior.
run_root rsync -a --delete "$DIST_DIR/" "$DEPLOY_DIR/"

echo "[deploy] validando configuracao do nginx"
run_root "$NGINX_BIN" -t

echo "[deploy] recarregando servico $SERVICE_NAME"
run_root "$SYSTEMCTL_BIN" reload "$SERVICE_NAME"

echo "[deploy] concluido com sucesso"
