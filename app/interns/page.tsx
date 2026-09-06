import Link from "next/link";
import { GraduationCap, Plus, Search } from "lucide-react";
import { getInterns, getInternCounts, type InternStatusFilter } from "@/lib/intern-queries";
import { ensureSequentialInternNumbers } from "@/lib/intern-numbering";
import { getSql, ensureSchema } from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { computeInternProgress, daysLeftLabel, PROGRESS_STYLE } from "@/lib/intern-progress";

export const dynamic = "force-dynamic";

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

      <div className="mb-4 flex flex-wrap gap-2">
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
            className={`tap inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium ${
              status === s ? "bg-gray-900 text-white shadow-ios" : "bg-white text-gray-700 shadow-ios hover:bg-gray-50"
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-[11.5px] ${status === s ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
              {n}
            </span>
          </Link>
        ))}
      </div>

      <form className="mb-5 flex flex-wrap items-center gap-3">
        <input type="hidden" name="status" value={status} />
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, number, position, department…"
            className="vault-input pl-10"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-gray-600">
          <input
            type="checkbox"
            name="archived"
            value="1"
            defaultChecked={archived === "1"}
            className="rounded"
          />
          Include archived
        </label>
        <button
          type="submit"
          className="tap rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
        >
          Filter
        </button>
      </form>

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
        <div className="overflow-x-auto rounded-ios bg-white shadow-ios">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[12px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3.5 font-medium">Intern #</th>
                <th className="px-5 py-3.5 font-medium">Name</th>
                <th className="px-5 py-3.5 font-medium">Position</th>
                <th className="px-5 py-3.5 font-medium">Projects</th>
                <th className="px-5 py-3.5 font-medium">Time</th>
                <th className="px-5 py-3.5 font-medium">Progress</th>
                <th className="px-5 py-3.5 font-medium">Docs</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ intern: i, progress: p }) => (
                <tr
                  key={i.id}
                  className="border-b border-gray-50 text-[14px] last:border-0 hover:bg-gray-50/60"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-gray-600">
                    <Link href={`/interns/${i.id}`} className="hover:underline">
                      {i.internNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    <Link href={`/interns/${i.id}`} className="hover:underline">
                      {i.fullName}
                    </Link>
                    {i.archivedAt && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    <p>{i.position || "—"}</p>
                    {i.department && <p className="text-[12px] text-gray-400">{i.department}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${PROGRESS_STYLE[p.state].bar}`}
                          style={{ width: `${p.projectPercent}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-medium text-gray-800">
                        {p.projectsDone}/{p.projectGoal}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    <p className="whitespace-nowrap text-[13.5px]">{daysLeftLabel(p)}</p>
                    {p.plannedEnd && p.state !== "completed" && (
                      <p className="whitespace-nowrap text-[12px] text-gray-400">ends {p.plannedEnd}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ${PROGRESS_STYLE[p.state].bg} ${PROGRESS_STYLE[p.state].text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${PROGRESS_STYLE[p.state].dot}`} />
                      {p.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    <Link href={`/interns/${i.id}?tab=documents`} className="hover:underline">
                      {i.documentCount ?? 0}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={i.employmentStatus} />
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
