import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";

import { Analytics } from "@vercel/analytics/next";

import { cn } from "@acme/ui";
import { ThemeProvider } from "@acme/ui/theme";
import { Toaster } from "@acme/ui/toast";

import { env } from "~/env";

import "~/app/styles.css";

const siteUrl =
  env.VERCEL_ENV === "production"
    ? "https://tinywhale.vercel.app"
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TinyWhale - In-Browser AI Chat",
    template: "%s | TinyWhale",
  },
  description:
    "Chat with open source large language models running entirely in your browser via WebGPU. No server, no data leaves your device. Powered by Transformers.js and ONNX Runtime Web.",
  keywords: [
    "in-browser AI",
    "WebGPU",
    "browser AI",
    "transformers.js",
    "open source LLM",
    "local LLM",
    "private AI",
    "ONNX",
    "web inference",
  ],
  authors: [{ name: "TinyWhale" }],
  creator: "TinyWhale",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    title: "TinyWhale - In-Browser AI Chat",
    description:
      "Chat with open source LLMs running entirely in your browser via WebGPU. No server, no data leaves your device.",
    url: siteUrl,
    siteName: "TinyWhale",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TinyWhale - In-Browser AI Chat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TinyWhale - In-Browser AI Chat",
    description:
      "Chat with open source LLMs running entirely in your browser via WebGPU. No server, no data leaves your device.",
    images: ["/og-image.png"],
    creator: "@tantara",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          fontSans.variable,
          fontSerif.variable,
          fontMono.variable,
        )}
      >
        <ThemeProvider>
          {props.children}
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
