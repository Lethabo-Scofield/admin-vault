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
  const isSuperAdmin = currentUser?.roleKey === "SUPER_ADMIN";

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Projects"
        subtitle="Every Olyxee product — usage, credentials and compliance in one place"
        action={isSuperAdmin ? <CreateProjectForm /> : undefined}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderLock size={26} />}
          title="No projects yet"
          description="Create your first project to start securing credentials and compliance documents."
        />
      ) : (
        <div className="overflow-hidden rounded-ios bg-white shadow-ios">
          <div className="divide-y divide-gray-100">
          {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group tap flex items-center gap-4 px-5 py-4 hover:bg-gray-50"
              >
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logoUrl}
                      alt={`${p.name} logo`}
                      className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[14px] font-semibold text-gray-600"
                    >
                      {initials(p.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                    <p className="truncate text-[16px] font-semibold text-gray-900">
                      {p.name}
                    </p>
                    {p.status === "SUSPENDED" && (
                      <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
                        Suspended
                      </span>
                    )}
                    </div>
                    {p.category && (
                      <p className="truncate text-[13px] text-gray-400">
                        {p.category}
                      </p>
                    )}
                  </div>
                <div className="hidden items-center gap-5 text-[13px] text-gray-500 sm:flex">
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={15} /> {p.keyCount} keys
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText size={15} /> {p.docCount} docs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Database size={14} /> {p.hasAnalyticsDb ? "Connected" : "Not connected"}
                  </span>
                  <span className="text-[12px] text-gray-400">
                    {formatDate(p.createdAt)}
                  </span>
                </div>
                <ChevronRight size={18} className="text-gray-300 transition-transform group-hover:translate-x-0.5" />
              </Link>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
