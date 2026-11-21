import Link from "next/link";
import { ArrowUpRight, Mail, Search, UserPlus, UserRound, Users } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui";
import { getPeopleDirectory } from "@/lib/organisation-queries";
import { createEmployee } from "@/lib/organisation-actions";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const filters = [
  ["all", "Everyone"],
  ["employee", "Staff"],
  ["intern", "Interns"],
] as const;

export default async function PeoplePage({
  searchParams,
}: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "all" } = await searchParams;
  const people = await getPeopleDirectory();
  const currentUser = await getCurrentUser();
  const term = q.trim().toLowerCase();
  const filtered = people.filter((person) =>
    (type === "all" || person.type.toLowerCase() === type.toLowerCase()) &&
    (!term || [person.name, person.email, person.role, person.functionName, person.stableId]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term)))
  );
  const timelineOrder = new Map([
    ["scofield@olyxee.com", 0],
    ["alisha.fatima@olyxee.com", 1],
    ["mosamaseko17@gmail.com", 2],
    ["emmanuel.stakio@olyxee.com", 3],
    ["thokozani.dlomo@olyxee.com", 4],
    ["zaid.muhammad.dev@gmail.com", 5],
    ["munibashami07@gmail.com", 6],
  ]);
  filtered.sort((a, b) => (timelineOrder.get(a.email.toLowerCase()) ?? 100) - (timelineOrder.get(b.email.toLowerCase()) ?? 100) || Number(Boolean(b.hasProfile)) - Number(Boolean(a.hasProfile)) || a.name.localeCompare(b.name));
  const hrefFor = (nextType: string) => `/people?type=${nextType}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="animate-ios-in">
      <PageHeader title="People" subtitle="Everyone who works with Olyxee" />

      {currentUser?.roleKey === "SUPER_ADMIN" && <details className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-gray-800"><UserPlus size={16} className="text-gray-500" /> Add person</summary><form action={createEmployee} className="mt-4 grid gap-3 sm:grid-cols-3"><input name="fullName" required placeholder="Full name" className="vault-input" /><input name="email" type="email" required placeholder="Email address" className="vault-input" /><input name="jobTitle" placeholder="Role / title" className="vault-input" /><select name="engagementType" defaultValue="EMPLOYEE" className="vault-input"><option value="EMPLOYEE">Employee</option><option value="CONTRACTOR">Contractor</option><option value="ADVISOR">Advisor</option></select><div className="sm:col-span-2"><button type="submit" className="rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800">Create person</button></div></form></details>}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
          {filters.map(([id, label]) => (
            <Link key={id} href={hrefFor(id)} className={`rounded-xl px-4 py-2 text-[13px] font-medium transition ${type === id ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-900"}`}>
              {label}
            </Link>
          ))}
        </div>
        <form className="relative w-full sm:w-80">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={q} placeholder="Search name, email or role" className="vault-input h-10 w-full !pl-10" />
          {type !== "all" && <input type="hidden" name="type" value={type} />}
        </form>
      </div>

      <div className="mb-3 flex items-center justify-between px-1 text-[13px] text-gray-500">
        <span>{filtered.length} {filtered.length === 1 ? "person" : "people"}</span>
        {term && <span>Filtered by “{q}”</span>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={25} />} title="No people found" description="Try another name, email, or role." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 lg:grid">
            <span className="col-span-3">Person</span><span className="col-span-3">Email</span><span className="col-span-2">Role</span><span className="col-span-1">Status</span><span className="col-span-3 text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((person) => {
              const internId = person.stableId.startsWith("intern:") ? person.stableId.slice(7) : null;
              return (
                <div key={person.stableId} className="grid gap-4 px-5 py-4 lg:grid-cols-12 lg:items-center">
                  <div className="flex min-w-0 items-center gap-3 lg:col-span-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${person.avatarUrl ? "bg-gray-200" : "bg-gray-100 text-gray-400"}`}>{person.avatarUrl ? <img src={person.avatarUrl} alt={`${person.name} profile`} className="h-full w-full object-cover" /> : <UserRound size={22} strokeWidth={1.5} />}</div><div className="min-w-0"><p className="truncate text-[14px] font-semibold text-gray-900">{person.name}</p></div></div>
                  <div className="min-w-0 lg:col-span-3"><p className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-gray-600"><Mail size={14} className="shrink-0 text-gray-400" />{person.email || "No email recorded"}</p></div>
                  <div className="min-w-0 lg:col-span-2"><p className="truncate text-[13px] text-gray-700">{person.role || "Role not assigned"}</p>{person.functionName && <p className="mt-0.5 truncate text-[11px] text-gray-400">{person.functionName}</p>}</div>
                  <div className="lg:col-span-1"><span className="inline-flex items-center gap-1.5 text-[12px] text-gray-500"><span className={`h-1.5 w-1.5 rounded-full ${person.status === "ACTIVE" ? "bg-gray-900" : "bg-gray-300"}`} />{person.status}</span></div>
                  <div className="flex flex-wrap items-center justify-start gap-2 lg:col-span-3 lg:justify-end">
                    {internId ? <Link href={`/interns/${internId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"><ArrowUpRight size={14} /> Open profile</Link> : person.profileRef ? <Link href={`/people/${encodeURIComponent(person.profileRef)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"><ArrowUpRight size={14} /> Open profile</Link> : <span className="text-[12px] text-gray-400">No profile linked</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
