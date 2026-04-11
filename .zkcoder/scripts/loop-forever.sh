#!/bin/zsh
set -euo pipefail

ROOT="/Users/hyunokoh/Documents/Projects/zkTalk"
cd "$ROOT"

export PATH="/Users/hyunokoh/.nvm/versions/node/v24.11.1/bin:$PATH"

MAX_RUNS_PER_BATCH="${ZKCODER_MAX_RUNS_PER_BATCH:-1000}"
SLEEP_SECONDS="${ZKCODER_LOOP_RESTART_SLEEP_SECONDS:-3}"

echo "[forever] zkcoder continuous loop starting (batch max-runs=${MAX_RUNS_PER_BATCH})"

while true; do
  echo "[forever] starting batch at $(date '+%Y-%m-%d %H:%M:%S %Z')"

  if ! zkcoder loop --max-runs "${MAX_RUNS_PER_BATCH}"; then
    echo "[forever] zkcoder loop exited non-zero; stopping wrapper"
    exit 1
  fi

  NEXT_JSON="$(zkcoder next || true)"
  echo "[forever] next status: ${NEXT_JSON}"

  if [[ "${NEXT_JSON}" == *"모든 queue 항목이 완료되었습니다"* ]] || [[ "${NEXT_JSON}" == *"all queue items completed"* ]]; then
    echo "[forever] queue completed; stopping wrapper"
    exit 0
  fi

  echo "[forever] queue still has pending work; restarting after ${SLEEP_SECONDS}s"
  sleep "${SLEEP_SECONDS}"
done
