import { esc } from "@/lib/documents/fields";

export const COMPANY_NAME = "Olyxee (Pty) Ltd";
export const COMPANY_ADDRESS_LINES = [
  "Olyxee (Pty) Ltd",
  "Olyxee Campus,",
  "Johannesburg, South Africa - 2001",
];
export const COMPANY_CONTACT_LINES = [
  "Tel: +27-71-223-3272",
  "info@olyxee.com",
  "http://www.olyxee.com",
];
export const COMPANY_REGISTRATION =
  "Registered Office: 20 Kruger Street City, Johannesburg, Gauteng, 2001, South Africa · Company Registration No.: 2026/326516/07";

// Official brand assets uploaded by the company (assets/branding/*.png),
// embedded as data URLs so PDFs render without any network access.
import { readFileSync } from "fs";
import { join } from "path";

const dataUrlCache = new Map<string, string>();

function assetDataUrl(fileName: string, mime = "image/png"): string {
  const cached = dataUrlCache.get(fileName);
  if (cached) return cached;
  const buf = readFileSync(join(process.cwd(), "assets", "branding", fileName));
  const url = `data:${mime};base64,${buf.toString("base64")}`;
  dataUrlCache.set(fileName, url);
  return url;
}

/** Default signatories, matching the master reference design. */
export const DEFAULT_FOUNDER_NAME = "Dzowa";
export const DEFAULT_FOUNDER_TITLE = "Founder & CEO";
export const DEFAULT_MANAGER_NAME = "Laura";
export const DEFAULT_MANAGER_TITLE = "Department Approval";

/** Embedded handwriting font so signatures render identically in every PDF. */
export function signatureFontCss(): string {
  return `@font-face {
    font-family: "Signature Script";
    src: url("${assetDataUrl("GreatVibes-Regular.ttf", "font/ttf")}") format("truetype");
    font-weight: normal; font-style: normal;
  }`;
}

/** Official Olyxee logo (transparent PNG). */
export function logoSvg(size = 34): string {
  return `<img src="${assetDataUrl("logo.png")}" width="${size}" height="${size}" style="display:block;" alt="Olyxee logo"/>`;
}

/** Faint full-page watermark using the official logo. */
export function watermarkSvg(size = 420): string {
  return `<img src="${assetDataUrl("logo.png")}" width="${size}" height="${size}" style="display:block;opacity:0.06;" alt=""/>`;
}

/** Official corporate seal image. */
export function sealSvg(size = 92): string {
  return `<img src="${assetDataUrl("seal.png")}" width="${size}" height="${size}" style="display:block;border-radius:50%;" alt="Olyxee corporate seal"/>`;
}

/** Deterministic script-style signature rendered as styled text. */
export function signatureHtml(name: string): string {
  const display = esc(name || "");
  if (!display) return "";
  return `<div style="font-family:'Signature Script','Brush Script MT',cursive;font-size:30px;color:#1c232c;line-height:1;padding:2px 0 4px;">${display}</div>`;
}
