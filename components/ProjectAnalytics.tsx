import {
  Activity,
  AlertTriangle,
  Building2,
  Package,
  Users,
  UserPlus,
  Zap,
} from "lucide-react";
import type { ProjectAnalytics, AnalyticsUser } from "@/lib/types";
import { humanizeAction } from "@/lib/analytics";
import {
  activityBucket,
  formatDate,
  formatDateTime,
  initials,
  accentColor,
  timeAgo,
} from "@/lib/format";
import AnalyticsDbForm from "@/components/AnalyticsDbForm";

/**
 * "Traffic & Users" section of a project page. Server component; all data is
 * read from the project's own application database (see lib/analytics.ts).
 */
export default function ProjectAnalyticsSection({
  projectId,
  analytics,
  connectedHost,
  canManage,
}: {
  projectId: number;
  analytics: ProjectAnalytics | null;
  connectedHost: string;
  /** Only super admins may connect, replace or disconnect a database. */
  canManage: boolean;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-gray-900">
          <Activity size={18} /> Traffic &amp; Users
          {analytics?.ok && (
            <span className="text-[14px] font-normal text-gray-400">
              ({analytics.summary.totalUsers})
            </span>
          )}
        </h2>
        {canManage ? (
          <AnalyticsDbForm projectId={projectId} connectedHost={connectedHost} />
        ) : connectedHost ? (
          <span className="font-mono text-[12px] text-gray-400">{connectedHost}</span>
        ) : null}
      </div>

      {!analytics ? (
        <NotConnected projectId={projectId} canManage={canManage} />
      ) : !analytics.ok ? (
        <ConnectionError host={analytics.host} error={analytics.error} />
      ) : (
        <Connected analytics={analytics} />
      )}
    </section>
  );
}

function NotConnected({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-ios bg-white px-6 py-12 text-center shadow-ios">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <Activity size={26} />
      </div>
      <h3 className="text-[17px] font-semibold text-gray-900">
        No usage data yet
      </h3>
      <p className="mt-1 max-w-md text-[14px] text-gray-500">
        {canManage
          ? "Connect this project's application database to see who is using it, when they were last active, and what they did."
          : "A super admin can connect this project's application database to show usage here."}
      </p>
      {canManage && (
        <div className="mt-5">
          <AnalyticsDbForm projectId={projectId} connectedHost="" variant="card" />
        </div>
      )}
    </div>
  );
}

function ConnectionError({ host, error }: { host: string; error: string }) {
  return (
    <div className="rounded-ios bg-white p-5 shadow-ios">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-gray-900">
            Could not reach the analytics database
          </p>
          <p className="mt-0.5 font-mono text-[12.5px] text-gray-400">{host}</p>
          <p className="mt-2 break-words rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
          <p className="mt-2 text-[13px] text-gray-500">
            The database may be paused, the password may have changed, or this
            host cannot reach it. A super admin can update the connection with
            the Database button.
          </p>
        </div>
      </div>
    </div>
  );
}

