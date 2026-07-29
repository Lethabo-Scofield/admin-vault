---
name: Vercel is production
description: This project deploys to Vercel (admin.olyxee.com) via GitHub, not Replit deployments.
---

Production for this app is **Vercel** at admin.olyxee.com, deploying automatically from the GitHub `origin` remote (main branch). The database in production is the user's own (Supabase).

**Why:** User was upset when Replit publishing was suggested — "we using Vercel broo, things are set there."

**How to apply:**
- Never suggest Replit deploy for this project; to ship, commit and `gitPush` to main.
- Vercel serverless has no system Chromium — PDF/PNG generation uses the @sparticuz/chromium fallback in the pdf helper (`CHROMIUM_PATH` → `which chromium` → @sparticuz). Keep `serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"]` in next.config.
- Watch Vercel function limits: publish renders 3 documents; document routes/pages set `export const maxDuration = 60`.
- Runtime-read files (assets/ branding images + font, AND node_modules/@sparticuz/chromium/bin) must stay in `outputFileTracingIncludes` in next.config or Vercel omits them from the function bundle (errors in prod only). Import @sparticuz statically, not via dynamic import().
