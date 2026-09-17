import { getSql, ensureSchema } from "@/lib/db";
import type {
  AuditLog,
  ComplianceDocument,
  DashboardStats,
  Project,
  VaultCredential,
} from "@/lib/types";
import { requirePermission, requireSuperAdmin, requireUser } from "@/lib/session";

async function db() {
  await ensureSchema();
  return getSql();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireUser();
  const sql = await db();
  const [row] = await sql<
    {
      totalProjects: string;
      totalCredentials: string;
      activeApiKeys: string;
      complianceDocuments: string;
      auditTriggers24h: string;
      unauthorizedAttempts24h: string;
    }[]
  >`
    select
      case when ${user.permissions.includes("MANAGE_PROJECTS")} then (select count(*) from projects) else 0 end as "totalProjects",
      case when ${user.permissions.includes("MANAGE_PROJECTS")} then (select count(*) from credentials) else 0 end as "totalCredentials",
      case when ${user.permissions.includes("MANAGE_PROJECTS")} then (select count(*) from credentials where status = 'Active') else 0 end as "activeApiKeys",
      case when ${user.roleKey === "SUPER_ADMIN"} then (select count(*) from documents) else 0 end as "complianceDocuments",
      case when ${user.roleKey === "SUPER_ADMIN"} then (select count(*) from audit_logs where timestamp >= now() - interval '24 hours') else 0 end as "auditTriggers24h",
      case when ${user.roleKey === "SUPER_ADMIN"} then (select count(*) from audit_logs where timestamp >= now() - interval '24 hours' and status <> 'SUCCESS') else 0 end as "unauthorizedAttempts24h"
  `;
  return {
    totalProjects: Number(row.totalProjects),
    totalCredentials: Number(row.totalCredentials),
    activeApiKeys: Number(row.activeApiKeys),
    complianceDocuments: Number(row.complianceDocuments),
    auditTriggers24h: Number(row.auditTriggers24h),
    unauthorizedAttempts24h: Number(row.unauthorizedAttempts24h),
  };
}

export async function getProjects(): Promise<Project[]> {
  await requirePermission("MANAGE_PROJECTS");
  const sql = await db();
  const rows = await sql<
    {
      id: number;
      name: string;
      category: string;
      description: string;
      logoUrl: string;
      createdAt: string;
      keyCount: string;
      docCount: string;
      hasAnalyticsDb: boolean;
      analyticsDbHost: string;
      status: "ACTIVE" | "SUSPENDED";
      suspendedAt: string | null;
    }[]
  >`
    select
      p.id,
      p.name,
      p.category,
      p.description,
      p.logo_url   as "logoUrl",
      p.created_at as "createdAt",
      (p.analytics_db_url_enc <> '') as "hasAnalyticsDb",
      p.analytics_db_host as "analyticsDbHost",
      p.status,
      p.suspended_at as "suspendedAt",
      (select count(*) from credentials c where c.project_id = p.id) as "keyCount",
      (select count(*) from documents d where d.project_id = p.id)   as "docCount"
    from projects p
    order by p.created_at desc
  `;
  return rows.map((r) => ({
    ...r,
    keyCount: Number(r.keyCount),
    docCount: Number(r.docCount),
  }));
}

