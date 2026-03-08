// Smoke test: load the background bundle in a minimal browser-like environment
// to catch "Cannot find module" errors without a real browser.

// Detect target from the build path to provide appropriate globals
const isFirefox = (process.argv[2] || "").includes("firefox");

// Provide minimal globals that browser extension service workers have
globalThis.chrome = {
  runtime: { sendMessage: () => Promise.resolve(), onMessage: { addListener: () => {} }, onInstalled: { addListener: () => {} } },
  sidePanel: isFirefox ? undefined : { setPanelBehavior: () => Promise.resolve(), open: () => Promise.resolve() },
  contextMenus: { create: () => {}, onClicked: { addListener: () => {} } },
  scripting: { executeScript: () => Promise.resolve() },
  storage: { local: { get: () => Promise.resolve({}), set: () => Promise.resolve() } },
};
// Firefox also exposes the browser.* namespace with sidebar support
if (isFirefox) {
  globalThis.browser = {
    ...globalThis.chrome,
    sidebarAction: { open: () => Promise.resolve(), setPanel: () => Promise.resolve() },
  };
}
globalThis.self = globalThis;
const scheme = isFirefox ? "moz-extension" : "chrome-extension";
globalThis.location = { href: `${scheme}://fake/static/background/index.js` };
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
