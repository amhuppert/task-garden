#!/usr/bin/env bash
set -euo pipefail
echo "Installing dependencies in worktree: $WORKTREE_PATH"
bun install
