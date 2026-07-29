import { getPublicCredentialPdfsByToken } from "@/lib/intern-queries";
import { letterFileName } from "@/lib/documents/fields";

export const dynamic = "force-dynamic";

/** Public recommendation-letter download for a PUBLISHED credential only. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const row = await getPublicCredentialPdfsByToken(token);
  if (!row?.letterPdf) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const download = new URL(req.url).searchParams.get("download");
  return new Response(new Uint8Array(row.letterPdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${letterFileName(row.fullName)}"`,
      "Cache-Control": "no-store",
    },
  });
}
