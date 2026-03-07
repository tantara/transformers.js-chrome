#!/bin/bash

ENV_FILE="node_modules/@huggingface/transformers/src/env.js"

rm -rf node_modules/@huggingface/transformers/dist/*.{js,cjs,mjs,map}

if [ -f "$ENV_FILE" ] && ! grep -q 'const IS_BROWSER_ENV = true;' "$ENV_FILE"; then
  sed -i '' 's/const IS_BROWSER_ENV = typeof window.*$/\/\/ const IS_BROWSER_ENV = typeof window !== "undefined" \&\& typeof window.document !== "undefined";\
const IS_BROWSER_ENV = true;/' "$ENV_FILE"
fi

# sed -i '' 's|https://cdn.jsdelivr.net/npm/mathjax@[^"]*||g' node_modules/better-react-mathjax/MathJaxContext/MathJaxContext.js
# sed -i '' 's|https://cdn.jsdelivr.net/npm/mathjax@[^"]*||g' node_modules/better-react-mathjax/esm/MathJaxContext/MathJaxContext.js
