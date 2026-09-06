import {
  Activity,
  AlertTriangle,
  Building2,
  Package,
  Users,
  Zap,
  MapPin,
  Clock,
} from "lucide-react";
import type {
  ProjectAnalytics,
  AnalyticsUser,
  AnalyticsBusiness,
  AnalyticsActivity,
} from "@/lib/types";
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
import CompanyLogo from "@/components/CompanyLogo";

/**
 * "Traffic & Users" section of a project page. Server component; all data is
 * read from the project's own application database (see lib/analytics.ts).
 *
 * Layout follows iOS grouped-list conventions: small uppercase section labels,
 * white inset groups with hairline separators, one idea per group.
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
  const now = analytics ? new Date(analytics.generatedAt) : new Date();
  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-gray-900">
            Traffic &amp; Users
          </h2>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] text-gray-400">
            {analytics?.ok ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                </span>
                <span>·</span>
                <span>Updated {timeAgo(analytics.generatedAt, now)}</span>
                {connectedHost && (
                  <span className="hidden items-center gap-2 md:inline-flex">
                    <span>·</span>
                    <span className="font-mono text-[12px]">{connectedHost}</span>
                  </span>
                )}
              </>
            ) : (
              "Who uses this product, and what they do in it."
            )}
          </p>
        </div>
        {canManage && <AnalyticsDbForm projectId={projectId} connectedHost={connectedHost} />}
      </div>

      {!analytics ? (
        <NotConnected projectId={projectId} canManage={canManage} />
      ) : !analytics.ok ? (
        <ConnectionError host={analytics.host} error={analytics.error} />
      ) : (
        <Connected analytics={analytics} now={now} />
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty / error states                                                       */
/* -------------------------------------------------------------------------- */

function NotConnected({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-ios bg-white px-6 py-12 text-center shadow-ios">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <Activity size={26} />
      </div>
      <h3 className="text-[17px] font-semibold text-gray-900">No usage data yet</h3>
      <p className="mt-1 max-w-md text-[14px] text-gray-500">
        {canManage
          ? "Connect this product's database to see its customers, who is active, and what they do."
          : "A super admin can connect this product's database to show usage here."}
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
            Could not reach the product database
          </p>
          <p className="mt-0.5 font-mono text-[12.5px] text-gray-400">{host}</p>
          <p className="mt-2 break-words rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
          <p className="mt-2 text-[13px] text-gray-500">
            The database may be paused or the password may have changed. A super
            admin can update the connection with the Database button.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Connected view                                                             */
/* -------------------------------------------------------------------------- */

function GroupLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-gray-400">
        {children}
      </p>
      {aside && <p className="text-[12.5px] text-gray-400">{aside}</p>}
    </div>
  );
}