function Connected({
  analytics,
}: {
  analytics: Extract<ProjectAnalytics, { ok: true }>;
}) {
  const { summary, users, recentActivity, dailyActivity, topActions, notes } =
    analytics;
  const now = new Date(analytics.generatedAt);

  const stats: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: "Total users",
      value: String(summary.totalUsers),
      sub: `${summary.newUsers30d} new in 30 days`,
      icon: <Users size={18} />,
    },
    {
      label: "Active (7 days)",
      value: String(summary.activeUsers7d),
      sub: `${summary.activeUsers30d} active in 30 days`,
      icon: <Zap size={18} />,
    },
  ];
  if (summary.businesses !== null) {
    stats.push({
      label: "Businesses",
      value: String(summary.businesses),
      sub: "workspaces on the platform",
      icon: <Building2 size={18} />,
    });
  }
  if (summary.totalOrders !== null) {
    stats.push({
      label: "Orders",
      value: String(summary.totalOrders),
      sub: `${summary.orders30d ?? 0} in the last 30 days`,
      icon: <Package size={18} />,
    });
  }
  if (summary.actions7d !== null) {
    stats.push({
      label: "Actions (7 days)",
      value: String(summary.actions7d),
      sub: summary.lastActivityAt
        ? `last activity ${timeAgo(summary.lastActivityAt, now)}`
        : "no activity recorded",
      icon: <Activity size={18} />,
    });
  }

  return (
    <div className="space-y-4">
      {notes.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          {notes.join(" ")}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-ios bg-white p-4 shadow-ios">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[12.5px] font-medium">{s.label}</span>
              {s.icon}
            </div>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
              {s.value}
            </p>
            {s.sub && (
              <p className="mt-0.5 truncate text-[12px] text-gray-400">{s.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Users table */}
        <div className="overflow-hidden rounded-ios bg-white shadow-ios lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <p className="text-[14.5px] font-semibold text-gray-900">Users</p>
            <p className="text-[12.5px] text-gray-400">
              sorted by last activity
            </p>
          </div>
          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-gray-400">
              No users found in this database.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <UserRow key={u.id} user={u} now={now} />
              ))}
            </div>
          )}
        </div>

        {/* Right column: daily chart + top actions */}
        <div className="space-y-4">
          <div className="rounded-ios bg-white p-5 shadow-ios">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[14.5px] font-semibold text-gray-900">
                Activity · 14 days
              </p>
              <p className="text-[12.5px] text-gray-400">
                {dailyActivity.reduce((a, d) => a + d.actions, 0)} actions
              </p>
            </div>
            <DailyBars data={dailyActivity} />
          </div>

          <div className="rounded-ios bg-white p-5 shadow-ios">
            <p className="mb-3 text-[14.5px] font-semibold text-gray-900">
              What people do · 30 days
            </p>
            {topActions.length === 0 ? (
              <p className="text-[13px] text-gray-400">No actions recorded.</p>
            ) : (
              <ul className="space-y-2.5">
                {topActions.map((a, i) => {
                  const max = topActions[0].count || 1;
                  return (
                    <li key={`${a.action}-${i}`}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="truncate text-gray-700">
                          {humanizeAction(a.action)}
                        </span>
                        <span className="ml-3 tabular-nums text-gray-500">
                          {a.count}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gray-900"
                          style={{ width: `${Math.max(4, (a.count / max) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="overflow-hidden rounded-ios bg-white shadow-ios">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-[14.5px] font-semibold text-gray-900">
            Recent activity
          </p>
          <p className="text-[12.5px] text-gray-400">
            latest {recentActivity.length}
          </p>
        </div>
        {recentActivity.length === 0 ? (
          <p className="px-5 py-10 text-center text-[14px] text-gray-400">
            No activity recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentActivity.map((a, i) => (
              <li
                key={`${a.id}-${i}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
              >
                <div className="min-w-[180px] flex-1">
                  <p className="text-[14px] text-gray-900">
                    <span className="font-medium">
                      {a.userName || a.userEmail || "Unknown user"}
                    </span>{" "}
                    <span className="text-gray-600">
                      {humanizeAction(a.action).toLowerCase()}
                    </span>
                    {a.detail && (
                      <span className="text-gray-400"> · {a.detail}</span>
                    )}
                  </p>
                  {a.businessName && (
                    <p className="text-[12px] text-gray-400">{a.businessName}</p>
                  )}
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11.5px] font-medium uppercase tracking-wide text-gray-500">
                  {a.entityType}
                </span>
                <span
                  className="w-[110px] text-right text-[12.5px] tabular-nums text-gray-400"
                  title={formatDateTime(a.at)}
                >
                  {timeAgo(a.at, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-right text-[12px] text-gray-400">
        Live from <span className="font-mono">{analytics.host}</span> · refreshed{" "}
        {formatDateTime(analytics.generatedAt)} UTC
      </p>
    </div>
  );
}

const BUCKET_STYLES: Record<
  ReturnType<typeof activityBucket>,
  { label: string; dot: string; text: string }
> = {
  active: { label: "Active today", dot: "bg-emerald-500", text: "text-emerald-700" },
  recent: { label: "This week", dot: "bg-emerald-400", text: "text-emerald-700" },
  idle: { label: "This month", dot: "bg-amber-400", text: "text-amber-700" },
  inactive: { label: "Inactive", dot: "bg-gray-300", text: "text-gray-500" },
  never: { label: "Never active", dot: "bg-gray-300", text: "text-gray-500" },
};

function UserRow({ user, now }: { user: AnalyticsUser; now: Date }) {
  const lastSeen = user.lastActiveAt ?? user.lastActionAt ?? user.lastSignInAt;
  const bucket = activityBucket(lastSeen, now);
  const style = BUCKET_STYLES[bucket];
  const displayName = user.name || user.email || "Unnamed user";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-3.5 md:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)] md:gap-x-5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold text-white"
        style={{ backgroundColor: accentColor(displayName) }}
      >
        {initials(displayName)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[14.5px] font-medium text-gray-900">
          {displayName}
        </p>
        <p className="truncate text-[12.5px] text-gray-400" title={user.email}>
          {user.email}
        </p>
        <p className="truncate text-[12px] text-gray-400">
          {[user.businessName, user.role].filter(Boolean).join(" · ")}
          {user.createdAt ? `${user.businessName || user.role ? " · " : ""}Joined ${formatDate(user.createdAt)}` : ""}
        </p>
      </div>

      <div className="col-start-2 min-w-0 md:col-start-auto">
        <p className={`flex items-center gap-1.5 text-[13px] font-medium ${style.text}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
          {style.label}
        </p>
        <p
          className="text-[12px] text-gray-400"
          title={lastSeen ? formatDateTime(lastSeen) : undefined}
        >
          Last seen {timeAgo(lastSeen, now)}
        </p>
        {user.lastDevice && (
          <p className="truncate text-[12px] text-gray-400" title={user.lastIp ?? undefined}>
            {user.lastDevice}
          </p>
        )}
      </div>

      <div className="col-start-2 min-w-0 md:col-start-auto">
        {user.lastAction ? (
          <>
            <p className="truncate text-[13px] text-gray-700">
              {humanizeAction(user.lastAction)}
            </p>
            <p className="text-[12px] text-gray-400">
              {timeAgo(user.lastActionAt, now)} · {user.actions30d} in 30d · {user.actionsTotal} total
            </p>
          </>
        ) : (
          <p className="text-[13px] text-gray-400">No recorded actions</p>
        )}
      </div>
    </div>
  );
}

function DailyBars({
  data,
}: {
  data: { day: string; actions: number; users: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.actions));
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {data.map((d) => (
          <div
            key={d.day}
            className="group relative flex h-full flex-1 items-end"
            title={`${d.day}: ${d.actions} actions · ${d.users} users`}
          >
            <div
              className={`w-full rounded-t-md ${
                d.actions > 0 ? "bg-gray-900" : "bg-gray-100"
              }`}
              style={{
                height: `${d.actions > 0 ? Math.max(6, (d.actions / max) * 100) : 4}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}
