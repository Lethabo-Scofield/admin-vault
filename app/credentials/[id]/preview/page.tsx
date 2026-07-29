import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { getInternCredential } from "@/lib/intern-queries";
import CredentialStatusBadge from "@/components/CredentialStatusBadge";

export const dynamic = "force-dynamic";
// Document rendering uses headless Chromium — allow more than Vercel's 10s default.
export const maxDuration = 60;

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

export default async function CredentialPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const credentialId = Number(id);
  if (!credentialId) notFound();
  const c = await getInternCredential(credentialId);
  if (!c) notFound();

  const dates = [c.startDate, c.completionDate]
    .map((d) => (d ? String(d).slice(0, 10) : null))
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="animate-ios-in mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/credentials/${c.id}`}
          className="tap inline-flex items-center gap-2 text-[14px] font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to credential
        </Link>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700">
          Preview — exactly what the public verification page will show
        </span>
      </div>

      <div className="rounded-ios bg-white p-8 shadow-ios">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BadgeCheck size={24} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-400">
              Olyxee Verified Credential
            </p>
            <p className="font-mono text-[15px] font-semibold text-gray-900">
              {c.credentialNumber}
            </p>
          </div>
          <div className="ml-auto">
            <CredentialStatusBadge status={c.status} />
          </div>
        </div>

        <Row label="Name" value={c.internName} />
        <Row label="Programme" value={c.programmeTitle} />
        <Row label="Position" value={c.position} />
        <Row label="Internship Dates" value={dates} />
        <Row
          label="Projects & Responsibilities"
          value={c.projectsCompleted}
        />
        <Row label="Skills Demonstrated" value={c.skillsDemonstrated} />
        <Row label="Supervisor Recommendation" value={c.publicRecommendation} />
        <Row label="Supervisor" value={c.supervisorName} />
        <Row
          label="Issue Date"
          value={c.issueDate ? String(c.issueDate).slice(0, 10) : null}
        />
        <Row label="Issued By" value="Olyxee · https://olyxee.com" />
      </div>
    </div>
  );
}
