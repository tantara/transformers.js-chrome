import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@acme/api",
    "@acme/auth",
    "@acme/db",
    "@acme/ui",
    "@acme/validators",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  /** Exclude node-only packages from server-side bundling */
  serverExternalPackages: ["sharp", "onnxruntime-node"],

  /**
   * Stub out node-only modules so the browser bundle doesn't pull them in.
   * See: https://huggingface.co/docs/transformers.js/tutorials/next
   */
  // Webpack (production builds)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  // Turbopack (dev server) — the pre-built web dist (transformers.web.js)
  // doesn't import sharp or onnxruntime-node, so no aliases needed.
  turbopack: {},
};

export default config;
