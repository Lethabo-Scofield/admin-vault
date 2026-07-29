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
