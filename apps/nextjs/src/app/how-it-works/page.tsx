import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@acme/ui/button";

import { Footer } from "../_components/footer";
import { Navbar } from "../_components/navbar";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how TinyWhale runs AI models on-device across Chrome extensions, browsers, mobile, and desktop using WebGPU, Transformers.js, and llama.cpp.",
};

const steps = [
  {
    number: "01",
    title: "Load the Model",
    description:
      "An open source LLM (quantized to 4-bit) is downloaded directly into your browser. The model files are cached locally, so subsequent visits load instantly. The entire model is only ~500MB thanks to 4-bit quantization.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Chat Privately",
    description:
      "All inference runs locally on your GPU via WebGPU. Your conversations never leave your device — there's no server, no API calls, no telemetry. Once loaded, it even works offline.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Customize & Explore",
    description:
      "Fine-tune generation with temperature, top-p, top-k, and more. Upload images for vision tasks — our models support multimodal input. Experiment with different settings to get the best results.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const platforms = [
  {
    name: "Chrome Extension",
    badge: "Plasmo MV3",
    description: "Run LLMs directly in a Chrome side panel. The service worker loads the model and streams tokens to the UI via chrome.runtime.sendMessage().",
    details: [
      { label: "Inference Engine", value: "Transformers.js" },
      { label: "Model Format", value: "ONNX (q4f16)" },
      { label: "GPU Acceleration", value: "WebGPU" },
      { label: "Execution Context", value: "Service Worker" },
      { label: "Default Model", value: "Qwen3.5-0.8B" },
    ],
    techDetails: [
      "Service worker requires build patches: import.meta.url rewriting, Node module stubs (fs, sharp, onnxruntime-node), and env.js patching for IS_BROWSER_ENV",
      "Auto-detects WebGPU FP16 support (shader-f16) and falls back to q4 quantization when unavailable",
      "Supports Firefox MV2 (sidebar_action) and Safari (Xcode conversion) from the same codebase",
      "Models include text generation (Llama, Qwen, Phi, SmolLM, DeepSeek-R1), vision (Qwen VL, Janus), and speech-to-text (Whisper)",
    ],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15,3 21,3 21,9" />
        <line x1="10" x2="21" y1="14" y2="3" />
      </svg>
    ),
  },
  {
    name: "Browser",
    badge: "Next.js",
    description: "In-browser AI chat using a Web Worker to keep the main thread responsive. The LLMPipeline singleton loads the model once and handles both text-only and vision (image+text) inference.",
    details: [
      { label: "Inference Engine", value: "Transformers.js" },
      { label: "Model Format", value: "ONNX (q4f16)" },
      { label: "GPU Acceleration", value: "WebGPU (Web Worker)" },
      { label: "Execution Context", value: "Web Worker" },
      { label: "Default Model", value: "Qwen3.5-0.8B" },
    ],
    techDetails: [
      "Uses AutoModelForImageTextToText + AutoProcessor for unified text and vision inference in a single model",
      "TextStreamer provides real-time token streaming with TPS (tokens/sec) and TTFT (time to first token) metrics",
      "InterruptableStoppingCriteria allows users to stop generation mid-stream",
      "No build compatibility hacks needed — Web Workers support standard ES modules natively",
    ],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    name: "Mobile",
    badge: "Expo + llama.rn",
    description: "Native mobile inference using llama.rn, a React Native binding to llama.cpp via JSI (JavaScript Interface). GGUF models run with Metal GPU acceleration on iOS.",
    details: [
      { label: "Inference Engine", value: "llama.cpp (JSI)" },
      { label: "Model Format", value: "GGUF" },
      { label: "GPU Acceleration", value: "Metal (iOS) / OpenCL (Android)" },
      { label: "Execution Context", value: "Native Thread" },
      { label: "Framework", value: "Expo SDK 54" },
    ],
    techDetails: [
      "JSI bindings bypass the React Native Bridge for near-native performance — direct C++ to JavaScript calls",
      "iOS uses Metal with up to 99 GPU layers; Android supports CPU and optional OpenCL GPU offloading",
      "All llama.cpp symbols are prefixed with lm_ to prevent namespace conflicts with other native libraries",
      "Supports multimodal (vision/audio), embeddings, grammar sampling (GBNF/JSON schema), and tool calling",
    ],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    name: "Desktop",
    badge: "Tauri + Rust",
    description: "Lightweight desktop app with a Rust backend that calls llama.cpp directly via the llama-cpp-2 crate. Models are auto-downloaded from Hugging Face Hub with real-time progress tracking.",
    details: [
      { label: "Inference Engine", value: "llama-cpp-2 (Rust)" },
      { label: "Model Format", value: "GGUF" },
      { label: "GPU Acceleration", value: "CPU + optional GPU" },
      { label: "Execution Context", value: "Rust Thread" },
      { label: "Frontend", value: "Vite + React" },
    ],
    techDetails: [
      "Tauri uses the system WebView instead of bundling Chromium — dramatically smaller app size vs Electron",
      "Rust backend manages model lifecycle with Arc<Mutex<ModelStore>> for thread-safe concurrent access",
      "Hugging Face Hub integration auto-discovers GGUF files and prefers q4_k_m quantization",
      "Download progress events are emitted via Tauri IPC to the React frontend in real-time",
    ],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-6">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    ),
  },
];

