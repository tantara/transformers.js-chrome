#!/bin/bash

ENV_FILE="node_modules/@huggingface/transformers/src/env.js"

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
  sed -i '' 's/const IS_BROWSER_ENV = typeof window.*$/\/\/ const IS_BROWSER_ENV = typeof window !== "undefined" \&\& typeof window.document !== "undefined";\
const IS_BROWSER_ENV = true;/' "$ENV_FILE"
fi

# sed -i '' 's|https://cdn.jsdelivr.net/npm/mathjax@[^"]*||g' node_modules/better-react-mathjax/MathJaxContext/MathJaxContext.js
# sed -i '' 's|https://cdn.jsdelivr.net/npm/mathjax@[^"]*||g' node_modules/better-react-mathjax/esm/MathJaxContext/MathJaxContext.js
