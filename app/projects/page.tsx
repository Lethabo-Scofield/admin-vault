import Link from "next/link";
import { FolderLock, KeyRound, FileText, ChevronRight, Users, Activity, Database, AlertTriangle } from "lucide-react";
import { getProjects } from "@/lib/queries";
import { getProjectUsageSnapshot, type ProjectUsageSnapshot } from "@/lib/analytics";
import { initials, accentColor, formatDate, timeAgo } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import CreateProjectForm from "@/components/CreateProjectForm";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const now = new Date();
  // Live usage for connected projects, fetched in parallel with a per-project timeout.
  const snapshots = new Map<number, ProjectUsageSnapshot | null>(
    await Promise.all(
      projects.map(async (p) => {
        if (!p.hasAnalyticsDb) return [p.id, null] as const;
        return [p.id, await getProjectUsageSnapshot(p.id)] as const;
      })
    )
  );

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Projects"
        subtitle="Every Olyxee product — usage, credentials and compliance in one place"
        action={<CreateProjectForm />}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderLock size={26} />}
          title="No projects yet"
          description="Create your first project to start securing credentials and compliance documents."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const tint = accentColor(p.name);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group tap flex flex-col rounded-ios bg-white p-5 shadow-ios hover:shadow-ios-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logoUrl}
                      alt={`${p.name} logo`}
                      className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover shadow-ios"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-[16px] font-bold text-white"
                      style={{ backgroundColor: tint }}
                    >
                      {initials(p.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-gray-900">
                      {p.name}
                    </p>
                    {p.category && (
                      <p className="truncate text-[13px] text-gray-400">
                        {p.category}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 transition-transform group-hover:translate-x-0.5"
                  />
                </div>

                {p.description && (
                  <p className="mb-4 line-clamp-2 text-[13.5px] leading-relaxed text-gray-500">
                    {p.description}
                  </p>
                )}

                <UsageStrip snapshot={snapshots.get(p.id) ?? null} connected={p.hasAnalyticsDb} now={now} />

                <div className="mt-auto flex items-center gap-4 border-t border-gray-100 pt-4 text-[13px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={15} /> {p.keyCount} keys
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText size={15} /> {p.docCount} docs
                  </span>
                  <span className="ml-auto text-[12px] text-gray-300">
                    {formatDate(p.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsageStrip({
  snapshot,
  connected,
  now,
}: {
  snapshot: ProjectUsageSnapshot | null;
  connected: boolean;
  now: Date;
}) {
  if (!connected) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-[12.5px] text-gray-400">
        <Database size={14} /> No usage data — connect the product database
      </div>
    );
  }
  if (!snapshot || !snapshot.ok) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-600">
        <AlertTriangle size={14} className="shrink-0" />
        <span className="truncate">{snapshot?.error ?? "Could not reach the product database"}</span>
      </div>
    );
  }
  const live = snapshot.activeUsers7d > 0;
  return (
    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
      <div>
        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          <Users size={12} /> Users
        </p>
        <p className="text-[16px] font-semibold text-gray-900">{snapshot.totalUsers}</p>
      </div>
      <div>
        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          <Activity size={12} /> Active 7d
        </p>
        <p className="flex items-center gap-1.5 text-[16px] font-semibold text-gray-900">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-green-500" : "bg-gray-300"}`} />
          {snapshot.activeUsers7d}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Last activity</p>
        <p className="truncate text-[13px] font-medium text-gray-700">
          {timeAgo(snapshot.lastActivityAt, now)}
        </p>
      </div>
    </div>
  );
}
