// Smoke test: load the background bundle in a minimal browser-like environment
// to catch "Cannot find module" errors without a real browser.

// Provide minimal globals that Chrome extension service workers have
globalThis.chrome = {
  runtime: { sendMessage: () => Promise.resolve(), onMessage: { addListener: () => {} }, onInstalled: { addListener: () => {} } },
  sidePanel: { setPanelBehavior: () => Promise.resolve(), open: () => Promise.resolve() },
  contextMenus: { create: () => {}, onClicked: { addListener: () => {} } },
  scripting: { executeScript: () => Promise.resolve() },
  storage: { local: { get: () => Promise.resolve({}), set: () => Promise.resolve() } },
};
globalThis.self = globalThis;
globalThis.location = { href: "chrome-extension://fake/static/background/index.js" };
try { Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0", hardwareConcurrency: 4 }, configurable: true }); } catch {}
globalThis.performance = { now: () => Date.now() };
globalThis.addEventListener = () => {};
globalThis.importScripts = () => {};
globalThis.AudioContext = undefined;
globalThis.WebAssembly = globalThis.WebAssembly ?? {};

// Suppress any fetch calls
globalThis.fetch = () => Promise.reject(new Error("fetch not available in test"));

const { readFileSync } = await import("fs");
const target = process.argv[2] || "build/chrome-mv3-prod/static/background/index.js";
const code = readFileSync(target, "utf8");

try {
  // Use indirect eval to execute in global scope
  const fn = new Function(code);
  fn();
  console.log("✅ Background script loaded successfully — no missing module errors");
} catch (e) {
  if (e.message?.includes("Cannot find module")) {
    console.error("❌", e.message);
    process.exit(1);
  } else {
    // Other runtime errors are expected (no real Chrome APIs)
    console.log("✅ Background script loaded (runtime error expected):", e.message);
  }
}
