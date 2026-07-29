import { notFound } from "next/navigation";
import {
  getCredentialPdfs,
  getInternCredential,
} from "@/lib/intern-queries";
import {
  generateLetterPdf,
  renderLetterHtml,
} from "@/lib/documents/generate";
import { letterFileName } from "@/lib/documents/fields";

export const dynamic = "force-dynamic";
// Document rendering uses headless Chromium — allow more than Vercel's 10s default.
export const maxDuration = 60;

/** Super-admin recommendation-letter preview/download (see certificate route). */
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
    return new Response(renderLetterHtml(preview), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  let pdf: Buffer;
  if (credential.status === "PUBLISHED" && credential.hasLetterPdf) {
    const stored = await getCredentialPdfs(credentialId);
    pdf = stored?.letterPdf ?? (await generateLetterPdf(preview));
  } else {
    pdf = await generateLetterPdf(preview);
  }

  const filename = letterFileName(credential.internName ?? "");
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
