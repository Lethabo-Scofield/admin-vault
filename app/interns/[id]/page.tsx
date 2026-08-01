import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { getIntern, getInternCredentials } from "@/lib/intern-queries";
import { archiveIntern, deleteIntern } from "@/lib/intern-actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import InternForm from "@/components/InternForm";
import ConfirmButton from "@/components/ConfirmButton";
import CredentialStatusBadge from "@/components/CredentialStatusBadge";

export const dynamic = "force-dynamic";

export default async function InternDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const internId = Number(id);
  if (!internId) notFound();

  const [intern, credentials] = await Promise.all([
    getIntern(internId),
    getInternCredentials({ internId }),
  ]);
  if (!intern) notFound();

  const archived = Boolean(intern.archivedAt);

  return (
    <div className="animate-ios-in space-y-8">
      <PageHeader
        title={intern.fullName}
        subtitle={`${intern.internNumber} · ${intern.position || "No position"}${
          archived ? " · Archived" : ""
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form action={archiveIntern}>
              <input type="hidden" name="internId" value={intern.id} />
              {archived && <input type="hidden" name="unarchive" value="on" />}
              <ConfirmButton
                message={
                  archived
                    ? "Unarchive this intern?"
                    : "Archive this intern? Their number is never reused."
                }
                className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-[14px] font-medium text-gray-800 hover:bg-gray-200"
              >
                {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {archived ? "Unarchive" : "Archive"}
              </ConfirmButton>
            </form>
            <form action={deleteIntern}>
              <input type="hidden" name="internId" value={intern.id} />
              <ConfirmButton
                message="Permanently delete this intern and ALL their credentials — including published ones? Their public verification links will stop working. This cannot be undone."
                className="tap inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-100"
              >
                <Trash2 size={16} /> Delete
              </ConfirmButton>
            </form>
          </div>
        }
      />

      {error && (
        <div className="rounded-ios bg-red-50 px-5 py-4 text-[14px] text-red-700 shadow-ios">
          {error}
        </div>
      )}

      <section>
        <InternForm intern={intern} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">
            Credentials Issued
          </h2>
          <Link
            href={`/credentials/new?internId=${intern.id}`}
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white shadow-ios hover:bg-gray-800"
          >
            <Plus size={15} /> Issue Credential
          </Link>
        </div>
        {credentials.length === 0 ? (
          <p className="rounded-ios bg-white px-5 py-6 text-[14px] text-gray-500 shadow-ios">
            No credentials issued to this intern yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-ios bg-white shadow-ios">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[12px] uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3.5 font-medium">Credential #</th>
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
      </section>

      <section className="text-[13px] text-gray-400">
        <StatusBadge status={intern.employmentStatus} /> · Created{" "}
        {String(intern.createdAt).slice(0, 10)} · Updated{" "}
        {String(intern.updatedAt).slice(0, 10)}
      </section>
    </div>
  );
}
