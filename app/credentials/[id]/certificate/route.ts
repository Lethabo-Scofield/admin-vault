import { notFound } from "next/navigation";
import {
  getCredentialPdfs,
  getInternCredential,
} from "@/lib/intern-queries";
import {
  generateCertificatePdf,
  renderCertificateHtml,
} from "@/lib/documents/generate";
import { certificateFileName } from "@/lib/documents/fields";

export const dynamic = "force-dynamic";
// Document rendering uses headless Chromium — allow more than Vercel's 10s default.
export const maxDuration = 60;

/**
 * Super-admin certificate preview/download.
 *   ?format=html  — live HTML preview (draft-safe; uses today as issue date)
 *   default       — PDF inline; ?download=1 forces attachment
 * Published credentials serve the stored PDF so downloads are immutable.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const credentialId = Number(id);
  if (!credentialId) notFound();

  const credential = await getInternCredential(credentialId);
  if (!credential) notFound();

  const url = new URL(req.url);
  const preview = {
    ...credential,
    issueDate: credential.issueDate ?? new Date().toISOString().slice(0, 10),
  };

  if (url.searchParams.get("format") === "html") {
    return new Response(await renderCertificateHtml(preview), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  let pdf: Buffer;
  if (credential.status === "PUBLISHED" && credential.hasCertificatePdf) {
    const stored = await getCredentialPdfs(credentialId);
    pdf = stored?.certificatePdf ?? (await generateCertificatePdf(preview));
  } else {
    pdf = await generateCertificatePdf(preview);
  }

  const filename = certificateFileName(
    credential.internName ?? "",
    credential.position
  );
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
