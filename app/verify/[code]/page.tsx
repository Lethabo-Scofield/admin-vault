import type { Metadata } from "next";
import { headers } from "next/headers";
import { BadgeCheck, Ban, Download, SearchX, Sparkles } from "lucide-react";
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

/** Split free-text skills into clean chips (commas, newlines, bullets). */
function skillChips(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(/[,\n;•·]+/)
    .map((s) => s.trim().replace(/^[-–—*]\s*/, ""))
    .filter(Boolean)
    .slice(0, 24);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {children}
        <p className="mt-8 text-center text-[12px] text-gray-400">
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
        <div className="rounded-ios bg-white p-8 shadow-ios">
          <p className="text-[15px] text-gray-700">
            Verification is temporarily unavailable. Please try again shortly.
          </p>
        </div>
      </Shell>
    );
  }

  if (!cred) {
    return (
      <Shell>
        <div className="rounded-ios bg-white p-8 shadow-ios">
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
        </div>
      </Shell>
    );
  }

  if (cred.status !== "PUBLISHED") {
    return (
      <Shell>
        <div className="rounded-ios bg-white p-8 shadow-ios">
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
        </div>
      </Shell>
    );
  }

  const verifyUrl = `${PUBLIC_VERIFY_BASE}/${cred.credentialNumber}-${token}`;
  const docBase = `/api/public/credentials/${encodeURIComponent(token)}`;
  const skills = skillChips(cred.skillsDemonstrated);
  const primaryBtn =
    "tap inline-flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-gray-800 sm:w-auto";

  return (
    <Shell>
      {/* Verification hero */}
      <div className="rounded-ios bg-white p-6 shadow-ios sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BadgeCheck size={30} />
          </div>
          <p className="mt-3 text-[17px] font-bold text-emerald-700">
            Credential verified
          </p>
          <h1 className="mt-1 text-[24px] font-bold text-gray-900">
            {cred.fullName}
          </h1>
          <p className="mt-1 font-mono text-[12.5px] text-gray-400">
            {cred.credentialNumber}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-700">
            Active · Published
          </span>
        </div>

        {/* Certificate preview */}
        {cred.hasCertificatePreview && (
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={docBase + "/certificate-preview"}
              alt={`Internship certificate issued to ${cred.fullName} by Olyxee (Pty) Ltd`}
              className="h-auto w-full"
            />
          </div>
        )}

        {/* Document actions */}
        {(cred.hasCertificatePdf || cred.hasLetterPdf) && (
          <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            {cred.hasCertificatePdf && (
              <a href={docBase + "/certificate?download=1"} className={primaryBtn}>
                <Download size={15} /> Download Certificate (PDF)
              </a>
            )}
            {cred.hasLetterPdf && (
              <a href={docBase + "/letter?download=1"} className={primaryBtn}>
                <Download size={15} /> Download Recommendation Letter (PDF)
              </a>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <CopyLinkButton
            url={verifyUrl}
            className="tap inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          />
        </div>
      </div>

      {/* Skills demonstrated */}
      {skills.length > 0 && (
        <section className="mt-4 rounded-ios bg-white p-6 shadow-ios">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-gray-400">
              <Sparkles size={16} />
            </span>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">
              Skills Demonstrated
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-gray-100 px-3 py-1 text-[13px] font-medium text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
