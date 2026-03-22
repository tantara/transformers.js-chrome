import Link from "next/link";

const platforms = [
  {
    name: "Browser Extension",
    description:
      "AI sidebar for Chrome, Firefox & Safari. Powered by Transformers.js and WebGPU — runs directly in the service worker.",
    tech: "Plasmo · Transformers.js · ONNX · WebGPU",
    imageSrc: "/example-summarize.jpg",
    href: "https://chromewebstore.google.com/detail/private-ai-assistant-runn/jojlpeliekadmokfnikappfadbjiaghp",
    linkLabel: "Chrome Web Store",
    external: true,
  },
  {
    name: "Web App",
    description:
      "Chat with LLMs right in your browser tab. Web Worker keeps the UI smooth while the model runs on WebGPU.",
    tech: "Next.js · Transformers.js · ONNX · WebGPU",
    imageSrc: "/tinywhale-web.png",
    href: "/chat",
    linkLabel: "Try Demo",
    external: false,
  },
  {
    name: "Mobile",
    description:
      "On-device LLM on iOS and Android. Native GPU acceleration via Metal and OpenCL through llama.cpp bindings.",
    tech: "Expo · llama.rn · GGUF · Metal",
    imageSrc: "/tinywhale-expo.png",
    href: "https://github.com/tantara/transformers.js-chrome",
    linkLabel: "View on GitHub",
    external: true,
  },
  {
    name: "Desktop",
    description:
      "Lightweight native app with Rust backend. Loads GGUF models from Hugging Face and runs inference via llama.cpp.",
    tech: "Tauri · Rust · llama.cpp · GGUF",
    imageSrc: "/tinywhale-tauri.png",
    href: "https://github.com/tantara/transformers.js-chrome",
    linkLabel: "View on GitHub",
    external: true,
  },
];

export function PlatformSection() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center sm:mb-14">
          <span className="mb-4 inline-block rounded-full bg-ocean-deep/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean-deep">
            One Monorepo, Four Platforms
          </span>
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Runs everywhere your users are.
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            The same on-device AI experience — adapted to each platform&apos;s strengths.
            WebGPU for browsers, Metal for iOS, Rust for desktops.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="group overflow-hidden rounded-xl border border-ocean-mid/20 bg-white/60 shadow-sm transition-shadow hover:shadow-md dark:bg-ocean-abyss/40"
            >
              <div className="aspect-video overflow-hidden bg-ocean-foam">
                <img
                  src={p.imageSrc}
                  alt={`${p.name} screenshot`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="mb-1 text-lg font-semibold">{p.name}</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  {p.description}
                </p>
                <p className="mb-4 text-xs font-medium text-ocean-deep">
                  {p.tech}
                </p>
                {p.external ? (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-ocean-deep underline underline-offset-4 hover:text-ocean-deep/80"
                  >
                    {p.linkLabel} &rarr;
                  </a>
                ) : (
                  <Link
                    href={p.href}
                    className="text-sm font-medium text-ocean-deep underline underline-offset-4 hover:text-ocean-deep/80"
                  >
                    {p.linkLabel} &rarr;
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
