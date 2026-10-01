import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  MapPin,
  Package,
  Users,
  Zap,
} from "lucide-react";
import type {
  AnalyticsActivity,
  AnalyticsBusiness,
  AnalyticsUser,
  ProjectAnalytics,
} from "@/lib/types";
import { humanizeAction } from "@/lib/analytics";
import {
  activityBucket,
  accentColor,
  formatDate,
  formatDateTime,
  initials,
  timeAgo,
} from "@/lib/format";
import AnalyticsDbForm from "@/components/AnalyticsDbForm";
import CompanyLogo from "@/components/CompanyLogo";

export default function ProjectAnalyticsSection({
  projectId,
  analytics,
  connectedHost,
  canManage,
}: {
  projectId: number;
  analytics: ProjectAnalytics | null;
  connectedHost: string;
  canManage: boolean;
}) {
  const now = analytics ? new Date(analytics.generatedAt) : new Date();
  return (
    <section className="mb-9" aria-labelledby="usage-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="usage-heading" className="text-[20px] font-semibold tracking-tight text-gray-900">
            Product usage
          </h2>
          {analytics?.ok && (
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 text-[12.5px] text-gray-500">
              <span className="inline-flex items-center gap-1.5 text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
              </span>
              <span aria-hidden="true" className="text-gray-300">·</span>
              <span>Updated {timeAgo(analytics.generatedAt, now)}</span>
              {connectedHost && (
                <>
                  <span aria-hidden="true" className="text-gray-300">·</span>
                  <span className="break-all font-mono text-[11.5px]">{connectedHost}</span>
                </>
              )}
            </p>
          )}
        </div>
        {canManage && <AnalyticsDbForm projectId={projectId} connectedHost={connectedHost} />}
      </div>

      {!analytics ? (
        <NotConnected canManage={canManage} />
      ) : !analytics.ok ? (
        <ConnectionError host={analytics.host} error={analytics.error} />
      ) : (
        <Connected analytics={analytics} now={now} />
      )}
    </section>
  );
}

