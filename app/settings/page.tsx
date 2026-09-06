import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Palette, ShieldCheck, LogOut, ScrollText, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/session";
import { logout } from "@/lib/auth-actions";

export const metadata: Metadata = {
  title: "Settings · Olyxee Admin",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Settings"
        subtitle="Appearance, system records and your admin session."
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <section className="rounded-ios bg-white p-5 shadow-ios sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Palette size={18} className="text-gray-400" />
            <h2 className="text-[17px] font-semibold text-gray-900">
              Appearance
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-gray-900">Dark mode</p>
              <p className="text-[13px] text-gray-500">
                Switch between light and dark themes.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="rounded-ios bg-white p-5 shadow-ios sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <ScrollText size={18} className="text-gray-400" />
            <h2 className="text-[17px] font-semibold text-gray-900">System</h2>
          </div>
          <Link
            href="/audit-logs"
            className="tap group flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3.5 hover:bg-gray-100"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-gray-900">Audit Trail</p>
              <p className="text-[13px] text-gray-500">
                Every admin action — logins, credentials, interns, uploads and key access.
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>

        <section className="rounded-ios bg-white p-5 shadow-ios sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-gray-400" />
            <h2 className="text-[17px] font-semibold text-gray-900">Account</h2>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-500 to-gray-700 text-[14px] font-semibold text-white">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-gray-900">
                {user.email}
              </p>
              <p className="text-[13px] text-gray-500">{user.role}</p>
            </div>
          </div>
          <form action={logout} className="mt-4">
            <button
              type="submit"
              className="tap inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-[14px] font-semibold text-gray-900 hover:bg-gray-200"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
