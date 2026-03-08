# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo for on-device AI inference apps. Uses [Turborepo](https://turborepo.com) with pnpm workspaces.

### Apps

- `apps/plasmo` — Browser extension (Chrome MV3, Firefox MV2, Safari) running LLM inference locally via Transformers.js and WebGPU
- `apps/nextjs` — Next.js 15 web app
- `apps/expo` — Expo SDK 54 / React Native mobile app
- `apps/tanstack-start` — Tanstack Start web app

### Shared Packages

- `packages/api` — tRPC v11 router
- `packages/auth` — Authentication (better-auth)
- `packages/db` — Database (Drizzle + Supabase)
- `packages/ui` — Shared UI components (shadcn-ui)
- `tooling/` — Shared eslint, prettier, tailwind, typescript configs

## Commands

```bash
# Monorepo root
pnpm dev              # Run all apps
pnpm dev:chrome       # Run plasmo Chrome extension only
pnpm dev:firefox      # Run plasmo Firefox extension only
pnpm dev:plasmo       # Run both Chrome + Firefox via Turbo TUI
pnpm dev:next         # Run Next.js app only

# Inside apps/plasmo
pnpm dev              # Start dev server → build/chrome-mv3-dev/
pnpm dev:chrome       # Same as pnpm dev
pnpm dev:firefox      # Firefox dev server → build/firefox-mv2-dev/
pnpm build            # Production build → build/chrome-mv3-prod/
pnpm build:firefox    # Firefox production build → build/firefox-mv2-prod/
pnpm build:safari     # Build Chrome MV3 then convert to Safari Xcode project → build/safari/
pnpm package          # Create zip for Chrome Web Store
pnpm package:firefox  # Create zip for Firefox Add-ons
pnpm test:background  # Smoke test prod background.js for missing modules
pnpm test:firefox     # Smoke test Firefox prod background.js
pnpm test:safari      # Smoke test + verify Safari conversion prerequisites
pnpm test:background build/chrome-mv3-dev/static/background/index.js  # Test dev build
```

**Run `pnpm test:background` after any change to aliases, stubs, postinstall, postbuild, or dependencies** — it catches "Cannot find module" errors instantly without needing to load the extension in Chrome.

### Loading Extensions

- **Chrome**: `chrome://extensions` → Developer mode → Load unpacked → `apps/plasmo/build/chrome-mv3-dev`
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → any file in `apps/plasmo/build/firefox-mv2-dev`
- **Safari**: `pnpm build:safari` → open Xcode project at `build/safari/` → build & run → enable in Safari Settings > Extensions

## Firefox & Safari Notes

### Firefox (MV2)

- Uses Manifest V2 (`browser_action` + `sidebar_action` instead of MV3 `side_panel`)
- WebGPU has **limited GPU memory** — use the smallest models (e.g. Qwen2.5-0.5B). Models 0.8B+ (including Qwen3.5-0.8B) may hit "Not enough memory" errors at runtime.
- `q4f16` dtype requires `shader-f16`; the extension auto-detects and falls back to `q4` when unavailable.
- HMR websocket does not connect in extension context — reload manually after code changes.
- Debug via `about:debugging#/runtime/this-firefox` → Inspect on the extension.
- PostBuild (`postbuild/sed.js`) patches the Firefox manifest to add `browser_specific_settings.gecko`, `sidebar_action`, and `<all_urls>` permission.

### Safari

- Converted from Chrome MV3 build via `xcrun safari-web-extension-converter` (requires Xcode 14+).
- `sidePanel` permission and `side_panel` key are stripped during conversion (not supported in Safari).
- WebGPU support is experimental and varies by macOS version.

## Plasmo Chrome Extension Architecture

All paths below are relative to `apps/plasmo/`.

### Entry Points

- `src/background.ts` — Service worker: model loading, inference, streaming, context menus, message passing to sidepanel
- `src/sidepanel.tsx` — Main UI (Chat component wrapped in MathJax context)
- `src/popup.tsx` — Minimal placeholder popup

### GenAI Pipelines (`src/genai/`)

