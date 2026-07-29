import type { NextConfig } from "next";

const replitDomains = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Keep the headless-browser packages out of the bundler so the
  // serverless Chromium binary works on Vercel.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  allowedDevOrigins: [
    "*.replit.dev",
    "*.kirk.replit.dev",
    "*.worf.replit.dev",
    "*.repl.co",
    ...replitDomains,
  ],
};

export default nextConfig;
