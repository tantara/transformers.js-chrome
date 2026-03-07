#!/bin/bash

ENV_FILE="node_modules/@huggingface/transformers/src/env.js"

# Skip if transformers.js is not installed (e.g. when deploying nextjs only)
if [ ! -d "node_modules/@huggingface/transformers" ]; then
  echo "postinstall: @huggingface/transformers not found, skipping"
  exit 0
fi

# Save the pre-built web dist (used by Next.js/Turbopack) before wiping
DIST_DIR="node_modules/@huggingface/transformers/dist"
WEB_DIST="$DIST_DIR/transformers.web.js"
if [ -f "$WEB_DIST" ]; then
  cp "$WEB_DIST" /tmp/_transformers_web_dist_backup.js
fi

# Remove pre-built dist to force Parcel to compile from patched source
rm -rf "$DIST_DIR"/*.{js,cjs,mjs,map}

# Restore the web dist so Next.js/Turbopack can resolve the package
if [ -f /tmp/_transformers_web_dist_backup.js ]; then
  cp /tmp/_transformers_web_dist_backup.js "$WEB_DIST"
  rm /tmp/_transformers_web_dist_backup.js
fi

if [ -f "$ENV_FILE" ] && ! grep -q 'const IS_BROWSER_ENV = true;' "$ENV_FILE"; then
  # Use temp file for cross-platform sed compatibility (macOS vs GNU/Linux)
  sed 's/const IS_BROWSER_ENV = typeof window.*$/\/\/ const IS_BROWSER_ENV = typeof window !== "undefined" \&\& typeof window.document !== "undefined";\
const IS_BROWSER_ENV = true;/' "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
fi
