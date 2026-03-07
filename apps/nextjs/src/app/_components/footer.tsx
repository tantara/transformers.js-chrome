import Link from "next/link";

import { TinyWhaleLogo } from "./logo";

const footerLinks = {
  Product: [
    { label: "Web Demo", href: "/" },
    { label: "Chrome Extension", href: "https://chromewebstore.google.com/detail/private-ai-assistant-runn/jojlpeliekadmokfnikappfadbjiaghp?authuser=0&hl=en" },
  ],
  Resources: [
    { label: "How It Works", href: "/how-it-works" },
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/tantara/transformers.js-chrome" },
    { label: "Report a Bug", href: "https://github.com/tantara/transformers.js-chrome/issues" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-ocean-abyss border-t border-white/10">
      <div className="container px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white">
              <TinyWhaleLogo width={28} height={28} />
              <span>TinyWhale</span>
            </Link>
            <p className="mt-3 text-sm text-white/60">
              AI inference in your browser. No server, no data leaves your machine.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/80">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/50 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-white/50 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between border-t border-white/10 pt-6 text-sm text-white/40 sm:flex-row">
          <p>Built in the browser, for the browser.</p>
          <p>&copy; {new Date().getFullYear()} TinyWhale. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
