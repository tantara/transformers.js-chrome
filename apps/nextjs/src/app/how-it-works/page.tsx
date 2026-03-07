import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@acme/ui/button";

import { Footer } from "../_components/footer";
import { Navbar } from "../_components/navbar";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how TinyWhale runs AI models entirely in your browser using WebGPU, Transformers.js, and ONNX Runtime Web.",
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

const techStack = [
  {
    name: "Transformers.js",
    description: "HuggingFace's library for running ML models in the browser. Provides the same API as Python transformers.",
    href: "https://huggingface.co/docs/transformers.js",
  },
  {
    name: "ONNX Runtime Web",
    description: "Microsoft's cross-platform inference engine, optimized for WebGPU and WASM execution in browsers.",
    href: "https://onnxruntime.ai/",
  },
  {
    name: "WebGPU",
    description: "Next-generation GPU API for the web, enabling high-performance computation directly on your graphics hardware.",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API",
  },
  {
    name: "Open Source LLMs",
    description: "Compact, capable language models with vision support, quantized to 4-bit for efficient browser inference.",
    href: "https://huggingface.co/onnx-community",
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
            TinyWhale runs a full language model directly in your browser using
            WebGPU acceleration. No servers, no cloud, no data collection.
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

        {/* Tech Stack */}
        <section className="bg-ocean-shallow px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-ocean-text sm:text-3xl">
              Technology Stack
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
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
