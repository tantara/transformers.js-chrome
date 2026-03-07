// Test: check that the built background bundle doesn't contain hardcoded
// file:///node_modules paths that break ONNX runtime WASM resolution in
// the Chrome extension service worker context.
//
// Reproduces: "no available backend found. ERR: [webgpu] Error: Cannot find
// module 'file:///node_modules/.pnpm/onnxruntime-web@.../ort-wasm-simd-threaded.jsep.mjs'"

import { readFileSync } from "fs";

const target =
  process.argv[2] || "build/chrome-mv3-prod/static/background/index.js";

let code;
try {
  code = readFileSync(target, "utf8");
} catch (e) {
  console.error(`Could not read ${target} — run pnpm build first`);
  process.exit(1);
}

// Find all hardcoded file:///node_modules paths — these will never resolve
// inside a Chrome extension and are the root cause of the ONNX backend error.
const pattern = /file:\/\/\/node_modules\/[^\s"'`)]+/g;
const matches = [...code.matchAll(pattern)];

if (matches.length > 0) {
  console.error(
    `\n❌ Found ${matches.length} hardcoded file:///node_modules path(s) in ${target}:\n`
  );
  const unique = [...new Set(matches.map((m) => m[0]))];
  for (const path of unique) {
    console.error(`  ${path}`);
  }
  console.error(
    "\nThese paths are inlined by Parcel from import.meta.url at build time."
  );
  console.error(
    "The postbuild sed.js must replace them so ONNX runtime can resolve its WASM files.\n"
  );
  process.exit(1);
} else {
  console.log(
    `✅ No hardcoded file:///node_modules paths found in ${target}`
  );
}
