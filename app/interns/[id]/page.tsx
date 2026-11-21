import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  getIntern,
  getInternCredentials,
  getInternProjects,
  getInternDocuments,
} from "@/lib/intern-queries";
import { getCurrentUser } from "@/lib/session";
import InternProgressCard from "@/components/InternProgressCard";
import { ensureSequentialCredentialNumbers } from "@/lib/intern-numbering";
import { getSql, ensureSchema } from "@/lib/db";
import { archiveIntern, deleteIntern } from "@/lib/intern-actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import InternProfile from "@/components/InternProfile";
import ConfirmButton from "@/components/ConfirmButton";
import { getActiveSupervisors } from "@/lib/workspace-accounts";

export const dynamic = "force-dynamic";
// Self-healing may regenerate documents via headless Chromium.
export const maxDuration = 60;

export default async function InternDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { error, tab } = await searchParams;
  const internId = Number(id);
  if (!internId) notFound();

  // Self-heal any stale (gappy) credential numbering before listing.
  await ensureSchema();
  const currentUser = await getCurrentUser();
  const isSuperAdmin = currentUser?.roleKey === "SUPER_ADMIN";
  // Official credentials are super-admin only; everyone else still manages the
  // intern's profile, projects and documents.
  if (isSuperAdmin) await ensureSequentialCredentialNumbers(getSql());
  const [intern, credentials, projects, documents, supervisors] = await Promise.all([
    getIntern(internId),
    isSuperAdmin ? getInternCredentials({ internId }) : Promise.resolve([]),
    getInternProjects(internId),
    getInternDocuments(internId),
    getActiveSupervisors(),
  ]);
  if (!intern) notFound();

  const archived = Boolean(intern.archivedAt);
  const initialTab =
    tab === "documents" || tab === "personal" || tab === "internship" || tab === "writeups" || tab === "certificates"
      ? tab
      : "projects";

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
            {isSuperAdmin && (
              <form action={deleteIntern}>
                <input type="hidden" name="internId" value={intern.id} />
                <ConfirmButton
                  message="Permanently delete this intern and ALL their credentials — including published ones? Their public verification links will stop working. This cannot be undone."
                  className="tap inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={16} /> Delete
                </ConfirmButton>
              </form>
            )}
          </div>
        }
      />

      {error && (
        <div className="rounded-ios bg-red-50 px-5 py-4 text-[14px] text-red-700 shadow-ios">
          {error}
        </div>
      )}

      <section>
        <InternProgressCard intern={intern} now={new Date()} />
      </section>

      <section>
        <InternProfile
          intern={intern}
          projects={projects}
          documents={documents}
          credentials={credentials}
          supervisors={supervisors}
          showCertificates={isSuperAdmin}
          initialTab={initialTab}
        />
      </section>

      <section className="text-[13px] text-gray-400">
        <StatusBadge status={intern.employmentStatus} /> · Created{" "}
        {String(intern.createdAt).slice(0, 10)} · Updated{" "}
        {String(intern.updatedAt).slice(0, 10)}
      </section>
    </div>
  );
}
