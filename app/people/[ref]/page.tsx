import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getOpsProfile } from "@/lib/ops-queries";
import { PageHeader } from "@/components/ui";

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
    !["avatarUrl", "lastSeenAt", "lastLoginAt", "displayName"].includes(key) &&
    (typeof value === "string" || typeof value === "number") && String(value).trim()
  );

  return (
    <div className="animate-ios-in">
      <Link href="/people" className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900"><ArrowLeft size={15} /> Back to People</Link>
      <PageHeader title={profile.name} subtitle="Staff profile from Olyxee Ops" />
      <div className="grid gap-5 md:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl bg-gray-50 p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-gray-200 text-gray-400">
            {avatarUrl ? <img src={avatarUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" /> : <UserRound size={48} strokeWidth={1.4} />}
          </div>
          <p className="mt-4 font-semibold text-gray-900">{profile.name}</p>
          <p className="mt-1 text-[13px] text-gray-500">{profile.role}</p>
          <div className="mt-4"><span className="inline-flex items-center gap-1.5 text-[12px] text-gray-500"><span className={`h-1.5 w-1.5 rounded-full ${profile.active ? "bg-gray-900" : "bg-gray-300"}`} />{profile.active ? "ACTIVE" : "SUSPENDED"}</span></div>
        </aside>
        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-[15px] font-semibold text-gray-900">Contact</h2><p className="mt-3 flex items-center gap-2 text-[13px] text-gray-600"><Mail size={15} className="text-gray-400" />{profile.email}</p></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-gray-400" /><h2 className="text-[15px] font-semibold text-gray-900">Profile details</h2></div>{visibleDetails.length > 0 ? <dl className="mt-4 grid gap-4 sm:grid-cols-2">{visibleDetails.map(([key, value]) => <div key={key}><dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label(key)}</dt><dd className="mt-1 break-words text-[13px] text-gray-700">{String(value)}</dd></div>)}</dl> : <p className="mt-4 text-[13px] text-gray-500">No additional profile details have been recorded in Ops yet. The grey profile icon is the default placeholder.</p>}</div>
          <p className="flex items-center gap-2 px-1 text-[12px] text-gray-400"><UserRound size={14} /> Identity and role are managed in Olyxee Ops.</p>
        </section>
      </div>
    </div>
  );
}
