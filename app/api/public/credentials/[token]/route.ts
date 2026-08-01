import { NextResponse } from "next/server";
import { getPublicCredentialByToken } from "@/lib/intern-queries";

export const dynamic = "force-dynamic";

// Narrow CORS: only the public Olyxee sites may call this read-only endpoint.
const ALLOWED_ORIGINS = new Set([
  "https://olyxee.com",
  "https://www.olyxee.com",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
  }
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const headers = corsHeaders(req.headers.get("origin"));

  const cred = await getPublicCredentialByToken(token);
  if (!cred) {
    return NextResponse.json(
      { verified: false, status: "NOT_FOUND" },
      { status: 404, headers }
    );
  }

  if (cred.status !== "PUBLISHED") {
    return NextResponse.json(
      {
        verified: false,
        status: cred.status,
        credentialNumber: cred.credentialNumber,
      },
      { headers }
    );
  }

  return NextResponse.json(
    {
      verified: true,
      status: "PUBLISHED",
      credentialNumber: cred.credentialNumber,
      fullName: cred.fullName,
      programmeTitle: cred.programmeTitle,
      position: cred.position,
      startDate: cred.startDate,
      completionDate: cred.completionDate,
      department: cred.department,
      projectsCompleted: cred.projectsCompleted,
      responsibilities: cred.responsibilities,
      skillsDemonstrated: cred.skillsDemonstrated,
      publicRecommendation: cred.publicRecommendation,
      supervisorName: cred.supervisorName,
      founderName: cred.founderName,
      founderTitle: cred.founderTitle,
      founderRecommendation: cred.founderRecommendation,
      managerName: cred.managerName,
      managerTitle: cred.managerTitle,
      managerRecommendation: cred.managerRecommendation,
      issueDate: cred.issueDate,
      documents: {
        certificatePdf: !!cred.hasCertificatePdf,
        letterPdf: !!cred.hasLetterPdf,
        certificatePreview: !!cred.hasCertificatePreview,
      },
      issuer: {
        name: "Olyxee",
        website: "https://olyxee.com",
      },
    },
    { headers }
  );
}
