import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  BadgeCheck,
  Ban,
  Briefcase,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Quote,
  ScrollText,
  SearchX,
  Sparkles,
} from "lucide-react";
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

function fmtLong(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(d).slice(0, 10);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Split free-text skills into clean chips (commas, newlines, bullets). */
function skillChips(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(/[,\n;•·]+/)
    .map((s) => s.trim().replace(/^[-–—*]\s*/, ""))
    .filter(Boolean)
    .slice(0, 24);
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-ios bg-white p-6 shadow-ios">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
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
  const projects = [cred.projectsCompleted, cred.responsibilities]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join("\n");
  const btn =
    "tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200";

  return (
    <Shell>
      {/* Hero: verified badge + who */}
      <div className="rounded-ios bg-white p-6 shadow-ios sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BadgeCheck size={26} />
          </div>
          <p className="mt-2 text-[14px] font-semibold text-emerald-700">
            Credential verified
          </p>
          <h1 className="mt-1 text-[24px] font-bold text-gray-900">
            {cred.fullName}
          </h1>
          <p className="text-[15px] text-gray-600">{cred.programmeTitle}</p>
          <p className="mt-1 font-mono text-[12.5px] text-gray-400">
            {cred.credentialNumber}
          </p>
        </div>

        {/* Certificate preview */}
        {cred.hasCertificatePreview && (
          <a
            href={docBase + "/certificate"}
            target="_blank"
            className="tap mt-6 block overflow-hidden rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md"
            title="Open the certificate PDF"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={docBase + "/certificate-preview"}
              alt={`Internship certificate for ${cred.fullName}`}
              className="w-full"
            />
          </a>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {cred.hasCertificatePdf && (
            <a href={docBase + "/certificate?download=1"} className={btn}>
              <Download size={15} /> Certificate PDF
            </a>
          )}
          {cred.hasLetterPdf && (
            <>
              <a href={docBase + "/letter"} target="_blank" className={btn}>
                <ScrollText size={15} /> Recommendation letter
              </a>
              <a href={docBase + "/letter?download=1"} className={btn}>
                <Download size={15} /> Letter PDF
              </a>
            </>
          )}
          <CopyLinkButton url={verifyUrl} className={btn} />
        </div>
      </div>

      {/* Key facts */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Internship Dates" icon={<CalendarDays size={16} />}>
          <p className="text-[15px] font-medium text-gray-900">
            {fmtLong(cred.startDate)}
          </p>
          <p className="text-[13px] text-gray-500">to</p>
          <p className="text-[15px] font-medium text-gray-900">
            {fmtLong(cred.completionDate)}
          </p>
        </Card>
        <Card title="Position" icon={<Briefcase size={16} />}>
          <p className="text-[15px] font-medium text-gray-900">
            {cred.position || "—"}
          </p>
          {cred.department && (
            <p className="mt-0.5 text-[13.5px] text-gray-600">
              {cred.department}
            </p>
          )}
        </Card>
        <Card title="Issued" icon={<Building2 size={16} />}>
          <p className="text-[15px] font-medium text-gray-900">
            {fmtLong(cred.issueDate)}
          </p>
          <p className="mt-0.5 text-[13.5px] text-gray-600">
            Olyxee (Pty) Ltd
          </p>
        </Card>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mt-4">
          <Card title="Skills Demonstrated" icon={<Sparkles size={16} />}>
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
          </Card>
        </div>
      )}

      {/* Projects & responsibilities */}
      {projects && (
        <div className="mt-4">
          <Card
            title="Projects & Responsibilities"
            icon={<FileText size={16} />}
          >
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-gray-800">
              {projects}
            </p>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {(cred.founderRecommendation || cred.managerRecommendation) && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cred.founderRecommendation && (
            <Card title="Founder Recommendation" icon={<Quote size={16} />}>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-800">
                {cred.founderRecommendation}
              </p>
              <p className="mt-3 text-[13px] font-medium text-gray-500">
                {[cred.founderName, cred.founderTitle]
                  .filter(Boolean)
                  .join(" · ") || "Olyxee (Pty) Ltd"}
              </p>
            </Card>
          )}
          {cred.managerRecommendation && (
            <Card title="Manager Recommendation" icon={<Quote size={16} />}>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-800">
                {cred.managerRecommendation}
              </p>
              <p className="mt-3 text-[13px] font-medium text-gray-500">
                {[cred.managerName, cred.managerTitle]
                  .filter(Boolean)
                  .join(" · ") || "Olyxee (Pty) Ltd"}
              </p>
            </Card>
          )}
        </div>
      )}
    </Shell>
  );
}
