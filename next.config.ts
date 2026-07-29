import type { NextConfig } from "next";

const replitDomains = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Keep the headless-browser packages out of the bundler so the
  // serverless Chromium binary works on Vercel.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // Branding assets (logo, seal, signatures, font) are read from disk at
  // runtime; make sure Vercel bundles them into every serverless function.
  outputFileTracingIncludes: {
    "/**/*": [
      "./assets/**/*",
      // The serverless Chromium binary is read from disk at runtime; the
      // bundler can't see it, so include it explicitly.
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
  allowedDevOrigins: [
    "*.replit.dev",
    "*.kirk.replit.dev",
    "*.worf.replit.dev",
    "*.repl.co",
    ...replitDomains,
  ],
};

export default nextConfig;
