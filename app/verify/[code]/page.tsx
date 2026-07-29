import type { Metadata } from "next";
import { headers } from "next/headers";
import { BadgeCheck, Ban, FileText, ScrollText, SearchX } from "lucide-react";
import { getPublicCredentialByToken } from "@/lib/intern-queries";
import CopyLinkButton from "@/components/CopyLinkButton";
import { PUBLIC_VERIFY_BASE } from "@/lib/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credential Verification — Olyxee (Pty) Ltd",
  robots: { index: false },
};

/**
 * Extract the secure token from the public code. The code is
 * OLX-CERT-YYYY-NNNN-<token>, and base64url tokens may themselves contain
 * hyphens — so strip the fixed prefix rather than splitting on "-".
 */
function tokenFromCode(code: string): string {
  const s = String(code ?? "");
  const m = s.match(/^OLX-CERT-\d{4}-\d{4}-(.+)$/);
  if (m) return m[1];
  const parts = s.split("-");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function fmt(d: string | null | undefined): string {
  return d ? String(d).slice(0, 10) : "—";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-[15px] text-gray-800">
        {value}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-ios bg-white p-8 shadow-ios">{children}</div>
        <p className="mt-6 text-center text-[12px] text-gray-400">
          Official credential record · Olyxee (Pty) Ltd · Johannesburg, South
          Africa
        </p>
      </div>
    </main>
  );
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  // Ensure this page is never cached: it must always reflect live status.
  await headers();
  const { code } = await params;
  const token = tokenFromCode(decodeURIComponent(code));

  let cred: Awaited<ReturnType<typeof getPublicCredentialByToken>>;
  try {
    cred = await getPublicCredentialByToken(token);
  } catch {
    return (
      <Shell>
        <p className="text-[15px] text-gray-700">
          Verification is temporarily unavailable. Please try again shortly.
        </p>
      </Shell>
    );
  }

  if (!cred) {
    return (
      <Shell>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <SearchX size={24} />
          </div>
          <p className="text-[16px] font-semibold text-gray-900">
            Credential not found
          </p>
        </div>
        <p className="text-[14px] text-gray-600">
          No credential matches this verification code. Check the URL or
          contact Olyxee.
        </p>
      </Shell>
    );
  }

  if (cred.status !== "PUBLISHED") {
    return (
      <Shell>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Ban size={24} />
          </div>
          <p className="text-[16px] font-semibold text-gray-900">
            Credential revoked
          </p>
        </div>
        <p className="text-[14px] text-gray-600">
          This credential has been revoked and is no longer valid.
        </p>
        <p className="mt-3 font-mono text-[13px] text-gray-500">
          {cred.credentialNumber}
        </p>
      </Shell>
    );
  }

  const verifyUrl = `${PUBLIC_VERIFY_BASE}/${cred.credentialNumber}-${token}`;
  const docBase = `/api/public/credentials/${encodeURIComponent(token)}`;
  const btn =
    "tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200";

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <BadgeCheck size={24} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-emerald-700">
            Credential verified
          </p>
          <p className="font-mono text-[14px] text-gray-800">
            {cred.credentialNumber}-{token}
          </p>
        </div>
      </div>

      <Row label="Full Name" value={cred.fullName} />
      <Row label="Internship Title" value={cred.programmeTitle} />
      <Row label="Position" value={cred.position} />
      <Row label="Department" value={cred.department} />
      <Row
        label="Internship Dates"
        value={`${fmt(cred.startDate)} — ${fmt(cred.completionDate)}`}
      />
      <Row label="Issue Date" value={fmt(cred.issueDate)} />
      <Row
        label="Projects & Responsibilities"
        value={[cred.projectsCompleted, cred.responsibilities]
          .map((s) => String(s ?? "").trim())
          .filter(Boolean)
          .join("\n")}
      />
      <Row label="Skills Demonstrated" value={cred.skillsDemonstrated} />
      <Row label="Founder Recommendation" value={cred.founderRecommendation} />
      <Row label="Manager Recommendation" value={cred.managerRecommendation} />
      <Row label="Issuer" value="Olyxee (Pty) Ltd" />

      <div className="mt-6 flex flex-wrap gap-2">
        {cred.hasCertificatePdf && (
          <>
            <a href={docBase + "/certificate"} target="_blank" className={btn}>
              <FileText size={15} /> View certificate
            </a>
            <a href={docBase + "/certificate?download=1"} className={btn}>
              Download certificate
            </a>
          </>
        )}
        {cred.hasLetterPdf && (
          <>
            <a href={docBase + "/letter"} target="_blank" className={btn}>
              <ScrollText size={15} /> View recommendation letter
            </a>
            <a href={docBase + "/letter?download=1"} className={btn}>
              Download recommendation letter
            </a>
          </>
        )}
        <CopyLinkButton url={verifyUrl} className={btn} />
      </div>
    </Shell>
  );
}