export async function getProject(id: number): Promise<Project | null> {
  await requirePermission("MANAGE_PROJECTS");
  const sql = await db();
  const rows = await sql<
    {
      id: number;
      name: string;
      category: string;
      description: string;
      logoUrl: string;
      createdAt: string;
      keyCount: string;
      docCount: string;
      hasAnalyticsDb: boolean;
      analyticsDbHost: string;
      status: "ACTIVE" | "SUSPENDED";
      suspendedAt: string | null;
    }[]
  >`
    select
      p.id,
      p.name,
      p.category,
      p.description,
      p.logo_url   as "logoUrl",
      p.created_at as "createdAt",
      (p.analytics_db_url_enc <> '') as "hasAnalyticsDb",
      p.analytics_db_host as "analyticsDbHost",
      p.status,
      p.suspended_at as "suspendedAt",
      (select count(*) from credentials c where c.project_id = p.id) as "keyCount",
      (select count(*) from documents d where d.project_id = p.id)   as "docCount"
    from projects p
    where p.id = ${id}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, keyCount: Number(r.keyCount), docCount: Number(r.docCount) };
}

export async function getCredentials(): Promise<VaultCredential[]> {
  await requirePermission("MANAGE_PROJECTS");
  const sql = await db();
  return sql<VaultCredential[]>`
    select
      c.id,
      c.project_id   as "projectId",
      p.name         as "projectName",
      c.service_name as "serviceName",
      c.environment,
      c.secret_value as "secretValue",
      c.owner_email  as "ownerEmail",
      c.department,
      c.status,
      c.created_at   as "createdAt",
      p.status       as "projectStatus"
    from credentials c
    left join projects p on p.id = c.project_id
    order by c.created_at desc
  `;
}

export async function getCredentialsByProject(
  projectId: number
): Promise<VaultCredential[]> {
  await requirePermission("MANAGE_PROJECTS");
  const sql = await db();
  return sql<VaultCredential[]>`
    select
      c.id,
      c.project_id   as "projectId",
      p.name         as "projectName",
      c.service_name as "serviceName",
      c.environment,
      c.secret_value as "secretValue",
      c.owner_email  as "ownerEmail",
      c.department,
      c.status,
      c.created_at   as "createdAt",
      p.status       as "projectStatus"
    from credentials c
    left join projects p on p.id = c.project_id
    where c.project_id = ${projectId}
    order by c.created_at desc
  `;
}

export async function getDocuments(): Promise<ComplianceDocument[]> {
  await requireSuperAdmin();
  const sql = await db();
  return sql<ComplianceDocument[]>`
    select
      d.id,
      d.project_id      as "projectId",
      p.name            as "projectName",
      d.file_name       as "fileName",
      d.file_size_bytes as "fileSizeBytes",
      d.sha256,
      d.uploaded_at     as "uploadedAt",
      d.uploaded_by     as "uploadedBy",
      d.classification,
      d.mime_type       as "mimeType",
      (d.content is not null) as "hasContent"
    from documents d
    left join projects p on p.id = d.project_id
    order by d.uploaded_at desc
  `;
}

export async function getDocumentsByProject(
  projectId: number
): Promise<ComplianceDocument[]> {
  await requireSuperAdmin();
  const sql = await db();
  return sql<ComplianceDocument[]>`
    select
      d.id,
      d.project_id      as "projectId",
      p.name            as "projectName",
      d.file_name       as "fileName",
      d.file_size_bytes as "fileSizeBytes",
      d.sha256,
      d.uploaded_at     as "uploadedAt",
      d.uploaded_by     as "uploadedBy",
      d.classification,
      d.mime_type       as "mimeType",
      (d.content is not null) as "hasContent"
    from documents d
    left join projects p on p.id = d.project_id
    where d.project_id = ${projectId}
    order by d.uploaded_at desc
  `;
}

export async function getDocumentContent(id: number): Promise<{
  fileName: string;
  mimeType: string;
  content: Uint8Array;
} | null> {
  await requireSuperAdmin();
  const sql = await db();
  const rows = await sql<{ fileName: string; mimeType: string; content: Uint8Array }[]>`
    select file_name as "fileName", mime_type as "mimeType", content
    from documents
    where id = ${id} and content is not null
  `;
  return rows[0] ?? null;
}

export async function getAuditLogs(limit = 200): Promise<AuditLog[]> {
  await requireSuperAdmin();
  const sql = await db();
  return sql<AuditLog[]>`
    select
      id,
      timestamp,
      action,
      actor_email as "actorEmail",
      actor_role  as "actorRole",
      ip_address  as "ipAddress",
      status
    from audit_logs
    order by timestamp desc
    limit ${limit}
  `;
}