const comparisonRows = [
  { label: "Inference Engine", chrome: "Transformers.js", browser: "Transformers.js", mobile: "llama.cpp (JSI)", desktop: "llama.cpp (Rust)" },
  { label: "Model Format", chrome: "ONNX", browser: "ONNX", mobile: "GGUF", desktop: "GGUF" },
  { label: "GPU Acceleration", chrome: "WebGPU", browser: "WebGPU", mobile: "Metal / OpenCL", desktop: "CPU + GPU" },
  { label: "Execution Context", chrome: "Service Worker", browser: "Web Worker", mobile: "Native Thread", desktop: "Rust Thread" },
  { label: "Installation", chrome: "Chrome Web Store", browser: "None (URL)", mobile: "App Store", desktop: "Download" },
];

const techStack = [
  {
    name: "Transformers.js",
    description: "HuggingFace's library for running ML models in the browser. Powers Chrome extension and Next.js web inference with ONNX models.",
    href: "https://huggingface.co/docs/transformers.js",
  },
  {
    name: "llama.cpp",
    description: "High-performance C++ inference engine for GGUF models. Used on mobile (via llama.rn JSI bindings) and desktop (via Rust llama-cpp-2 crate).",
    href: "https://github.com/ggerganov/llama.cpp",
  },
  {
    name: "WebGPU",
    description: "Next-generation GPU API for the web, enabling high-performance computation directly on your graphics hardware in browsers.",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API",
  },
  {
    name: "ONNX Runtime Web",
    description: "Microsoft's cross-platform inference engine, optimized for WebGPU and WASM execution in browser environments.",
    href: "https://onnxruntime.ai/",
  },
  {
    name: "Tauri",
    description: "Build lightweight desktop apps with a Rust backend and system WebView. No bundled Chromium — dramatically smaller than Electron.",
    href: "https://tauri.app/",
  },
  {
    name: "Expo + React Native",
    description: "Cross-platform mobile framework. Combined with llama.rn's JSI bindings for near-native LLM inference on iOS and Android.",
    href: "https://expo.dev/",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ocean-foam text-ocean-text">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pt-28 pb-12 text-center sm:px-6 sm:pt-32 sm:pb-16">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-ocean-text sm:text-4xl md:text-5xl">
            How It Works
          </h1>
          <p className="mx-auto max-w-2xl text-base text-ocean-text-muted sm:text-lg">
            TinyWhale runs LLMs entirely on your device — across Chrome extensions,
            browsers, mobile apps, and desktop. No servers, no cloud, no data collection.
          </p>
        </section>

        {/* Steps */}
        <section className="px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="mx-auto grid max-w-4xl gap-6 sm:gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-ocean-mid/20 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:bg-ocean-abyss/40"
              >
                <div className="mb-4 text-ocean-deep">{step.icon}</div>
                <div className="mb-1 text-sm font-medium text-ocean-text-muted">
                  Step {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-ocean-text">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ocean-text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform Details */}
        <section className="bg-ocean-shallow px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-4 text-center text-2xl font-bold text-ocean-text sm:text-3xl">
              4 Platforms, One Monorepo
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ocean-text-muted sm:text-base">
              Same goal — on-device LLM inference — but each platform uses different engines and model formats optimized for its runtime.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="rounded-xl border border-ocean-mid/20 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:bg-ocean-abyss/40"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="text-ocean-deep">{platform.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-ocean-text">{platform.name}</h3>
                      <span className="inline-block rounded-full bg-ocean-deep/10 px-2.5 py-0.5 text-xs font-medium text-ocean-deep dark:bg-ocean-deep/20">
                        {platform.badge}
                      </span>
                    </div>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-ocean-text-muted">
                    {platform.description}
                  </p>

                  {/* Spec table */}
                  <div className="mb-4 rounded-lg border border-ocean-mid/10 bg-ocean-foam/50 dark:bg-ocean-abyss/30">
                    {platform.details.map((detail, i) => (
                      <div
                        key={detail.label}
                        className={`flex items-center justify-between px-3 py-2 text-xs ${i !== platform.details.length - 1 ? "border-b border-ocean-mid/10" : ""}`}
                      >
                        <span className="text-ocean-text-muted">{detail.label}</span>
                        <span className="font-medium text-ocean-text">{detail.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Technical details */}
                  <ul className="space-y-2">
                    {platform.techDetails.map((detail, i) => (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed text-ocean-text-muted">
                        <span className="mt-1 block size-1 shrink-0 rounded-full bg-ocean-deep/60" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-ocean-text sm:text-3xl">
              Platform Comparison
            </h2>
            <div className="overflow-x-auto rounded-xl border border-ocean-mid/20 bg-white/60 shadow-sm backdrop-blur-sm dark:bg-ocean-abyss/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ocean-mid/20">
                    <th className="px-4 py-3 text-left font-medium text-ocean-text-muted" />
                    <th className="px-4 py-3 text-left font-semibold text-ocean-text">Chrome Extension</th>
                    <th className="px-4 py-3 text-left font-semibold text-ocean-text">Browser</th>
                    <th className="px-4 py-3 text-left font-semibold text-ocean-text">Mobile</th>
                    <th className="px-4 py-3 text-left font-semibold text-ocean-text">Desktop</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.label} className={i !== comparisonRows.length - 1 ? "border-b border-ocean-mid/10" : ""}>
                      <td className="px-4 py-3 font-medium text-ocean-text-muted">{row.label}</td>
                      <td className="px-4 py-3 text-ocean-text">{row.chrome}</td>
                      <td className="px-4 py-3 text-ocean-text">{row.browser}</td>
                      <td className="px-4 py-3 text-ocean-text">{row.mobile}</td>
                      <td className="px-4 py-3 text-ocean-text">{row.desktop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-ocean-shallow px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-ocean-text sm:text-3xl">
              Technology Stack
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {techStack.map((tech) => (
                <a
                  key={tech.name}
                  href={tech.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-ocean-mid/20 bg-white/60 p-6 shadow-sm backdrop-blur-sm transition-colors hover:border-ocean-deep/40 dark:bg-ocean-abyss/40"
                >
                  <h3 className="mb-2 font-semibold text-ocean-text">{tech.name}</h3>
                  <p className="text-sm text-ocean-text-muted">
                    {tech.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-12 text-center sm:px-6 sm:py-16">
          <h2 className="mb-4 text-2xl font-bold text-ocean-text sm:text-3xl">Ready to try it?</h2>
          <p className="mx-auto mb-6 max-w-lg text-ocean-text-muted">
            Start chatting with AI directly in your browser. No sign-up required,
            no data collected, completely free.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button size="lg" className="bg-ocean-deep text-white hover:bg-ocean-deep/90 dark:text-ocean-abyss" asChild>
              <Link href="/chat">Try the Demo</Link>
            </Button>
            <Button size="lg" className="border border-ocean-mid/30 bg-white/80 text-ocean-text hover:bg-white dark:border-white/20 dark:bg-black/40 dark:text-white" asChild>
              <a
                href="https://github.com/tantara/transformers.js-chrome"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
