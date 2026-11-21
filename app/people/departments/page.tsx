import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, UserRound } from "lucide-react";
import { getOpsDepartments, type OpsDepartment } from "@/lib/ops-queries";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const departments = await getOpsDepartments();
  const roots = departments.filter((department) => !department.parentName);
  const children = new Map<string, OpsDepartment[]>();
  for (const department of departments.filter((item) => item.parentName)) {
    const list = children.get(department.parentName!) ?? [];
    list.push(department);
    children.set(department.parentName!, list);
  }
  return <div className="animate-ios-in"><Link href="/people" className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900"><ArrowLeft size={15} /> People</Link><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Organisation</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">Departments</h1><p className="mt-1 text-[14px] text-gray-500">Three clear organisation groups, with their teams inside.</p></div><Building2 className="hidden text-gray-300 sm:block" size={28} strokeWidth={1.5} /></div>{roots.length === 0 ? <div className="rounded-3xl bg-gray-50 px-6 py-12 text-center text-[14px] text-gray-500">No departments have been assigned in Ops yet.</div> : <div className="grid gap-5 lg:grid-cols-3">{roots.map((root) => <section key={root.name} className="rounded-[28px] border border-gray-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.04)]"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[18px] font-semibold text-gray-950">{root.name}</h2><p className="mt-1 text-[12px] text-gray-400">{root.members.length} people directly assigned</p></div><Building2 size={19} className="text-gray-300" /></div><div className="mt-5 space-y-3">{departmentCard(root)}{(children.get(root.name) ?? []).map((child) => <div key={child.name} className="rounded-2xl bg-gray-50 p-4">{departmentCard(child)}</div>)}</div></section>)}</div>}</div>;
}

function departmentCard(department: OpsDepartment) {
  const team = department.lead ? department.members.filter((person) => person.stableRef !== department.lead?.stableRef) : department.members;
  return <div><div className="flex items-center justify-between gap-2"><h3 className="text-[14px] font-semibold text-gray-900">{department.name}</h3><span className="text-[11px] text-gray-400">{department.members.length}</span></div><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">Lead</p>{department.lead ? <PersonRow person={department.lead} /> : <p className="py-2 text-[12px] text-gray-400">No lead assigned</p>}<p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">Team</p>{team.length ? <div className="divide-y divide-gray-200/70">{team.map((person) => <PersonRow key={person.stableRef} person={person} />)}</div> : <p className="py-2 text-[12px] text-gray-400">No other team members</p>}</div>;
}

function PersonRow({ person }: { person: { stableRef: string; name: string; title: string; avatarUrl: string } }) {
  return <Link href={`/people/${encodeURIComponent(person.stableRef)}`} className="flex items-center gap-3 rounded-xl py-2 transition hover:bg-white"><div className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${person.avatarUrl ? "bg-gray-200" : "bg-gray-100 text-gray-400"}`}>{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={16} strokeWidth={1.5} />}</div><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-gray-800">{person.name}</span><span className="block truncate text-[10px] text-gray-400">{person.title || "Role not assigned"}</span></span><ArrowUpRight size={13} className="text-gray-300" /></Link>;
}
