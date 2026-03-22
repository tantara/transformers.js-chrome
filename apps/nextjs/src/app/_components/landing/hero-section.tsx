import Link from "next/link";

import { Button } from "@acme/ui/button";

import { TinyWhaleLogo } from "../logo";
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ocean-foam via-ocean-shallow to-ocean-light px-4 pt-24 pb-24 sm:px-6 sm:pt-32 sm:pb-32 md:pt-44 md:pb-40">
      {/* Subtle bubble decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-[15%] h-3 w-3 rounded-full bg-ocean-mid/20 animate-bounce [animation-duration:3s]" />
        <div className="absolute top-1/3 right-[20%] h-2 w-2 rounded-full bg-ocean-mid/15 animate-bounce [animation-delay:1s] [animation-duration:4s]" />
        <div className="absolute top-1/2 left-[70%] h-4 w-4 rounded-full bg-ocean-mid/10 animate-bounce [animation-delay:2s] [animation-duration:5s]" />
        <div className="absolute bottom-1/3 left-[30%] h-2.5 w-2.5 rounded-full bg-ocean-deep/10 animate-bounce [animation-delay:0.5s] [animation-duration:3.5s]" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-6 flex justify-center sm:mb-8">
          <TinyWhaleLogo width={80} height={80} className="drop-shadow-lg" />
        </div>

        <h1 className="mx-auto mb-6 max-w-4xl text-center text-3xl font-bold leading-[1.1] tracking-tight text-ocean-text sm:mb-8 sm:text-4xl md:text-5xl lg:text-6xl">
          On-device AI for{" "}
          <span className="text-ocean-deep">every platform.</span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-center text-base text-ocean-text-muted sm:mb-10 sm:text-lg md:text-xl">
          Run open-source LLMs on your browser, phone, and desktop — no cloud required.
          Your data never leaves your device. Free, private, and fast.
        </p>

        <div className="mx-auto mt-8 aspect-video max-w-4xl overflow-hidden rounded-lg border border-ocean-mid/30 bg-white/50 shadow-lg backdrop-blur-sm sm:mt-12 dark:bg-black/30">
          <iframe
            className="h-full w-full"
            src="https://www.youtube.com/embed/MSCDdFG5Lls"
            title="transformers.js in-browser demo"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-3 px-2 text-center sm:mt-8 sm:flex-row sm:items-center sm:justify-center sm:px-0">
          <Button
            size="lg"
            className="bg-ocean-deep text-white hover:bg-ocean-deep/90 dark:text-ocean-abyss"
            asChild
          >
            <Link href="/download">Get TinyWhale</Link>
          </Button>
          <Button
            size="lg"
            className="border border-ocean-mid/30 bg-white/80 text-ocean-text hover:bg-white dark:border-white/20 dark:bg-black/40 dark:text-white"
            asChild
          >
            <Link href="/chat">Try Web Demo</Link>
          </Button>
          <Button
            size="lg"
            className="border border-ocean-text/20 bg-transparent text-ocean-text hover:bg-ocean-text/10 dark:text-white"
            asChild
          >
            <a
              href="https://github.com/tantara/transformers.js-chrome"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source on GitHub
            </a>
          </Button>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute right-0 bottom-0 left-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path
            d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}
