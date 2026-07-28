import Link from "next/link";
import { GraduationCap, Plus, Search } from "lucide-react";
import { getInterns } from "@/lib/intern-queries";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InternsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  const { q = "", archived } = await searchParams;
  const interns = await getInterns({
    search: q,
    includeArchived: archived === "1",
  });

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Interns"
        subtitle={`${interns.length} intern${interns.length === 1 ? "" : "s"}`}
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

      <form className="mb-5 flex flex-wrap items-center gap-3">
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
          description="Create your first intern to start issuing internship credentials."
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
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[12px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3.5 font-medium">Intern #</th>
                <th className="px-5 py-3.5 font-medium">Name</th>
                <th className="px-5 py-3.5 font-medium">Position</th>
                <th className="px-5 py-3.5 font-medium">Department</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Credentials</th>
              </tr>
            </thead>
            <tbody>
              {interns.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-gray-50 text-[14px] last:border-0 hover:bg-gray-50/60"
                >
                  <td className="px-5 py-3.5 font-mono text-[13px] text-gray-600">
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
                  <td className="px-5 py-3.5 text-gray-600">{i.position || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600">{i.department || "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={i.employmentStatus} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {i.credentialCount ?? 0}
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
