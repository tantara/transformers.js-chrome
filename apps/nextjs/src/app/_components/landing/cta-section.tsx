import Link from "next/link";

import { Button } from "@acme/ui/button";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-ocean-abyss px-4 py-14 sm:px-6 sm:py-20 md:py-28">
      {/* Subtle wave pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10C25 0 50 20 75 10C87.5 5 100 15 100 10" stroke="white" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          Ready to dive in?
        </h2>
        <p className="mb-8 text-base text-white/60 sm:mb-10 sm:text-lg">
          No sign-up required. No data collected. Load the model and start
          chatting — it&apos;s that simple.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="bg-ocean-light text-ocean-abyss hover:bg-ocean-light/90 dark:bg-ocean-deep dark:text-ocean-abyss dark:hover:bg-ocean-deep/90" asChild>
            <Link href="/chat">Try the Demo</Link>
          </Button>
          <Button size="lg" className="border border-white/20 bg-transparent text-white hover:bg-white/10" asChild>
            <a
              href="https://github.com/tantara/transformers.js-chrome"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