function NotConnected({ canManage }: { canManage: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-gray-200 py-5">
      <div className="flex min-w-0 items-start gap-3">
        <Activity size={18} className="mt-0.5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-gray-900">Usage data not connected</h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">
            {canManage
              ? "Connect the product database to view its users, customers and activity."
              : "A Super Admin can connect the product database to show usage here."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConnectionError({ host, error }: { host: string; error: string }) {
  return (
    <div className="border-y border-gray-200 py-5">
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gray-600" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">Could not reach the product database</p>
          <p className="mt-1 break-all font-mono text-[12px] text-gray-500">{host}</p>
          <p className="mt-2 break-words text-[13px] leading-relaxed text-gray-700">{error}</p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, detail }: { children: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-500">{children}</h3>
      {detail && <span className="text-[12px] text-gray-400">{detail}</span>}
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
  const { summary, users, businesses, recentActivity, dailyActivity, topActions, notes } = analytics;
  const actions14d = dailyActivity.reduce((total, day) => total + day.actions, 0);
  const busiestDay = dailyActivity.reduce<{ day: string; actions: number } | null>(
    (best, day) => (day.actions > (best?.actions ?? 0) ? day : best),
    null,
  );
  const activeToday = users.filter(
    (user) => activityBucket(user.lastActiveAt ?? user.lastActionAt ?? user.lastSignInAt, now) === "active",
  ).length;

  return (
    <div className="space-y-7">
      {notes.length > 0 && (
        <p className="border-l-2 border-gray-400 py-1 pl-3 text-[12.5px] leading-relaxed text-gray-600">
          {notes.join(" ")}
        </p>
      )}

      <div>
        <SectionLabel>At a glance</SectionLabel>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 border-y border-gray-200 sm:grid-cols-4 sm:divide-y-0">
          <Metric label="People" value={summary.totalUsers} detail={summary.newUsers30d > 0 ? `+${summary.newUsers30d} this month` : "No new sign-ups"} icon={<Users size={15} />} />
          <Metric label="Active · 7 days" value={summary.activeUsers7d} detail={`${activeToday} today · ${summary.activeUsers30d} this month`} icon={<Zap size={15} />} />
          {summary.businesses !== null && (
            <Metric label="Customers" value={summary.businesses} detail="Businesses" icon={<Building2 size={15} />} />
          )}
          {summary.totalOrders !== null ? (
            <Metric label="Orders" value={summary.totalOrders} detail={`${summary.orders30d ?? 0} in 30 days`} icon={<Package size={15} />} />
          ) : (
            <Metric label="Actions · 7 days" value={summary.actions7d ?? 0} detail={summary.lastActivityAt ? `Last ${timeAgo(summary.lastActivityAt, now)}` : "Nothing recorded"} icon={<Activity size={15} />} />
          )}
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <div className="min-w-0">
          <SectionLabel detail="Last 14 days">Activity</SectionLabel>
          <div className="border-y border-gray-200 py-4">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-gray-600">
                <span className="mr-1 text-[24px] font-semibold tracking-tight text-gray-900">{actions14d}</span>
                actions
              </p>
              {busiestDay && busiestDay.actions > 0 && (
                <p className="text-[12px] text-gray-500">Busiest {formatDate(busiestDay.day)} · {busiestDay.actions}</p>
              )}
            </div>
            <DailyBars data={dailyActivity} />
          </div>
        </div>
        <div className="min-w-0">
          <SectionLabel detail="30 days">Top actions</SectionLabel>
          <div className="divide-y divide-gray-100 border-y border-gray-200">
            {topActions.length === 0 ? (
              <p className="py-5 text-[13px] text-gray-500">No actions recorded yet.</p>
            ) : (
              topActions.slice(0, 6).map((action, index) => {
                const max = topActions[0].count || 1;
                return (
                  <div key={`${action.action}-${index}`} className="py-2.5">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-[13px]">
                      <span className="min-w-0 break-words text-gray-700">{humanizeAction(action.action)}</span>
                      <span className="shrink-0 tabular-nums text-gray-500">{action.count}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gray-700" style={{ width: `${Math.max(4, (action.count / max) * 100)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {businesses.length > 0 && (
        <details className="group">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 border-b border-gray-200 py-2 text-[13px] font-semibold text-gray-800 marker:hidden">
            <span>Customers <span className="ml-1 font-normal tabular-nums text-gray-500">{businesses.length}</span></span>
            <span className="text-[12px] font-medium text-gray-500 group-open:hidden">Show</span>
            <span className="hidden text-[12px] font-medium text-gray-500 group-open:inline">Hide</span>
          </summary>
          <div className="divide-y divide-gray-100 border-b border-gray-200">
            {businesses.map((business) => <BusinessRow key={business.id} business={business} now={now} />)}
          </div>
        </details>
      )}

      <div>
        <details className="group">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 border-b border-gray-200 py-2 text-[13px] font-semibold text-gray-800 marker:hidden">
            <span>People <span className="ml-1 font-normal tabular-nums text-gray-500">{users.length}</span></span>
            <span className="text-[12px] font-medium text-gray-500 group-open:hidden">Show</span>
            <span className="hidden text-[12px] font-medium text-gray-500 group-open:inline">Hide</span>
          </summary>
          <div className="divide-y divide-gray-100 border-b border-gray-200">
            {users.length === 0 ? (
              <p className="py-6 text-[13px] text-gray-500">No users found in this database.</p>
            ) : (
              users.map((user) => (
                <UserRow key={user.id} user={user} business={businesses.find((item) => item.id === user.businessId)} now={now} />
              ))
            )}
          </div>
        </details>
      </div>

      <div>
        <details className="group">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 border-b border-gray-200 py-2 text-[13px] font-semibold text-gray-800 marker:hidden">
            <span>Recent activity <span className="ml-1 font-normal tabular-nums text-gray-500">{recentActivity.length}</span></span>
            <span className="text-[12px] font-medium text-gray-500 group-open:hidden">Show</span>
            <span className="hidden text-[12px] font-medium text-gray-500 group-open:inline">Hide</span>
          </summary>
          <div className="divide-y divide-gray-100 border-b border-gray-200">
            {recentActivity.length === 0 ? (
              <p className="py-6 text-[13px] text-gray-500">No activity recorded yet.</p>
            ) : (
              recentActivity.slice(0, 25).map((activity) => <ActivityRow key={activity.id} item={activity} now={now} />)
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-3 py-3 first:pl-0 sm:px-4 sm:first:pl-0">
      <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-gray-500">{icon}{label}</p>
      <p className="mt-1 text-[25px] font-semibold leading-tight tracking-tight tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 break-words text-[11.5px] leading-snug text-gray-500">{detail}</p>
    </div>
  );
}

function planLabel(business: AnalyticsBusiness): string | null {
  const parts = [business.plan, business.subscriptionStatus]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return parts.length ? Array.from(new Set(parts)).join(" · ") : null;
}

function BusinessRow({ business, now }: { business: AnalyticsBusiness; now: Date }) {
  const bucket = activityBucket(business.lastActiveAt, now);
  const style = BUCKET_STYLES[bucket];
  const plan = planLabel(business);
  return (
    <article className="flex min-w-0 flex-col gap-3 py-4 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex min-w-0 items-start gap-3 lg:flex-1">
        <CompanyLogo name={business.name} domain={business.domain} logoUrl={business.logoUrl} size={38} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-[14px] font-semibold text-gray-900">{business.name}</p>
          <p className="break-all text-[12px] text-gray-500">{business.domain ?? business.industry ?? "No website on file"}</p>
          {(business.location || business.createdAt) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[11.5px] text-gray-400">
              {business.location && <><MapPin size={11} className="shrink-0" /><span className="break-words">{business.location}</span></>}
              {business.location && business.createdAt && <span>·</span>}
              {business.createdAt && <span>Since {formatDate(business.createdAt)}</span>}
            </p>
          )}
        </div>
      </div>
      {plan && <span className="break-words text-[11.5px] text-gray-600">{plan}</span>}
      <div className="grid w-full max-w-[240px] grid-cols-3 divide-x divide-gray-100 lg:w-52 lg:shrink-0">
        <Mini label="People" value={String(business.userCount)} />
        <Mini label="Orders" value={business.orderCount === null ? "—" : String(business.orderCount)} />
        <Mini label="30 days" value={business.orders30d === null ? "—" : String(business.orders30d)} />
      </div>
      <div className="flex items-center gap-2 text-[12px] lg:w-36 lg:shrink-0 lg:justify-end">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <span className={style.text}>{style.label}</span>
        <span className="ml-auto text-gray-400" title={business.lastActiveAt ? formatDateTime(business.lastActiveAt) : undefined}>
          {timeAgo(business.lastActiveAt, now)}
        </span>
      </div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
      <p className="text-[14px] font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="text-[10.5px] text-gray-500">{label}</p>
    </div>
  );
}

const BUCKET_STYLES: Record<ReturnType<typeof activityBucket>, { label: string; dot: string; text: string }> = {
  active: { label: "Active today", dot: "bg-emerald-500", text: "text-gray-700" },
  recent: { label: "Active this week", dot: "bg-emerald-400", text: "text-gray-700" },
  idle: { label: "Active this month", dot: "bg-amber-400", text: "text-gray-700" },
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
  const style = BUCKET_STYLES[activityBucket(lastSeen, now)];
  const displayName = user.name || user.email || "Unnamed user";
  const affiliation = [business?.name ?? user.businessName, user.role].filter(Boolean).join(" · ");

  return (
    <article className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-3 sm:flex-1">
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: accentColor(displayName) }}>
            {initials(displayName)}
          </div>
          {business && (
            <span className="absolute -bottom-1 -right-1">
              <CompanyLogo name={business.name} domain={business.domain} logoUrl={business.logoUrl} size={17} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[13px] font-medium text-gray-900">{displayName}</p>
          <p className="break-all text-[11.5px] text-gray-500">{user.email}</p>
          {affiliation && <p className="break-words text-[11.5px] text-gray-400">{affiliation}</p>}
        </div>
        <div className="shrink-0 text-right sm:hidden">
          <p className={`text-[11.5px] font-medium ${style.text}`}>{style.label}</p>
          <p className="text-[11px] text-gray-500" title={lastSeen ? formatDateTime(lastSeen) : undefined}>{timeAgo(lastSeen, now)}</p>
        </div>
      </div>
      <div className="min-w-0 pl-12 sm:flex-1 sm:pl-0">
        <p className="break-words text-[12.5px] text-gray-700">{user.lastAction ? humanizeAction(user.lastAction) : "No recorded actions"}</p>
        <p className="break-words text-[11px] text-gray-500">
          {user.actions30d} this month · {user.actionsTotal} all time{user.lastDevice ? ` · ${user.lastDevice}` : ""}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className={`text-[11.5px] font-medium ${style.text}`}>{style.label}</p>
        <p className="text-[11px] text-gray-500" title={lastSeen ? formatDateTime(lastSeen) : undefined}>{timeAgo(lastSeen, now)}</p>
      </div>
    </article>
  );
}

function ActivityRow({ item, now }: { item: AnalyticsActivity; now: Date }) {
  const who = item.userName || item.userEmail || "Someone";
  return (
    <article className="flex min-w-0 items-start gap-3 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: accentColor(who) }}>
        {initials(who)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[13px] leading-snug text-gray-900">
          <span className="font-medium">{who}</span>{" "}
          <span className="text-gray-600">{humanizeAction(item.action).toLowerCase()}</span>
          {item.detail && <span className="text-gray-500"> · {item.detail}</span>}
        </p>
        <p className="mt-0.5 break-words text-[11.5px] text-gray-500">
          {item.businessName ? `${item.businessName} · ` : ""}
          <span title={formatDateTime(item.at)}>{timeAgo(item.at, now)}</span>
        </p>
      </div>
    </article>
  );
}

function DailyBars({ data }: { data: { day: string; actions: number; users: number }[] }) {
  const max = Math.max(1, ...data.map((day) => day.actions));
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {data.map((day, index) => (
          <div
            key={day.day}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={`${formatDate(day.day)}: ${day.actions} actions · ${day.users} people`}
          >
            {day.actions > 0 && <span className="text-[9px] tabular-nums text-gray-500">{day.actions}</span>}
            <div
              className={`w-full rounded-sm ${day.actions === 0 ? "bg-gray-100" : index === data.length - 1 ? "bg-gray-500" : "bg-gray-800"}`}
              style={{ height: `${day.actions > 0 ? Math.max(8, (day.actions / max) * 100) : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-gray-500">
        <span>{data[0] ? formatDate(data[0].day) : ""}</span>
        <span>Today</span>
      </div>
    </div>
  );
}