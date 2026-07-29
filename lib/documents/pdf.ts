import { execFileSync } from "child_process";
import puppeteer, { type Browser } from "puppeteer-core";
import serverlessChromium from "@sparticuz/chromium";

const globalForPdf = globalThis as unknown as {
  __chromiumPath?: string;
  __browser?: Promise<Browser>;
};

/**
 * Find a Chromium binary, in order of preference:
 * 1. CHROMIUM_PATH env var (explicit override)
 * 2. A system chromium on PATH (Replit / local dev)
 * 3. @sparticuz/chromium's bundled binary (Vercel and other serverless hosts,
 *    which ship no system browser)
 */
async function launchOptions(): Promise<{
  executablePath: string;
  args: string[];
}> {
  const baseArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ];
  if (process.env.CHROMIUM_PATH) {
    return { executablePath: process.env.CHROMIUM_PATH, args: baseArgs };
  }
  if (!globalForPdf.__chromiumPath) {
    try {
      globalForPdf.__chromiumPath = execFileSync("which", ["chromium"], {
        encoding: "utf8",
      }).trim();
    } catch {
      // No system chromium — fall through to the serverless binary below.
    }
  }
  if (globalForPdf.__chromiumPath) {
    return { executablePath: globalForPdf.__chromiumPath, args: baseArgs };
  }
  try {
    return {
      executablePath: await serverlessChromium.executablePath(),
      args: [...serverlessChromium.args, ...baseArgs],
    };
  } catch (bundledErr) {
    // Bundled binaries missing from the deployment (bundler/symlink issue) —
    // download the official browser pack at runtime instead.
    const packUrl =
      process.env.CHROMIUM_PACK_URL ??
      "https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar";
    try {
      return {
        executablePath: await serverlessChromium.executablePath(packUrl),
        args: [...serverlessChromium.args, ...baseArgs],
      };
    } catch (downloadErr) {
      throw new Error(
        `No system Chromium found and the serverless Chromium fallback failed. ` +
          `Bundled: ${bundledErr instanceof Error ? bundledErr.message : bundledErr}. ` +
          `Downloaded pack: ${downloadErr instanceof Error ? downloadErr.message : downloadErr}`
      );
    }
  }
}

// On serverless hosts (Vercel/Lambda) the process is frozen between requests,
// which silently kills a cached browser and causes "Target closed" protocol
// errors. Launch a fresh browser per render there; reuse a cached one locally.
const isServerless =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

async function launchBrowser(): Promise<Browser> {
  const { executablePath, args } = await launchOptions();
  if (isServerless) {
    // Recommended settings for @sparticuz/chromium's headless shell.
    serverlessChromium.setGraphicsMode = false;
    return puppeteer.launch({
      executablePath,
      args,
      headless: "shell",
      defaultViewport: { width: 1280, height: 800 },
    });
  }
  return puppeteer.launch({ executablePath, headless: true, args });
}

async function getBrowser(): Promise<Browser> {
  if (isServerless) return launchBrowser();
  if (!globalForPdf.__browser) {
    globalForPdf.__browser = launchBrowser();
    globalForPdf.__browser.catch(() => {
      globalForPdf.__browser = undefined;
    });
  }
  const browser = await globalForPdf.__browser;
  if (!browser.connected) {
    globalForPdf.__browser = undefined;
    return getBrowser();
  }
  return browser;
}

/** Close the browser after a render on serverless hosts (fresh per request). */
async function releaseBrowser(browser: Browser): Promise<void> {
  if (isServerless) await browser.close().catch(() => undefined);
}

/**
 * Render an HTML document to a PNG screenshot buffer (A4 page at 2x scale).
 * Used for the public certificate preview image.
 */
export async function htmlToPng(
  html: string,
  opts: { landscape: boolean }
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // A4 at 96dpi: 1123 x 794 px.
    const [w, h] = opts.landscape ? [1123, 794] : [794, 1123];
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: w, height: h },
    });
    return Buffer.from(png);
  } finally {
    await page.close().catch(() => undefined);
    await releaseBrowser(browser);
  }
}

/** Render an HTML document to a PDF buffer. */
export async function htmlToPdf(
  html: string,
  opts: { landscape: boolean }
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      landscape: opts.landscape,
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
    await releaseBrowser(browser);
  }
}
