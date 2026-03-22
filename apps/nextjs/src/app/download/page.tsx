import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@acme/ui/button";

import { Footer } from "../_components/footer";
import { Navbar } from "../_components/navbar";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download TinyWhale for your platform — web, browser extension, mobile, or desktop.",
};

const GITHUB_URL = "https://github.com/tantara/transformers.js-chrome";
const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/private-ai-assistant-runn/jojlpeliekadmokfnikappfadbjiaghp";

const platforms = [
  {
    name: "Web",
    description: "Run AI models directly in your browser. No install needed.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    items: [
      { label: "Open Web App", href: "/chat", status: "available" as const },
    ],
  },
  {
    name: "Browser Extension",
    description: "AI assistant in your browser sidebar. Works offline once loaded.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
      </svg>
    ),
    items: [
      { label: "Chrome", href: CHROME_WEB_STORE_URL, status: "available" as const },
      { label: "Firefox", href: null, status: "wip" as const },
      { label: "Safari", href: null, status: "wip" as const },
    ],
  },
  {
    name: "Mobile",
    description: "On-device AI on your phone. Powered by React Native.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    items: [
      { label: "iOS", href: GITHUB_URL, status: "available" as const },
      { label: "Android", href: GITHUB_URL, status: "available" as const },
    ],
  },
  {
    name: "Desktop",
    description: "Native desktop app with local GGUF model support.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-8">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    ),
    items: [
      { label: "macOS", href: GITHUB_URL, status: "available" as const },
      { label: "Windows", href: null, status: "wip" as const },
    ],
  },
];

function StatusBadge({ status }: { status: "available" | "wip" }) {
  if (status === "wip") {
    return (
      <span className="rounded-full bg-ocean-light/50 px-2 py-0.5 text-xs font-medium text-ocean-text-muted dark:bg-ocean-light/20">
        Coming Soon
      </span>
    );
  }
  return null;
}

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ocean-foam text-ocean-text">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pt-28 pb-12 text-center sm:px-6 sm:pt-32 sm:pb-16">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-ocean-text sm:text-4xl md:text-5xl">
            Download TinyWhale
          </h1>
          <p className="mx-auto max-w-2xl text-base text-ocean-text-muted sm:text-lg">
            Private AI that runs on your device. Choose your platform.
          </p>
        </section>

        {/* Platform Cards */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto grid max-w-4xl gap-6 sm:gap-8 md:grid-cols-2">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="rounded-xl border border-ocean-mid/20 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:bg-ocean-abyss/40"
              >
                <div className="mb-4 text-ocean-deep">{platform.icon}</div>
                <h2 className="mb-1 text-xl font-semibold text-ocean-text">
                  {platform.name}
                </h2>
                <p className="mb-5 text-sm text-ocean-text-muted">
                  {platform.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {platform.items.map((item) =>
                    item.status === "available" && item.href ? (
                      <Button
                        key={item.label}
                        size="sm"
                        className="bg-ocean-deep text-white hover:bg-ocean-deep/90 dark:text-ocean-abyss"
                        asChild
                      >
                        {item.href.startsWith("/") ? (
                          <Link href={item.href}>{item.label}</Link>
                        ) : (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.label}
                          </a>
                        )}
                      </Button>
                    ) : (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 rounded-md border border-ocean-mid/20 px-3 py-1.5 text-sm text-ocean-text-muted"
                      >
                        {item.label}
                        <StatusBadge status={item.status} />
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-12 text-center sm:px-6 sm:pb-16">
          <p className="text-sm text-ocean-text-muted">
            TinyWhale is open source.{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ocean-deep underline underline-offset-4 hover:text-ocean-deep/80"
            >
              View on GitHub
            </a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
