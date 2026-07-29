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
    "/**/*": ["./assets/**/*"],
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
