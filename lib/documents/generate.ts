import type { InternCredential } from "@/lib/types";
import { documentDataFromCredential } from "@/lib/documents/data";
import { certificateHtml } from "@/lib/documents/certificate";
import { letterHtml } from "@/lib/documents/letter";
import { qrPngDataUrl } from "@/lib/documents/qr";
import { htmlToPdf } from "@/lib/documents/pdf";

export async function renderCertificateHtml(
  c: InternCredential
): Promise<string> {
  const d = documentDataFromCredential(c);
  const qr = await qrPngDataUrl(d.verifyUrl);
  return certificateHtml(d, qr);
}

export function renderLetterHtml(c: InternCredential): string {
  return letterHtml(documentDataFromCredential(c));
}

export async function generateCertificatePdf(
  c: InternCredential
): Promise<Buffer> {
  return htmlToPdf(await renderCertificateHtml(c), { landscape: true });
}

export async function generateLetterPdf(c: InternCredential): Promise<Buffer> {
  return htmlToPdf(renderLetterHtml(c), { landscape: false });
}
