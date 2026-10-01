import Link from "next/link";
import { FolderLock, KeyRound, FileText, ChevronRight, Database } from "lucide-react";
import { getProjects } from "@/lib/queries";
import { initials, formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import CreateProjectForm from "@/components/CreateProjectForm";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const currentUser = await getCurrentUser();
  const canManageProjects =
    currentUser?.permissions.includes("MANAGE_PROJECTS") ?? false;

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Projects"
        subtitle="Every Olyxee product — usage, credentials and compliance in one place"
        action={canManageProjects ? <CreateProjectForm /> : undefined}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderLock size={26} />}
          title="No projects yet"
          description="Create your first project to start securing credentials and compliance documents."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group tap flex min-w-0 flex-col rounded-ios border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logoUrl}
                    alt={`${p.name} logo`}
                    className="h-12 w-12 shrink-0 rounded-xl object-contain ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-600">
                    {initials(p.name)}
                  </div>
                )}
                {p.status === "SUSPENDED" && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    Suspended
                  </span>
                )}
                <ChevronRight size={18} className="ml-auto text-gray-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <h2 className="break-words text-[17px] font-semibold text-gray-900">{p.name}</h2>
              {p.category && <p className="mt-1 text-[13px] text-gray-500">{p.category}</p>}
              {p.description && (
                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-gray-500">{p.description}</p>
              )}
              <div className="mt-auto pt-5">
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-4 text-[13px] text-gray-600">
                  <span className="inline-flex items-center gap-1.5"><KeyRound size={14} /> {p.keyCount} keys</span>
                  <span className="inline-flex items-center gap-1.5"><FileText size={14} /> {p.docCount} docs</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-gray-400">
                  <span className="inline-flex items-center gap-1.5"><Database size={13} /> {p.hasAnalyticsDb ? "Connected" : "Not connected"}</span>
                  <span>{formatDate(p.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
