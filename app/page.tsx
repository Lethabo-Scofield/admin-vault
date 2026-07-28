import Link from "next/link";
import {
  FolderLock,
  KeyRound,
  Activity,
  ShieldCheck,
  Radar,
  TriangleAlert,
  ArrowRight,
} from "lucide-react";
import { getDashboardStats, getCredentials, getAuditLogs } from "@/lib/queries";
import { maskSecret, formatDateTime } from "@/lib/format";
import { PageHeader, EnvBadge, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, credentials, audit] = await Promise.all([
    getDashboardStats(),
    getCredentials(),
    getAuditLogs(6),
  ]);

  const recentCreds = credentials.slice(0, 5);

  const cards = [
    {
      label: "Total Projects",
      value: stats.totalProjects,
      icon: FolderLock,
      tint: "#4f46e5",
    },
    {
      label: "Stored Credentials",
      value: stats.totalCredentials,
      icon: KeyRound,
      tint: "#0891b2",
    },
    {
      label: "Active API Keys",
      value: stats.activeApiKeys,
      icon: Activity,
      tint: "#059669",
    },
    {
      label: "Compliance Documents",
      value: stats.complianceDocuments,
      icon: ShieldCheck,
      tint: "#7c3aed",
    },
    {
      label: "Audit Triggers (24h)",
      value: stats.auditTriggers24h,
      icon: Radar,
      tint: "#d97706",
    },
    {
      label: "Unauthorized (24h)",
      value: stats.unauthorizedAttempts24h,
      icon: TriangleAlert,
      tint: "#dc2626",
    },
  ];

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Dashboard"
        subtitle="Encrypted with AES-256 · Real-time vault overview"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tint }) => (
          <div
            key={label}
            className="rounded-ios bg-white p-5 shadow-ios tap"
          >
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${tint}14`, color: tint }}
            >
              <Icon size={20} strokeWidth={2.1} />
            </div>
            <p className="text-[30px] font-bold leading-none tracking-tight text-gray-900">
              {value}
            </p>
            <p className="mt-2 text-[13.5px] font-medium text-gray-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Recent credentials */}
        <div className="overflow-hidden rounded-ios bg-white shadow-ios xl:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-gray-900">
              Recent Credentials
            </h2>
            <Link
              href="/project-keys"
              className="tap flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentCreds.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-gray-400">
              No credentials stored yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCreds.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-gray-900">
                      {c.serviceName}
                    </p>
                    <p className="truncate font-mono text-[12px] text-gray-400">
                      {maskSecret(c.secretValue)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <EnvBadge environment={c.environment} />
                    <span className="hidden text-[13px] text-gray-400 sm:inline">
                      {c.projectName ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent audit */}
        <div className="overflow-hidden rounded-ios bg-white shadow-ios xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-gray-900">
              Audit Trail
            </h2>
            <Link
              href="/audit-logs"
              className="tap flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {audit.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-gray-400">
              No activity recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {audit.map((a) => (
                <div key={a.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[13.5px] font-medium text-gray-900">
                      {a.action}
                    </p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-gray-400">
                    {a.actorEmail} · {formatDateTime(a.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
