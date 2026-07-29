import QRCode from "qrcode";

/**
 * QR codes for generated documents are always created dynamically from the
 * final verification URL — never copied from any reference image. High error
 * correction and a generous quiet zone for reliable print scanning.
 */
export async function qrPngDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" },
  });
}

/** Raw PNG buffer of the same QR (used by decode tests). */
export async function qrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: 512,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" },
  });
}
