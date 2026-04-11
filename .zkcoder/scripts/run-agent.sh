#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME_DIR="$ROOT/.zkcoder/home"
GLOBAL_CODEX_HOME="${HOME}/.codex"

mkdir -p "$CODEX_HOME_DIR"

if [[ -f "$GLOBAL_CODEX_HOME/auth.json" && ! -f "$CODEX_HOME_DIR/auth.json" ]]; then
  cp "$GLOBAL_CODEX_HOME/auth.json" "$CODEX_HOME_DIR/auth.json"
fi

exec env CODEX_HOME="$CODEX_HOME_DIR" \
  "/Users/hyunokoh/.nvm/versions/node/v18.19.1/bin/codex" exec \
  --skip-git-repo-check \
  --cd "$ROOT" \
  --sandbox workspace-write \
  --json
