# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (MV3) that runs LLM inference locally in the browser using Transformers.js and WebGPU. Supports text generation, multimodal (image+text), speech-to-text, and reasoning models. Built with Plasmo framework, React 19, and Tailwind CSS.

## Commands

```bash
pnpm dev              # Start dev server → build/chrome-mv3-dev/
pnpm build            # Production build → build/chrome-mv3-prod/
pnpm package          # Create zip for Chrome Web Store
pnpm test:background  # Smoke test prod background.js for missing modules
pnpm test:background build/chrome-mv3-dev/static/background/index.js  # Test dev build
```

**Run `pnpm test:background` after any change to aliases, stubs, postinstall, postbuild, or dependencies** — it catches "Cannot find module" errors instantly without needing to load the extension in Chrome.

Load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `build/chrome-mv3-dev` or `build/chrome-mv3-prod`.

## Architecture

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

## Critical Build Compatibility System

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

## Key Patterns

- **Streaming inference**: Background service worker runs model, streams tokens via `chrome.runtime.sendMessage` to sidepanel
- **Model caching**: Uses `@plasmohq/storage` to persist model config and generation settings
- **Path aliases**: `~/` maps to project root (configured in tsconfig)
- **Tailwind config**: Content pattern is `./src/**/*.tsx` (not `./**/*.tsx` to avoid scanning node_modules)
