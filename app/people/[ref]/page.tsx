import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getOpsProfile } from "@/lib/ops-queries";
import { PageHeader, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OpsPersonProfile({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const profile = await getOpsProfile(decodeURIComponent(ref));
  if (!profile) notFound();
  const details = profile.profileData ?? {};
  const contact = details.contactDetails;
  return <div className="animate-ios-in">
    <Link href="/people" className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900"><ArrowLeft size={15} /> Back to People</Link>
    <PageHeader title={profile.name} subtitle="Staff profile from Olyxee Ops" />
    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
      <aside className="rounded-3xl bg-gray-50 p-5 text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-gray-900 text-2xl font-semibold text-white">{profile.name.slice(0, 2).toUpperCase()}</div><p className="mt-4 font-semibold text-gray-900">{profile.name}</p><p className="mt-1 text-[13px] text-gray-500">{profile.role}</p><div className="mt-4"><StatusBadge status={profile.active ? "ACTIVE" : "SUSPENDED"} /></div></aside>
      <section className="space-y-4"><div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-[15px] font-semibold text-gray-900">Contact</h2><p className="mt-3 flex items-center gap-2 text-[13px] text-gray-600"><Mail size={15} className="text-gray-400" />{profile.email}</p>{typeof contact === "string" && <p className="mt-2 text-[13px] text-gray-600">{contact}</p>}</div><div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-[15px] font-semibold text-gray-900">Ops profile</h2><p className="mt-3 flex items-center gap-2 text-[13px] text-gray-600"><ShieldCheck size={15} className="text-gray-400" />Role: {profile.role}</p><p className="mt-2 flex items-center gap-2 text-[13px] text-gray-600"><UserRound size={15} className="text-gray-400" />Identity is managed in Olyxee Ops.</p></div></section>
    </div>
  </div>;
}
