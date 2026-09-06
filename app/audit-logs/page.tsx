import Link from "next/link";
import { ScrollText, ArrowLeft } from "lucide-react";
import { getAuditLogs } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const logs = await getAuditLogs(200);

  return (
    <div className="animate-ios-in">
      <Link
        href="/settings"
        className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Settings
      </Link>
      <PageHeader
        title="Audit Trail"
        subtitle="Immutable ledger of admin activity"
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={26} />}
          title="No activity yet"
          description="Actions across the vault are recorded here as they happen."
        />
      ) : (
        <div className="overflow-hidden rounded-ios bg-white shadow-ios">
          <div className="hidden grid-cols-12 gap-4 border-b border-gray-100 px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-gray-400 md:grid">
            <span className="col-span-5">Action</span>
            <span className="col-span-3">Actor</span>
            <span className="col-span-2">Timestamp</span>
            <span className="col-span-2">Status</span>
          </div>
          <div className="divide-y divide-gray-100">
            {logs.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-1 gap-x-4 gap-y-1 px-5 py-3.5 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-5">
                  <p className="text-[14px] font-medium text-gray-900">
                    {a.action}
                  </p>
                  <p className="text-[12px] text-gray-400 md:hidden">
                    {a.actorEmail} · {formatDateTime(a.timestamp)}
                  </p>
                </div>
                <div className="hidden md:col-span-3 md:block">
                  <p className="text-[13.5px] text-gray-700">{a.actorEmail}</p>
                  <p className="text-[12px] text-gray-400">{a.actorRole}</p>
                </div>
                <div className="hidden font-mono text-[12.5px] text-gray-500 md:col-span-2 md:block">
                  {formatDateTime(a.timestamp)}
                </div>
                <div className="md:col-span-2">
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
