import { getPublicCertificatePreviewByToken } from "@/lib/intern-queries";

export const dynamic = "force-dynamic";

/** Public certificate preview image for a PUBLISHED credential only. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const png = await getPublicCertificatePreviewByToken(token);
  if (!png) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
