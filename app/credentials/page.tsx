import Link from "next/link";
import { BadgeCheck, Plus } from "lucide-react";
import { getInternCredentials } from "@/lib/intern-queries";
import { PageHeader, EmptyState } from "@/components/ui";
import CredentialStatusBadge from "@/components/CredentialStatusBadge";

export const dynamic = "force-dynamic";

export default async function InternCredentialsPage() {
  const credentials = await getInternCredentials();

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Internship Credentials"
        subtitle={`${credentials.length} credential${
          credentials.length === 1 ? "" : "s"
        } · super admin only`}
        action={
          <Link
            href="/credentials/new"
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
          >
            <Plus size={17} strokeWidth={2.4} />
            New Credential
          </Link>
        }
      />

      {credentials.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck size={26} />}
          title="No credentials yet"
          description="Issue a verifiable internship credential to an intern."
          action={
            <Link
              href="/credentials/new"
              className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
            >
              <Plus size={16} /> New Credential
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-ios bg-white shadow-ios">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[12px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3.5 font-medium">Credential #</th>
                <th className="px-5 py-3.5 font-medium">Intern</th>
                <th className="px-5 py-3.5 font-medium">Programme</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Issued</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-50 text-[14px] last:border-0 hover:bg-gray-50/60"
                >
                  <td className="px-5 py-3.5 font-mono text-[13px]">
                    <Link
                      href={`/credentials/${c.id}`}
                      className="text-gray-800 hover:underline"
                    >
                      {c.credentialNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {c.internName}
                    <span className="ml-2 font-mono text-[12px] font-normal text-gray-400">
                      {c.internNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {c.programmeTitle}
                  </td>
                  <td className="px-5 py-3.5">
                    <CredentialStatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {c.issueDate ? String(c.issueDate).slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
