import Link from "next/link";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getOpsCareerHistory, getOpsProfile } from "@/lib/ops-queries";
import { getSql } from "@/lib/db";
import { addOpsCareerEvent, deleteOpsPerson, updateOpsPerson } from "@/lib/ops-actions";
import CopyEmailButton from "@/components/CopyEmailButton";

export const dynamic = "force-dynamic";

function label(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default async function OpsPersonProfile({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const profile = await getOpsProfile(decodeURIComponent(ref));
  if (!profile) notFound();
  const sql = getSql();
  const [identity] = await sql<{ employeeNumber: string; refs: string[] }[]>`
    select coalesce((select 'OLX-INT-' || lpad(intern_number, 4, '0') from interns where lower(email) = lower(${profile.email}) limit 1),
      (select 'OLX-EMP-' || lpad(id::text, 4, '0') from workspace_accounts where lower(email) = lower(${profile.email}) limit 1),
      'OPS-' || upper(left(replace(${profile.id}, '-', ''), 8))) as "employeeNumber",
      array_remove(array[
        (select 'intern-' || id::text from interns where lower(email) = lower(${profile.email}) limit 1),
        (select 'account-' || id::text from workspace_accounts where lower(email) = lower(${profile.email}) limit 1)
      ], null) as refs
  `;
  const career = await getOpsCareerHistory(identity?.refs ?? []);
  const details = profile.profileData ?? {};
  const avatarUrl = typeof details.avatarUrl === "string" ? details.avatarUrl : "";
  const visibleDetails = Object.entries(details).filter(([key, value]) =>
    !["avatarUrl", "lastSeenAt", "lastLoginAt", "displayName", "role", "status"].includes(key) &&
    (typeof value === "string" || typeof value === "number") && String(value).trim()
  );

  return (
    <div className="animate-ios-in mx-auto max-w-4xl">
      <Link href="/people" className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 transition hover:text-gray-900"><ArrowLeft size={15} /> Back to People</Link>
      <section className="overflow-hidden rounded-[30px] border border-gray-200/80 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        <div className="bg-gradient-to-b from-gray-50 to-white px-6 pb-7 pt-8 sm:px-10">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[36px] bg-gray-200 text-gray-400 shadow-sm ring-4 ring-white">{avatarUrl ? <img src={avatarUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" /> : <UserRound size={60} strokeWidth={1.35} />}</div>
            <div className="mt-5 sm:ml-6 sm:mt-0"><h1 className="text-2xl font-semibold tracking-tight text-gray-950">{profile.name}</h1><p className="mt-1 text-[15px] text-gray-500">{profile.role || "Role not assigned"}</p><p className="mt-2 text-[12px] font-medium uppercase tracking-[0.08em] text-gray-400">{identity?.employeeNumber}</p><span className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-gray-500"><span className={`h-2 w-2 rounded-full ${profile.active ? "bg-gray-900" : "bg-gray-300"}`} />{profile.active ? "Active" : "Suspended"}</span></div>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-6 sm:px-10"><div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5"><Mail size={17} className="shrink-0 text-gray-400" /><CopyEmailButton email={profile.email} /></div></div>
        {visibleDetails.length > 0 ? <div className="border-t border-gray-100 px-6 py-6 sm:px-10"><h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gray-400">Details</h2><dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">{visibleDetails.map(([key, value]) => <div key={key}><dt className="text-[12px] text-gray-400">{label(key)}</dt><dd className="mt-1 break-words text-[14px] text-gray-800">{String(value)}</dd></div>)}</dl></div> : <p className="border-t border-gray-100 px-6 py-7 text-center text-[13px] text-gray-500 sm:px-10">No additional details have been recorded yet.</p>}
        <div className="border-t border-gray-100 px-6 py-6 sm:px-10"><div className="flex items-center justify-between gap-3"><h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gray-400">Career timeline</h2><span className="text-[11px] text-gray-400">Connected to Ops</span></div>{career.length > 0 ? <div className="mt-5 space-y-4">{career.map((event, index) => <div key={`${event.title}-${event.from}-${index}`} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-900" /><div><p className="text-[14px] font-medium text-gray-900">{event.title}</p><p className="mt-1 text-[12px] text-gray-500">{new Date(event.from).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}{event.to ? ` — ${new Date(event.to).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}` : " — Present"}</p></div></div>)}</div> : <p className="mt-4 text-[13px] text-gray-400">No role history recorded yet.</p>}<form action={addOpsCareerEvent} className="mt-5 grid gap-2 border-t border-gray-100 pt-5 sm:grid-cols-[1fr_150px_auto]"><input type="hidden" name="personRef" value={identity?.refs?.[0] ?? `user-${profile.id}`} /><input name="title" required placeholder="Add promoted role" className="vault-input" /><input name="from" required type="date" className="vault-input" /><button type="submit" className="rounded-xl bg-gray-100 px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-200">Add role</button></form></div>
        <div className="border-t border-gray-100 px-6 py-6 sm:px-10"><h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gray-400">Manage profile</h2><form action={updateOpsPerson} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={profile.id} /><input name="name" defaultValue={profile.name} className="vault-input" placeholder="Full name" /><input name="email" type="email" defaultValue={profile.email} className="vault-input" placeholder="Email" /><input name="role" defaultValue={profile.role} className="vault-input" placeholder="Role" /><input name="contactDetails" defaultValue={typeof details.contactDetails === "string" ? details.contactDetails : ""} className="vault-input" placeholder="Phone or contact" /><input name="githubUsername" defaultValue={typeof details.githubUsername === "string" ? details.githubUsername : ""} className="vault-input" placeholder="GitHub username" /><div className="flex items-center gap-2 sm:col-span-2"><button type="submit" className="rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800">Save changes</button></div></form><form action={deleteOpsPerson} className="mt-5 border-t border-gray-100 pt-5"><input type="hidden" name="id" value={profile.id} /><button type="submit" className="rounded-full bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100">Delete person and Ops history</button></form></div>
      </section>
      <p className="mt-4 px-1 text-center text-[12px] text-gray-400">Profile information is synced from Olyxee Ops.</p>
    </div>
  );
}
