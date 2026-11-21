import Link from "next/link";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getOpsProfile } from "@/lib/ops-queries";

export const dynamic = "force-dynamic";

function label(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default async function OpsPersonProfile({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const profile = await getOpsProfile(decodeURIComponent(ref));
  if (!profile) notFound();
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
            <div className="mt-5 sm:ml-6 sm:mt-0"><h1 className="text-2xl font-semibold tracking-tight text-gray-950">{profile.name}</h1><p className="mt-1 text-[15px] text-gray-500">{profile.role || "Role not assigned"}</p><span className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-gray-500"><span className={`h-2 w-2 rounded-full ${profile.active ? "bg-gray-900" : "bg-gray-300"}`} />{profile.active ? "Active" : "Suspended"}</span></div>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-6 sm:px-10"><div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5"><Mail size={17} className="shrink-0 text-gray-400" /><span className="truncate text-[14px] text-gray-700">{profile.email}</span></div></div>
        {visibleDetails.length > 0 ? <div className="border-t border-gray-100 px-6 py-6 sm:px-10"><h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gray-400">Details</h2><dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">{visibleDetails.map(([key, value]) => <div key={key}><dt className="text-[12px] text-gray-400">{label(key)}</dt><dd className="mt-1 break-words text-[14px] text-gray-800">{String(value)}</dd></div>)}</dl></div> : <p className="border-t border-gray-100 px-6 py-7 text-center text-[13px] text-gray-500 sm:px-10">No additional details have been recorded yet.</p>}
      </section>
      <p className="mt-4 px-1 text-center text-[12px] text-gray-400">Profile information is synced from Olyxee Ops.</p>
    </div>
  );
}
