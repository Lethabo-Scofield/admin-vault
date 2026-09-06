import postgres from "postgres";
import { getSql, ensureSchema } from "@/lib/db";
import { decryptString } from "@/lib/crypto";
import type {
  ProjectAnalytics,
  AnalyticsUser,
  AnalyticsActivity,
  AnalyticsDailyPoint,
  AnalyticsActionCount,
  AnalyticsBusiness,
} from "@/lib/types";

/**
 * Read-only analytics over a project's own application database.
 *
 * Targets the standard Olyxee app schema (public.users, public.audit_logs,
 * public.businesses, public.orders; optional Supabase auth.users/auth.sessions).
 * Every section degrades independently: a missing table produces an explicit
 * "not available" note rather than a fabricated number.
 */

type Sql = ReturnType<typeof postgres>;

const globalForAnalytics = globalThis as unknown as {
  __analyticsPools?: Map<string, Sql>;
};

function isLocalHost(host: string): boolean {
  return host === "helium" || host === "localhost" || host === "127.0.0.1";
}

export function connectionHost(url: string): string {
  return new URL(url).hostname;
}

/** Validates a URL string is a postgres connection string; throws otherwise. */
export function assertPostgresUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That is not a valid connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("The connection string must start with postgres:// or postgresql://.");
  }
  if (!parsed.hostname) {
    throw new Error("The connection string has no host.");
  }
}

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^helium$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
  /\.(local|internal|localdomain)$/i,
];

/**
 * Outbound policy for analytics databases: only public hostnames/IPs. Prevents
 * an admin session from pointing the server at internal infrastructure.
 * Hostnames without a dot (bare service names) are refused in production.
 */
export function assertAllowedAnalyticsHost(url: string): void {
  const host = connectionHost(url).toLowerCase();
  const isProd = process.env.NODE_ENV === "production";
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) {
    throw new Error("Private or local database hosts are not allowed here.");
  }
  if (isProd && !host.includes(".")) {
    throw new Error("Use the database's public hostname.");
  }
}

/**
 * Turns a driver error into a short, credential-free message suitable for the
 * UI. Full details should be logged server-side by the caller.
 */
export function describeDbError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;
  if (/tenant or user not found/i.test(raw)) {
    return "The database's pooler does not recognise this project (is it paused or deleted?).";
  }
  if (/password authentication failed/i.test(raw) || code === "28P01") {
    return "Password authentication failed.";
  }
  if (code === "ENOTFOUND" || /ENOTFOUND|getaddrinfo/.test(raw)) {
    return "Host not found.";
  }
  if (code === "ECONNREFUSED" || /ECONNREFUSED/.test(raw)) {
    return "Connection refused by the host.";
  }
  if (code === "CONNECT_TIMEOUT" || /timeout|timed out/i.test(raw)) {
    return "Connection timed out.";
  }
  if (code === "3D000" || /database .* does not exist/i.test(raw)) {
    return "Database name does not exist.";
  }
  if (/self.signed|certificate/i.test(raw)) {
    return "TLS certificate error.";
  }
  if (/permission denied/i.test(raw) || code === "42501") {
    return "The database user lacks permission to read the required tables.";
  }
  // Fall back to the driver message with any credentials scrubbed.
  return raw.replace(/:\/\/[^@\s]+@/g, "://***@").slice(0, 200);
}

