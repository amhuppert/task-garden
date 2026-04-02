#!/usr/bin/env bash
set -euo pipefail

# Enable AI-optimal output for tools that detect CLAUDECODE
export CLAUDECODE=1

# 1. Auto-fix formatting and linting (changes auto-committed by CC after script)
bunx biome check --write . > /dev/null 2>&1

# 2. Type check — one-line-per-error format
bunx tsc --noEmit --pretty false

# 3. Tests — reporter auto-switches via CLAUDECODE detection in config
bunx vitest run --no-color
