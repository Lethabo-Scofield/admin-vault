import Link from "next/link";
import { ChevronRight, GraduationCap, Plus } from "lucide-react";
import { getInterns, getInternCounts, type InternStatusFilter } from "@/lib/intern-queries";
import { ensureSequentialInternNumbers } from "@/lib/intern-numbering";
import { getSql, ensureSchema } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { computeInternProgress, daysLeftLabel, PROGRESS_STYLE } from "@/lib/intern-progress";
import InternSearch from "@/components/InternSearch";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

function readableDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function InternsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string; status?: string }>;
}) {
  const { q = "", archived, status: rawStatus } = await searchParams;
  const status: InternStatusFilter =
    rawStatus === "completed" || rawStatus === "all" ? rawStatus : "active";
  // Self-heal any stale (gappy) intern numbering before listing.
  await ensureSchema();
  await ensureSequentialInternNumbers(getSql());
  const [interns, counts] = await Promise.all([
    getInterns({ search: q, includeArchived: archived === "1", status }),
    getInternCounts(),
  ]);
  const now = new Date();
  const rows = interns.map((i) => ({ intern: i, progress: computeInternProgress(i, now) }));
  const behind = rows.filter((r) => r.progress.state === "behind" || r.progress.state === "overdue").length;

  const filterHref = (s: InternStatusFilter) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (archived === "1") params.set("archived", "1");
    params.set("status", s);
    return `/interns?${params.toString()}`;
  };

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Interns"
        subtitle={`${counts.active} active · ${counts.completed} completed${
          behind > 0 && status !== "completed" ? ` · ${behind} need attention` : ""
        }`}
        action={
          <Link
            href="/interns/new"
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
          >
            <Plus size={17} strokeWidth={2.4} />
            New Intern
          </Link>
        }
      />

      <div className="mb-4 inline-flex max-w-full gap-1 rounded-xl bg-gray-100 p-1">
        {(
          [
            ["active", "Active", counts.active],
            ["completed", "Completed", counts.completed],
            ["all", "All", counts.all],
          ] as const
        ).map(([s, label, n]) => (
          <Link
            key={s}
            href={filterHref(s)}
            aria-current={status === s ? "page" : undefined}
            className={`tap inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${
              status === s ? "bg-white text-gray-900 shadow-ios" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
            <span className="text-[11px] tabular-nums text-gray-500">
              {n}
            </span>
          </Link>
        ))}
      </div>

      <InternSearch query={q} includeArchived={archived === "1"} />

      {interns.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={26} />}
          title="No interns found"
          description={status === "active" && counts.all > 0 ? "No active interns match. Try the Completed or All filter." : "Add your first intern to start tracking their 3-month programme."}
          action={
            <Link
              href="/interns/new"
              className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
            >
              <Plus size={16} /> New Intern
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-ios border border-gray-200 bg-white">
          <div className="hidden grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 xl:grid">
            <div className="col-span-4">Intern & role</div>
            <div className="col-span-2">Projects completed</div>
            <div className="col-span-2">Time remaining</div>
            <div className="col-span-2">Programme progress</div>
            <div className="col-span-2">Employment</div>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.map(({ intern: i, progress: p }) => (
              <article
                key={i.id}
                className="group grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-5 transition-colors hover:bg-gray-50 sm:px-5 xl:grid-cols-12 xl:items-center xl:gap-y-0"
              >
                <div className="col-span-2 flex min-w-0 items-center gap-3 xl:col-span-4">
                  <Link
                    href={`/interns/${i.id}`}
                    aria-label={`Open ${i.fullName}'s profile`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-600 ring-1 ring-gray-200 transition-colors group-hover:bg-gray-200"
                  >
                    {initials(i.fullName)}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={`/interns/${i.id}`} className="break-words text-[14px] font-semibold text-gray-900 hover:underline">
                        {i.fullName}
                      </Link>
                      {i.archivedAt && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-[12px] text-gray-500">
                      {i.position || "Role not set"}
                      {i.department ? ` · ${i.department}` : ""}
                    </p>
                  </div>
                  <Link href={`/interns/${i.id}`} aria-label={`View ${i.fullName}'s profile`} className="text-gray-400 xl:hidden">
                    <ChevronRight size={18} />
                  </Link>
                </div>

                <div className="min-w-0 xl:col-span-2">
                  <span className="mb-1.5 block text-[11px] text-gray-500 xl:hidden">Projects completed</span>
                  <p className="text-[14px] font-semibold tabular-nums text-gray-800">
                    {p.projectsDone}<span className="font-normal text-gray-500"> of {p.projectGoal}</span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label={`${i.fullName}: projects completed`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={p.projectPercent}
                    aria-valuetext={`${p.projectsDone} of ${p.projectGoal} projects completed`}
                    className="mt-2 h-1 max-w-24 overflow-hidden rounded-full bg-gray-100"
                  >
                    <div className={`h-full rounded-full ${PROGRESS_STYLE[p.state].bar}`} style={{ width: `${p.projectPercent}%` }} />
                  </div>
                </div>

                <div className="min-w-0 xl:col-span-2">
                  <span className="mb-1.5 block text-[11px] text-gray-500 xl:hidden">Time remaining</span>
                  <p className="text-[13px] font-medium text-gray-700">{p.state === "unscheduled" ? "Dates not set" : daysLeftLabel(p)}</p>
                  {i.completionDate ? (
                    <p className="mt-1 text-[11px] text-gray-500">Finished {readableDate(i.completionDate)}</p>
                  ) : p.plannedEnd && p.state !== "completed" && p.state !== "withdrawn" ? (
                    <p className="mt-1 text-[11px] text-gray-500">{p.state === "not_started" ? `Starts ${readableDate(i.startDate)}` : `Ends ${readableDate(p.plannedEnd)}`}</p>
                  ) : null}
                </div>

                <div className="min-w-0 xl:col-span-2">
                  <span className="mb-1.5 block text-[11px] text-gray-500 xl:hidden">Programme progress</span>
                  <span className={`inline-flex max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-medium ${PROGRESS_STYLE[p.state].bg} ${PROGRESS_STYLE[p.state].text}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PROGRESS_STYLE[p.state].dot}`} />
                    {p.label}
                  </span>
                </div>

                <div className="min-w-0 xl:col-span-2">
                  <span className="mb-1.5 block text-[11px] text-gray-500 xl:hidden">Employment</span>
                  <StatusBadge status={i.employmentStatus} />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