function poolFor(url: string): Sql {
  if (!globalForAnalytics.__analyticsPools) {
    globalForAnalytics.__analyticsPools = new Map();
  }
  const pools = globalForAnalytics.__analyticsPools;
  let sql = pools.get(url);
  if (!sql) {
    sql = postgres(url, {
      prepare: false,
      ssl: isLocalHost(connectionHost(url)) ? false : "require",
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    pools.set(url, sql);
  }
  return sql;
}

export function dropPool(url: string): void {
  const sql = globalForAnalytics.__analyticsPools?.get(url);
  if (sql) {
    globalForAnalytics.__analyticsPools!.delete(url);
    void sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

/** Opens a short-lived connection and confirms it can run a query. */
export async function testConnection(url: string): Promise<{ tables: string[] }> {
  assertPostgresUrl(url);
  const sql = postgres(url, {
    prepare: false,
    ssl: isLocalHost(connectionHost(url)) ? false : "require",
    max: 1,
    connect_timeout: 10,
  });
  try {
    const rows = await sql<{ table_schema: string; table_name: string }[]>`
      select table_schema, table_name
      from information_schema.tables
      where table_schema in ('public', 'auth') and table_type = 'BASE TABLE'
    `;
    return { tables: rows.map((r) => `${r.table_schema}.${r.table_name}`) };
  } finally {
    await sql.end({ timeout: 3 }).catch(() => undefined);
  }
}

async function getProjectAnalyticsUrl(
  projectId: number
): Promise<{ url: string | null; host: string; error?: string }> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<{ enc: string; host: string }[]>`
    select analytics_db_url_enc as enc, analytics_db_host as host
    from projects where id = ${projectId}
  `;
  const enc = rows[0]?.enc;
  const host = rows[0]?.host ?? "";
  if (!enc) return { url: null, host };
  try {
    return { url: decryptString(enc), host };
  } catch (err) {
    console.error("[analytics] cannot decrypt stored URL for project", projectId, err);
    return {
      url: null,
      host,
      error:
        "The stored connection string can no longer be decrypted (the app's SESSION_SECRET changed). Disconnect and connect the database again.",
    };
  }
}

/** Runs one analytics section; on failure records a note and returns the fallback. */
async function section<T>(
  label: string,
  notes: string[],
  fallback: T,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[analytics] section "${label}" failed:`, err);
    notes.push(`${label} unavailable: ${describeDbError(err)}`);
    return fallback;
  }
}

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : v == null ? null : String(v);

const num = (v: unknown): number => Number(v ?? 0);

async function tableSet(sql: Sql): Promise<Set<string>> {
  const rows = await sql<{ table_schema: string; table_name: string }[]>`
    select table_schema, table_name
    from information_schema.tables
    where table_schema in ('public', 'auth') and table_type = 'BASE TABLE'
  `;
  return new Set(rows.map((r) => `${r.table_schema}.${r.table_name}`));
}

export async function getProjectAnalytics(
  projectId: number
): Promise<ProjectAnalytics | null> {
  const stored = await getProjectAnalyticsUrl(projectId);
  const generatedAt = new Date().toISOString();
  if (!stored.url) {
    if (stored.error) {
      return { ok: false, host: stored.host, generatedAt, error: stored.error };
    }
    return null;
  }
  const url = stored.url;
  const host = connectionHost(url);

  try {
    const sql = poolFor(url);
    // Connectivity + table discovery is the only fatal step; everything after
    // degrades per section.
    const tables = await tableSet(sql);
    const has = (t: string) => tables.has(t);
    const notes: string[] = [];

    const hasUsers = has("public.users");
    const hasAudit = has("public.audit_logs");
    const hasBusinesses = has("public.businesses");
    const hasOrders = has("public.orders");
    const hasAuthUsers = has("auth.users");
    const hasSessions = has("auth.sessions");

    if (!hasUsers) notes.push("No public.users table — user metrics unavailable.");
    if (!hasAudit) notes.push("No public.audit_logs table — activity metrics unavailable.");

    // ---- Summary ------------------------------------------------------------
    const summary = {
      totalUsers: 0,
      activeUsers7d: 0,
      activeUsers30d: 0,
      newUsers30d: 0,
      businesses: null as number | null,
      totalOrders: null as number | null,
      orders30d: null as number | null,
      actions7d: null as number | null,
      actions30d: null as number | null,
      lastActivityAt: null as string | null,
    };

    if (hasUsers) await section("User totals", notes, undefined, async () => {
      const [u] = await sql<Record<string, unknown>[]>`
        select
          count(*)                                                            as total,
          count(*) filter (where last_active_at >= now() - interval '7 days')  as active7,
          count(*) filter (where last_active_at >= now() - interval '30 days') as active30,
          count(*) filter (where created_at     >= now() - interval '30 days') as new30
        from public.users
      `;
      summary.totalUsers = num(u.total);
      summary.activeUsers7d = num(u.active7);
      summary.activeUsers30d = num(u.active30);
      summary.newUsers30d = num(u.new30);
    });
    if (hasBusinesses) await section("Business count", notes, undefined, async () => {
      const [b] = await sql<Record<string, unknown>[]>`select count(*) as c from public.businesses`;
      summary.businesses = num(b.c);
    });
    if (hasOrders) await section("Order totals", notes, undefined, async () => {
      const [o] = await sql<Record<string, unknown>[]>`
        select count(*) as total,
               count(*) filter (where created_at >= now() - interval '30 days') as recent
        from public.orders
      `;
      summary.totalOrders = num(o.total);
      summary.orders30d = num(o.recent);
    });
    if (hasAudit) await section("Activity totals", notes, undefined, async () => {
      const [a] = await sql<Record<string, unknown>[]>`
        select count(*) filter (where created_at >= now() - interval '7 days')  as a7,
               count(*) filter (where created_at >= now() - interval '30 days') as a30,
               max(created_at) as last
        from public.audit_logs
      `;
      summary.actions7d = num(a.a7);
      summary.actions30d = num(a.a30);
      summary.lastActivityAt = iso(a.last);
    });

    // ---- Users --------------------------------------------------------------
    let users: AnalyticsUser[] = [];
    if (hasUsers) users = await section("User list", notes, [], async () => {
      const rows = await sql<Record<string, unknown>[]>`
        select
          u.id, u.name, u.email, u.role, u.created_at, u.last_active_at,
          ${hasBusinesses ? sql`b.name` : sql`null::text`} as business_name,
          ${hasBusinesses ? sql`b.id::text` : sql`null::text`} as business_id,
          ${
            hasAudit
              ? sql`
                (select a.action from public.audit_logs a where a.user_id = u.id
                   order by a.created_at desc limit 1) as last_action,
                (select a.created_at from public.audit_logs a where a.user_id = u.id
                   order by a.created_at desc limit 1) as last_action_at,
                (select count(*) from public.audit_logs a where a.user_id = u.id
                   and a.created_at >= now() - interval '30 days') as actions30,
                (select count(*) from public.audit_logs a where a.user_id = u.id) as actions_total`
              : sql`null::text as last_action, null::timestamp as last_action_at,
                    0 as actions30, 0 as actions_total`
          },
          ${
            hasAuthUsers && hasSessions
              ? sql`
                (select s.user_agent from auth.sessions s
                   join auth.users au on au.id = s.user_id
                  where lower(au.email) = lower(u.email)
                  order by coalesce(s.refreshed_at, s.created_at) desc limit 1) as last_user_agent,
                (select host(s.ip) from auth.sessions s
                   join auth.users au on au.id = s.user_id
                  where lower(au.email) = lower(u.email)
                  order by coalesce(s.refreshed_at, s.created_at) desc limit 1) as last_ip,
                (select au.last_sign_in_at from auth.users au
                  where lower(au.email) = lower(u.email) limit 1) as last_sign_in_at`
              : sql`null::text as last_user_agent, null::text as last_ip,
                    null::timestamptz as last_sign_in_at`
          }
        from public.users u
        ${hasBusinesses ? sql`left join public.businesses b on b.id = u.business_id` : sql``}
        order by u.last_active_at desc nulls last, u.created_at desc
        limit 200
      `;
      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        email: String(r.email ?? ""),
        role: String(r.role ?? ""),
        businessName: r.business_name == null ? null : String(r.business_name),
        businessId: r.business_id == null ? null : String(r.business_id),
        createdAt: iso(r.created_at),
        lastActiveAt: iso(r.last_active_at),
        lastSignInAt: iso(r.last_sign_in_at),
        lastAction: r.last_action == null ? null : String(r.last_action),
        lastActionAt: iso(r.last_action_at),
        actions30d: num(r.actions30),
        actionsTotal: num(r.actions_total),
        lastDevice: describeUserAgent(r.last_user_agent == null ? null : String(r.last_user_agent)),
        lastIp: r.last_ip == null ? null : String(r.last_ip),
      }));
    });

    // ---- Businesses (customers) -----------------------------------------------
    let businesses: AnalyticsBusiness[] = [];
    if (hasBusinesses) businesses = await section("Businesses", notes, [], async () => {
      const cols = new Set(
        (
          await sql<{ column_name: string }[]>`
            select column_name from information_schema.columns
            where table_schema = 'public' and table_name = 'businesses'
          `
        ).map((c) => c.column_name)
      );
      const col = (name: string) => (cols.has(name) ? sql(name) : sql`null::text`);
      const hasOrders = tables.has("public.orders");
      const rows = await sql<Record<string, unknown>[]>`
        select b.id::text as id, b.name,
               ${col("website_url")} as website_url,
               ${col("logo_url")} as logo_url,
               ${col("plan")} as plan,
               ${col("subscription_status")} as subscription_status,
               ${col("industry")} as industry,
               ${col("location")} as location,
               ${cols.has("created_at") ? sql`b.created_at` : sql`null::timestamptz`} as created_at,
               ${hasUsers
                 ? sql`(select count(*) from public.users u where u.business_id = b.id)`
                 : sql`0`} as user_count,
               ${hasUsers
                 ? sql`(select max(u.last_active_at) from public.users u where u.business_id = b.id)`
                 : sql`null::timestamptz`} as last_active_at,
               ${hasUsers
                 ? sql`(select min(split_part(u.email, '@', 2)) from public.users u
                         where u.business_id = b.id and split_part(u.email, '@', 2) <> '')`
                 : sql`null::text`} as email_domain,
               ${hasOrders
                 ? sql`(select count(*) from public.orders o where o.business_id = b.id)`
                 : sql`null::bigint`} as order_count,
               ${hasOrders
                 ? sql`(select count(*) from public.orders o where o.business_id = b.id
                         and o.created_at >= now() - interval '30 days')`
                 : sql`null::bigint`} as orders_30d
        from public.businesses b
        order by last_active_at desc nulls last, b.name
        limit 100
      `;
      return rows.map((r) => {
        const website = r.website_url == null ? null : String(r.website_url);
        const emailDomain = r.email_domain == null ? null : String(r.email_domain);
        return {
          id: String(r.id),
          name: String(r.name ?? "Unnamed business"),
          domain: companyDomain(website, emailDomain),
          logoUrl: r.logo_url == null || String(r.logo_url) === "" ? null : String(r.logo_url),
          plan: r.plan == null ? null : String(r.plan),
          subscriptionStatus: r.subscription_status == null ? null : String(r.subscription_status),
          industry: r.industry == null || String(r.industry) === "" ? null : String(r.industry),
          location: r.location == null || String(r.location) === "" ? null : String(r.location),
          createdAt: iso(r.created_at),
          userCount: num(r.user_count),
          orderCount: r.order_count == null ? null : num(r.order_count),
          orders30d: r.orders_30d == null ? null : num(r.orders_30d),
          lastActiveAt: iso(r.last_active_at),
        };
      });
    });

    // ---- Activity feed --------------------------------------------------------
    let recentActivity: AnalyticsActivity[] = [];
    let dailyActivity: AnalyticsDailyPoint[] = [];
    let topActions: AnalyticsActionCount[] = [];
    if (hasAudit) recentActivity = await section("Recent activity", notes, [], async () => {
      const feed = await sql<Record<string, unknown>[]>`
        select a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
               ${hasUsers ? sql`u.name` : sql`null::text`} as user_name,
               ${hasUsers ? sql`u.email` : sql`null::text`} as user_email,
               ${hasBusinesses ? sql`b.name` : sql`null::text`} as business_name
        from public.audit_logs a
        ${hasUsers ? sql`left join public.users u on u.id = a.user_id` : sql``}
        ${hasBusinesses ? sql`left join public.businesses b on b.id = a.business_id` : sql``}
        order by a.created_at desc
        limit 40
      `;
      return feed.map((r) => ({
        id: String(r.id),
        at: iso(r.created_at) ?? generatedAt,
        userName: r.user_name == null ? null : String(r.user_name),
        userEmail: r.user_email == null ? null : String(r.user_email),
        businessName: r.business_name == null ? null : String(r.business_name),
        action: String(r.action ?? ""),
        entityType: String(r.entity_type ?? ""),
        detail: summarizeMetadata(r.metadata),
      }));
    });
    if (hasAudit) dailyActivity = await section("Daily activity", notes, [], async () => {
      const daily = await sql<Record<string, unknown>[]>`
        with days as (
          select generate_series(
            (now() at time zone 'utc')::date - interval '13 days',
            (now() at time zone 'utc')::date,
            interval '1 day'
          )::date as day
        )
        select d.day::text as day,
               coalesce(count(a.id), 0) as actions,
               count(distinct a.user_id) as users
        from days d
        left join public.audit_logs a on a.created_at::date = d.day
        group by d.day
        order by d.day
      `;
      return daily.map((r) => ({
        day: String(r.day),
        actions: num(r.actions),
        users: num(r.users),
      }));
    });
    if (hasAudit) topActions = await section("Top actions", notes, [], async () => {
      const top = await sql<Record<string, unknown>[]>`
        select action, count(*) as c
        from public.audit_logs
        where created_at >= now() - interval '30 days'
        group by action
        order by c desc
        limit 8
      `;
      return top.map((r) => ({ action: String(r.action), count: num(r.c) }));
    });

    return {
      ok: true,
      host,
      generatedAt,
      notes,
      summary,
      users,
      businesses,
      recentActivity,
      dailyActivity,
      topActions,
    };
  } catch (err) {
    console.error("[analytics] project", projectId, "host", host, err);
    return { ok: false, host, generatedAt, error: describeDbError(err) };
  }
}

export type ProjectUsageSnapshot =
  | { ok: true; totalUsers: number; activeUsers7d: number; lastActivityAt: string | null }
  | { ok: false; error: string };

/**
 * Cheap headline numbers for list cards. One round-trip per project, capped
 * at `timeoutMs` so a paused database can't stall the Projects page.
 */
export async function getProjectUsageSnapshot(
  projectId: number,
  timeoutMs = 4000
): Promise<ProjectUsageSnapshot | null> {
  const stored = await getProjectAnalyticsUrl(projectId);
  if (!stored.url) return stored.error ? { ok: false, error: stored.error } : null;
  const url = stored.url;
  const work = (async (): Promise<ProjectUsageSnapshot> => {
    const sql = poolFor(url);
    const tables = await tableSet(sql);
    const hasUsers = tables.has("public.users");
    const hasAudit = tables.has("public.audit_logs");
    const [r] = await sql<Record<string, unknown>[]>`
      select
        ${hasUsers ? sql`(select count(*) from public.users)` : sql`0`} as total,
        ${hasUsers
          ? sql`(select count(*) from public.users where last_active_at >= now() - interval '7 days')`
          : sql`0`} as active7,
        ${hasAudit ? sql`(select max(created_at) from public.audit_logs)` : sql`null`} as last
    `;
    return {
      ok: true,
      totalUsers: Number(r.total ?? 0),
      activeUsers7d: Number(r.active7 ?? 0),
      lastActivityAt: r.last == null ? null : new Date(r.last as string).toISOString(),
    };
  })();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<ProjectUsageSnapshot>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, error: "Connection timed out." }), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } catch (err) {
    console.error("[analytics] snapshot for project", projectId, err);
    return { ok: false, error: describeDbError(err) };
  } finally {
    clearTimeout(timer);
  }
}

const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com",
  "icloud.com", "me.com", "protonmail.com", "proton.me", "aol.com", "mail.com", "webmail.co.za",
]);

/** Pick the best domain for a company icon: website first, else a non-free-mail email domain. */
export function companyDomain(website: string | null, emailDomain: string | null): string | null {
  if (website) {
    const raw = website.trim();
    if (raw) {
      try {
        const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname
          .toLowerCase()
          .replace(/^www\./, "");
        if (host.includes(".")) return host;
      } catch {
        /* fall through */
      }
    }
  }
  if (emailDomain) {
    const d = emailDomain.toLowerCase().trim();
    if (d.includes(".") && !FREE_MAIL.has(d)) return d;
  }
  return null;
}

function describeUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /PowerShell/i.test(ua)
              ? "PowerShell"
              : "Browser";
  return `${browser} · ${os}`;
}

function summarizeMetadata(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const m = meta as Record<string, unknown>;
  const picks = [
    "trackingId",
    "jobNumber",
    "invoiceNumber",
    "orderReference",
    "newStatus",
    "fullName",
    "name",
  ];
  const parts: string[] = [];
  for (const k of picks) {
    const v = m[k];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
    if (parts.length >= 2) break;
  }
  return parts.join(" · ");
}

/** "UPDATE_ORDER_STATUS" → "Updated order status" */
export function humanizeAction(action: string): string {
  const words = action.toLowerCase().split("_").filter(Boolean);
  if (words.length === 0) return action;
  const verbMap: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    set: "Set",
    send: "Sent",
    resend: "Resent",
    confirm: "Confirmed",
    auto: "Auto",
    login: "Logged in",
    logout: "Logged out",
  };
  const [first, ...rest] = words;
  const verb = verbMap[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
  return [verb, ...rest].join(" ");
}
