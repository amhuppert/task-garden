#!/usr/bin/env sh
# design-sync build prep — refreshes the three inputs the converter consumes from
# the live app source. Run this (it IS cfg.buildCmd) before package-build/resync.
set -e
cd "$(dirname "$0")/.."

# 1. Real app build → dist/assets/index-*.css (compiled Tailwind v4: tokens + utilities).
bun run build

# 2. Copy the compiled stylesheet to the stable cssEntry path (hashed name varies).
cp "$(ls -t dist/assets/index-*.css | head -1)" .design-sync/app-tailwind.css

# 3. Emit a .d.ts tree so the converter extracts real component props (findTypesRoot
#    discovers dist/types). tsc may exit non-zero on lint-only diagnostics but still
#    emits (noEmitOnError:false), so don't let it abort prep.
rm -rf dist/types
npx tsc -p .design-sync/tsconfig.dts.json || true
