import { NextResponse } from "next/server";
import { getInternDocumentContent } from "@/lib/intern-queries";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Authenticated download of an uploaded intern document (NDA, letter, ...). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id, docId } = await params;
  const internId = Number(id);
  const documentId = Number(docId);
  if (!internId || !documentId) return new NextResponse("Not found", { status: 404 });

  const doc = await getInternDocumentContent(internId, documentId);
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const safeName = doc.fileName.replace(/["\r\n]/g, "_");
  return new NextResponse(new Uint8Array(doc.content), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.content.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
