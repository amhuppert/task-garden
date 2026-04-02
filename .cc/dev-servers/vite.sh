#!/bin/sh
# CC Dev Server — Vite
# Installed by CC (Claude Code). Intended to be committed to the repo.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_helpers.sh"

BASE_PORT=5173
WORKTREE_DIR="$(pwd)"

check_port "$BASE_PORT" "$WORKTREE_DIR"
case $? in
  0) PORT="$BASE_PORT" ;;
  1)
    echo "CC_PORT=$BASE_PORT"
    exit 0
    ;;
  2)
    PORT=$(find_available_port "$BASE_PORT" "$WORKTREE_DIR")
    if [ $? -eq 1 ]; then
      echo "CC_PORT=$PORT"
      exit 0
    fi
    ;;
esac

echo "CC_PORT=$PORT"
exec bunx vite --port "$PORT"