function Connected({
  analytics,
  now,
}: {
  analytics: Extract<ProjectAnalytics, { ok: true }>;
  now: Date;
}) {
  const { summary, users, businesses, recentActivity, dailyActivity, topActions, notes } =
    analytics;

  const actions14d = dailyActivity.reduce((a, d) => a + d.actions, 0);
  const busiestDay = dailyActivity.reduce<{ day: string; actions: number } | null>(
    (best, d) => (d.actions > (best?.actions ?? 0) ? d : best),
    null
  );
  const activeToday = users.filter(
    (u) => activityBucket(u.lastActiveAt ?? u.lastActionAt ?? u.lastSignInAt, now) === "active"
  ).length;

  return (
    <div className="space-y-7">
      {notes.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          {notes.join(" ")}
        </div>
      )}

      {/* ---- At a glance ---- */}
      <div>
        <GroupLabel>At a glance</GroupLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            icon={<Users size={16} />}
            label="People"
            value={summary.totalUsers}
            sub={
              summary.newUsers30d > 0
                ? `+${summary.newUsers30d} joined this month`
                : "no new sign-ups this month"
            }
          />
          <Stat
            icon={<Zap size={16} />}
            label="Active this week"
            value={summary.activeUsers7d}
            sub={`${activeToday} today · ${summary.activeUsers30d} this month`}
            accent={summary.activeUsers7d > 0}
          />
          {summary.businesses !== null && (
            <Stat
              icon={<Building2 size={16} />}
              label="Customers"
              value={summary.businesses}
              sub="businesses on the platform"
            />
          )}
          {summary.totalOrders !== null ? (
            <Stat
              icon={<Package size={16} />}
              label="Orders"
              value={summary.totalOrders}
              sub={`${summary.orders30d ?? 0} in the last 30 days`}
            />
          ) : (
            <Stat
              icon={<Activity size={16} />}
              label="Actions this week"
              value={summary.actions7d ?? 0}
              sub={
                summary.lastActivityAt
                  ? `last one ${timeAgo(summary.lastActivityAt, now)}`
                  : "nothing recorded yet"
              }
            />
          )}
        </div>
      </div>

      {/* ---- Customers ---- */}
      {businesses.length > 0 && (
        <div>
          <GroupLabel aside={`${businesses.length} total`}>Customers</GroupLabel>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((b) => (
              <BusinessCard key={b.id} business={b} now={now} />
            ))}
          </div>
        </div>
      )}

      {/* ---- Activity ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GroupLabel aside="last 14 days">Activity</GroupLabel>
          <div className="rounded-ios bg-white p-5 shadow-ios">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] text-gray-900">
                <span className="text-[24px] font-semibold tracking-tight">{actions14d}</span>{" "}
                <span className="text-gray-500">things done in the last two weeks</span>
              </p>
              {busiestDay && busiestDay.actions > 0 && (
                <p className="text-[12.5px] text-gray-400">
                  Busiest day {formatDate(busiestDay.day)} · {busiestDay.actions}
                </p>
              )}
            </div>
            <DailyBars data={dailyActivity} />
          </div>
        </div>

        <div>
          <GroupLabel aside="30 days">What people do</GroupLabel>
          <div className="rounded-ios bg-white shadow-ios">
            {topActions.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-gray-400">
                No actions recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {topActions.slice(0, 6).map((a, i) => {
                  const max = topActions[0].count || 1;
                  return (
                    <li key={`${a.action}-${i}`} className="px-5 py-3">
                      <div className="flex items-center justify-between text-[13.5px]">
                        <span className="truncate text-gray-800">{humanizeAction(a.action)}</span>
                        <span className="ml-3 tabular-nums text-gray-500">{a.count}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
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

      {/* ---- People ---- */}
      <div>
        <GroupLabel aside="most recently active first">People</GroupLabel>
        <div className="overflow-hidden rounded-ios bg-white shadow-ios">
          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-gray-400">
              No users found in this database.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <UserRow key={u.id} user={u} business={businesses.find((b) => b.id === u.businessId)} now={now} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Recent activity ---- */}
      <div>
        <GroupLabel aside={recentActivity.length ? `latest ${recentActivity.length}` : undefined}>
          Recent activity
        </GroupLabel>
        <div className="rounded-ios bg-white shadow-ios">
          {recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-gray-400">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentActivity.slice(0, 25).map((a) => (
                <ActivityRow key={a.id} item={a} now={now} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function Stat({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-ios bg-white p-4 shadow-ios">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-400">
        {icon} {label}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-[28px] font-semibold tracking-tight text-gray-900">
        {value}
        {accent && value > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
      </p>
      <p className="truncate text-[12.5px] text-gray-400">{sub}</p>
    </div>
  );
}

function planLabel(b: AnalyticsBusiness): string | null {
  const parts = [b.plan, b.subscriptionStatus]
    .filter((p): p is string => Boolean(p))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return parts.length ? Array.from(new Set(parts)).join(" · ") : null;
}

function BusinessCard({ business: b, now }: { business: AnalyticsBusiness; now: Date }) {
  const bucket = activityBucket(b.lastActiveAt, now);
  const style = BUCKET_STYLES[bucket];
  const plan = planLabel(b);
  return (
    <div className="rounded-ios bg-white p-4 shadow-ios">
      <div className="flex items-start gap-3">
        <CompanyLogo name={b.name} domain={b.domain} logoUrl={b.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-gray-900" title={b.name}>
            {b.name}
          </p>
          <p className="truncate text-[12.5px] text-gray-400">
            {b.domain ?? b.industry ?? "No website on file"}
          </p>
        </div>
        {plan && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {plan}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 py-2.5 text-center">
        <Mini label="People" value={String(b.userCount)} />
        <Mini label="Orders" value={b.orderCount === null ? "—" : String(b.orderCount)} />
        <Mini label="30 days" value={b.orders30d === null ? "—" : String(b.orders30d)} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[12.5px]">
        <span className={`inline-flex items-center gap-1.5 font-medium ${style.text}`}>
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {style.label}
        </span>
        <span className="flex items-center gap-1 text-gray-400" title={b.lastActiveAt ? formatDateTime(b.lastActiveAt) : undefined}>
          <Clock size={12} /> {timeAgo(b.lastActiveAt, now)}
        </span>
      </div>
      {(b.location || b.createdAt) && (
        <p className="mt-2 flex items-center gap-1 truncate text-[12px] text-gray-400">
          {b.location && (
            <>
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{b.location}</span>
            </>
          )}
          {b.location && b.createdAt && <span className="px-1">·</span>}
          {b.createdAt && <span className="shrink-0">since {formatDate(b.createdAt)}</span>}
        </p>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="text-[16px] font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}

const BUCKET_STYLES: Record<
  ReturnType<typeof activityBucket>,
  { label: string; dot: string; text: string }
> = {
  active: { label: "Active today", dot: "bg-emerald-500", text: "text-emerald-700" },
  recent: { label: "Active this week", dot: "bg-emerald-400", text: "text-emerald-700" },
  idle: { label: "Active this month", dot: "bg-amber-400", text: "text-amber-700" },
  inactive: { label: "Inactive", dot: "bg-gray-300", text: "text-gray-500" },
  never: { label: "Never active", dot: "bg-gray-300", text: "text-gray-500" },
};

function UserRow({
  user,
  business,
  now,
}: {
  user: AnalyticsUser;
  business?: AnalyticsBusiness;
  now: Date;
}) {
  const lastSeen = user.lastActiveAt ?? user.lastActionAt ?? user.lastSignInAt;
  const bucket = activityBucket(lastSeen, now);
  const style = BUCKET_STYLES[bucket];
  const displayName = user.name || user.email || "Unnamed user";

  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="relative shrink-0">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-semibold text-white"
          style={{ backgroundColor: accentColor(displayName) }}
        >
          {initials(displayName)}
        </div>
        {business && (
          <span className="absolute -bottom-1 -right-1">
            <CompanyLogo name={business.name} domain={business.domain} logoUrl={business.logoUrl} size={20} />
          </span>
        )}
        <span
          className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${style.dot}`}
          title={style.label}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-gray-900">{displayName}</p>
        <p className="truncate text-[12.5px] text-gray-400">
          {[business?.name ?? user.businessName, user.role].filter(Boolean).join(" · ") || user.email}
        </p>
        <p className="truncate text-[12.5px] text-gray-500 sm:hidden">
          {user.lastAction ? humanizeAction(user.lastAction) : "No recorded actions"} ·{" "}
          {timeAgo(lastSeen, now)}
        </p>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="truncate text-[13.5px] text-gray-800">
          {user.lastAction ? humanizeAction(user.lastAction) : "No recorded actions"}
        </p>
        <p className="truncate text-[12px] text-gray-400">
          {user.actions30d} this month · {user.actionsTotal} all time
          {user.lastDevice ? ` · ${user.lastDevice}` : ""}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className={`text-[13px] font-medium ${style.text}`}>{style.label}</p>
        <p className="text-[12px] text-gray-400" title={lastSeen ? formatDateTime(lastSeen) : undefined}>
          {timeAgo(lastSeen, now)}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({ item: a, now }: { item: AnalyticsActivity; now: Date }) {
  const who = a.userName || a.userEmail || "Someone";
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ backgroundColor: accentColor(who) }}
      >
        {initials(who)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug text-gray-900">
          <span className="font-medium">{who}</span>{" "}
          <span className="text-gray-600">{humanizeAction(a.action).toLowerCase()}</span>
          {a.detail && <span className="text-gray-400"> · {a.detail}</span>}
        </p>
        <p className="mt-0.5 text-[12px] text-gray-400">
          {a.businessName ? `${a.businessName} · ` : ""}
          <span title={formatDateTime(a.at)}>{timeAgo(a.at, now)}</span>
        </p>
      </div>
    </li>
  );
}

function DailyBars({ data }: { data: { day: string; actions: number; users: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.actions));
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5">
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          return (
            <div
              key={d.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${formatDate(d.day)}: ${d.actions} actions · ${d.users} people`}
            >
              {d.actions > 0 && (
                <span className="text-[10px] tabular-nums text-gray-400">{d.actions}</span>
              )}
              <div
                className={`w-full rounded-md ${
                  d.actions === 0 ? "bg-gray-100" : isLast ? "bg-emerald-500" : "bg-gray-900"
                }`}
                style={{ height: `${d.actions > 0 ? Math.max(8, (d.actions / max) * 100) : 4}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        <span>{data[0] ? formatDate(data[0].day) : ""}</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> today
        </span>
      </div>
    </div>
  );
}