- `pipeline/text-generation.ts` — LLM text generation (Llama, Phi, SmolLM, Qwen)
- `pipeline/multimodal-llm.ts` — Image understanding and generation (Janus)
- `pipeline/speech-to-text.ts` — Whisper-based transcription
- `pipeline/text-to-speech.ts` — Stub/WIP
- `model-list.ts` — Available models per task with dtype/device configs
- `model-registry.ts` — WebGPU capability detection, fp16 support, storage integration
- `default-config.ts` — Default model (Llama-3.2-1B-Instruct-q4f16) and generation params
- `stopping-criteria.ts` — Interruptable EOS stopping criteria

### Components (`src/components/`)

- `Chat.tsx` — Main chat UI: message state, multimodal input (text/image/audio), streaming display, TPS metrics
- `ChatHeader.tsx` — Model selector, generation settings
- `ChatMessages.tsx` — Message history with markdown/LaTeX rendering
- `ChangeModelForm.tsx` / `GenerationConfigForm.tsx` — Configuration UIs
- `ui/` — shadcn/ui components (New York style)

### Types (`src/types.ts`)

`ModelTask` = `"text-generation" | "multimodal-llm" | "speech-to-text" | "reasoning" | "text-to-speech"`. Each task has its own `ModelConfig` variant with dtype/device fields.

## Critical Build Compatibility System (Plasmo)

The extension bundles `@huggingface/transformers` which depends on `onnxruntime-web`. Several compatibility issues require workarounds:

### PostInstall (`postinstall/run.sh`)

- Removes transformers.js dist files to force source compilation
- Patches `env.js` to set `IS_BROWSER_ENV = true` (required for service worker context)

### Module Stubs (`package.json` aliases → `postinstall/`)

Node-only modules must be stubbed out since they don't exist in Chrome extensions:

| Alias | Stub | Why |
|---|---|---|
| `sharp` | `sharp-stub.js` | Image processing (not needed in browser) |
| `fs` / `node:fs` | `fs-stub.js` | Node filesystem (used in transformers.js audio.js) |
| `onnxruntime-node` | `onnxruntime-node-stub.js` | Native ONNX backend (use onnxruntime-web instead) |

### PostBuild (`postbuild/sed.js`)

Runs after each Plasmo build (configured via `POST_BUILD_SCRIPT` in `.env`):

1. Replaces `import.meta.url` → `self.location.href` (import.meta invalid outside ES modules)
2. Rewrites bare Node builtin requires (`require("fs")` → `require("node:fs")`) to match Parcel's dependency maps

### `@parcel/resolver-default` config

`"packageExports": true` in package.json enables Node exports map resolution. The `url` dependency is pinned to `0.11.0` to avoid pulling in `math-intrinsics` which breaks Parcel's export resolution.

## Ocean Theme (Next.js)

The Next.js app uses a custom ocean color palette defined in `apps/nextjs/src/app/styles.css`. Use these instead of generic shadcn colors (`bg-card`, `text-primary`, `bg-muted`, `text-muted-foreground`) for consistency across all pages.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `ocean-foam` | `#f0fafe` | `#0c2535` | Page backgrounds |
| `ocean-shallow` | `#e0f4fb` | `#0f2d3d` | Card/bubble backgrounds, sections |
| `ocean-light` | `#b8e6f5` | `#12384d` | Accent backgrounds |
| `ocean-mid` | `#7cc8e8` | `#1a5270` | Borders (`border-ocean-mid/20`), decorative |
| `ocean-deep` | `#1a6fa0` | `#5bb8db` | Primary buttons, links, icons |
| `ocean-abyss` | `#0c2d48` | `#060f18` | Dark sections (CTA, footer) |
| `ocean-text` | `#0c2d48` | `#b8e6f5` | Headings, body text |
| `ocean-text-muted` | `#1a6fa0` | `#7cc8e8` | Secondary text, descriptions |

**Dark mode note**: `bg-ocean-deep` becomes light in dark mode, so pair with `dark:text-ocean-abyss` (not `text-white`) for buttons and user chat bubbles.

## Key Patterns

- **Streaming inference**: Background service worker runs model, streams tokens via `chrome.runtime.sendMessage` to sidepanel
- **Model caching**: Uses `@plasmohq/storage` to persist model config and generation settings
- **Path aliases**: `~/` maps to project root (configured in tsconfig)
- **Tailwind config**: Content pattern is `./src/**/*.tsx` (not `./**/*.tsx` to avoid scanning node_modules)
