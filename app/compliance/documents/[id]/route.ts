import { NextRequest, NextResponse } from "next/server";
import { getDocumentContent } from "@/lib/queries";

export const dynamic = "force-dynamic";

function safeFileName(value: string): string {
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 255) || "document";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const document = await getDocumentContent(Number(id));
  if (!document) return new NextResponse("Document not found", { status: 404 });

  const disposition = request.nextUrl.searchParams.get("download") === "1"
    ? "attachment"
    : "inline";

  return new NextResponse(Buffer.from(document.content), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${safeFileName(document.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}