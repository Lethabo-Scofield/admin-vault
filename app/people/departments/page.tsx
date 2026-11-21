import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, UserRound } from "lucide-react";
import { getOpsDepartments } from "@/lib/ops-queries";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const departments = await getOpsDepartments();
  return (
    <div className="animate-ios-in">
      <Link href="/people" className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900"><ArrowLeft size={15} /> People</Link>
      <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Organisation</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">Departments</h1><p className="mt-1 text-[14px] text-gray-500">Teams, leads and everyone assigned to them.</p></div><Building2 className="hidden text-gray-300 sm:block" size={28} strokeWidth={1.5} /></div>
      {departments.length === 0 ? <div className="rounded-3xl bg-gray-50 px-6 py-12 text-center text-[14px] text-gray-500">No departments have been assigned in Ops yet.</div> : <div className="grid gap-5 md:grid-cols-2">{departments.map((department) => { const team = department.lead ? department.members.filter((person) => person.stableRef !== department.lead?.stableRef) : department.members; return <section key={department.name} className={`rounded-3xl border border-gray-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.04)] ${department.parentName ? "md:ml-5" : ""}`}><div className="flex items-start justify-between gap-3"><div>{department.parentName && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">Under {department.parentName}</p>}<h2 className="text-[17px] font-semibold text-gray-950">{department.name}</h2><p className="mt-1 text-[12px] text-gray-400">{department.members.length} {department.members.length === 1 ? "person" : "people"}</p></div><Building2 size={19} className="text-gray-300" /></div><div className="mt-5 border-t border-gray-100 pt-4"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Lead</p>{department.lead ? <PersonRow person={department.lead} /> : <p className="mt-2 text-[13px] text-gray-400">No lead assigned</p>}<p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Team</p><div className="mt-2 divide-y divide-gray-100">{team.length ? team.map((person) => <PersonRow key={person.stableRef} person={person} />) : <p className="py-2 text-[13px] text-gray-400">No other team members</p>}</div></div></section>})}</div>}
    </div>
  );
}

function PersonRow({ person }: { person: { stableRef: string; name: string; title: string; avatarUrl: string } }) {
  return <Link href={`/people/${encodeURIComponent(person.stableRef)}`} className="flex items-center gap-3 rounded-xl py-2.5 transition hover:bg-gray-50"><div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ${person.avatarUrl ? "bg-gray-200" : "bg-gray-100 text-gray-400"}`}>{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={18} strokeWidth={1.5} />}</div><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-gray-800">{person.name}</span><span className="block truncate text-[11px] text-gray-400">{person.title || "Role not assigned"}</span></span><ArrowUpRight size={14} className="text-gray-300" /></Link>;
}
