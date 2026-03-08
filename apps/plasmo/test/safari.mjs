// Test: verify Safari conversion prerequisites and run background smoke test.
//
// Checks:
// 1. Chrome MV3 build exists (Safari conversion source)
// 2. Background bundle loads without missing module errors
// 3. xcrun safari-web-extension-converter is available

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";

const buildDir = "build/chrome-mv3-prod";
const target = `${buildDir}/static/background/index.js`;

// 1. Check build exists
if (!existsSync(buildDir)) {
  console.error(`❌ Chrome MV3 build not found at ${buildDir}`);
  console.error("   Run 'pnpm build' first (Safari uses the Chrome MV3 build).");
  process.exit(1);
}

if (!existsSync(target)) {
  console.error(`❌ Background script not found at ${target}`);
  process.exit(1);
}

// 2. Smoke test the background bundle (same as Chrome test)
globalThis.chrome = {
  runtime: {
    sendMessage: () => Promise.resolve(),
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
  },
  sidePanel: {
    setPanelBehavior: () => Promise.resolve(),
    open: () => Promise.resolve(),
  },
  contextMenus: { create: () => {}, onClicked: { addListener: () => {} } },
  scripting: { executeScript: () => Promise.resolve() },
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
};
globalThis.self = globalThis;
globalThis.location = {
  href: "safari-web-extension://fake/static/background/index.js",
};
try {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "Mozilla/5.0 Safari", hardwareConcurrency: 4 },
    configurable: true,
  });
} catch {}
globalThis.performance = { now: () => Date.now() };
globalThis.addEventListener = () => {};
globalThis.importScripts = () => {};
globalThis.AudioContext = undefined;
globalThis.WebAssembly = globalThis.WebAssembly ?? {};
globalThis.fetch = () =>
  Promise.reject(new Error("fetch not available in test"));

const code = readFileSync(target, "utf8");
try {
  const fn = new Function(code);
  fn();
  console.log(
    "✅ Background script loaded successfully — no missing module errors"
  );
} catch (e) {
  if (e.message?.includes("Cannot find module")) {
    console.error("❌", e.message);
    process.exit(1);
  } else {
    console.log(
      "✅ Background script loaded (runtime error expected):",
      e.message
    );
  }
}

// 3. Check Safari conversion tool availability
try {
  execSync("xcrun --find safari-web-extension-converter", { stdio: "pipe" });
  console.log("✅ safari-web-extension-converter is available");
} catch {
  console.log(
    "⚠️  safari-web-extension-converter not found (install Xcode 14+ to convert)"
  );
}

// 4. Check manifest doesn't have Firefox-only entries
const manifestPath = `${buildDir}/manifest.json`;
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.sidebar_action) {
    console.error(
      "❌ manifest.json contains sidebar_action (Firefox-only) — use Chrome build for Safari"
    );
    process.exit(1);
  }
  console.log("✅ Manifest is Safari-compatible");
}
