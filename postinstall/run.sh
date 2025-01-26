#!/bin/bash

rm -rf node_modules/@huggingface/transformers/dist/*.{js,cjs,mjs,map}

sed -i '' 's/const IS_BROWSER_ENV = typeof window.*$/\/\/ const IS_BROWSER_ENV = typeof window !== "undefined" \&\& typeof window.document !== "undefined";\
const IS_BROWSER_ENV = true;/' node_modules/@huggingface/transformers/src/env.js