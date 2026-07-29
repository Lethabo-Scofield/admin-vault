import { getPublicCredentialPdfsByToken } from "@/lib/intern-queries";
import { certificateFileName } from "@/lib/documents/fields";

export const dynamic = "force-dynamic";

/** Public certificate download for a PUBLISHED credential only. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const row = await getPublicCredentialPdfsByToken(token);
  if (!row?.certificatePdf) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const download = new URL(req.url).searchParams.get("download");
  return new Response(new Uint8Array(row.certificatePdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${certificateFileName(row.fullName, row.position)}"`,
      "Cache-Control": "no-store",
    },
  });
}
