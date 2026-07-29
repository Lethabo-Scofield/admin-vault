import { execFileSync } from "child_process";
import puppeteer, { type Browser } from "puppeteer-core";

const globalForPdf = globalThis as unknown as {
  __chromiumPath?: string;
  __browser?: Promise<Browser>;
};

function chromiumPath(): string {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (!globalForPdf.__chromiumPath) {
    try {
      globalForPdf.__chromiumPath = execFileSync("which", ["chromium"], {
        encoding: "utf8",
      }).trim();
    } catch {
      throw new Error(
        "Chromium not found. Install it or set CHROMIUM_PATH to a Chrome/Chromium binary."
      );
    }
  }
  return globalForPdf.__chromiumPath;
}

async function getBrowser(): Promise<Browser> {
  if (!globalForPdf.__browser) {
    globalForPdf.__browser = puppeteer.launch({
      executablePath: chromiumPath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
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
  }
}
