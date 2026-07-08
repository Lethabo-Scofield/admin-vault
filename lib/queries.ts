import { getSql, ensureSchema } from "@/lib/db";
import type {
  AuditLog,
  ComplianceDocument,
  DashboardStats,
  Project,
  VaultCredential,
} from "@/lib/types";

async function db() {
  await ensureSchema();
  return getSql();
}

export async function getDashboardStats(): Promise<DashboardStats> {
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
      (select count(*) from projects)                                          as "totalProjects",
      (select count(*) from credentials)                                       as "totalCredentials",
      (select count(*) from credentials where status = 'Active')               as "activeApiKeys",
      (select count(*) from documents)                                         as "complianceDocuments",
      (select count(*) from audit_logs where timestamp >= now() - interval '24 hours')                          as "auditTriggers24h",
      (select count(*) from audit_logs where timestamp >= now() - interval '24 hours' and status <> 'SUCCESS')  as "unauthorizedAttempts24h"
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
    }[]
  >`
    select
      p.id,
      p.name,
      p.category,
      p.description,
      p.logo_url   as "logoUrl",
      p.created_at as "createdAt",
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
    }[]
  >`
    select
      p.id,
      p.name,
      p.category,
      p.description,
      p.logo_url   as "logoUrl",
      p.created_at as "createdAt",
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
      c.created_at   as "createdAt"
    from credentials c
    left join projects p on p.id = c.project_id
    order by c.created_at desc
  `;
}

export async function getCredentialsByProject(
  projectId: number
): Promise<VaultCredential[]> {
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
      c.created_at   as "createdAt"
    from credentials c
    left join projects p on p.id = c.project_id
    where c.project_id = ${projectId}
    order by c.created_at desc
  `;
}

export async function getDocuments(): Promise<ComplianceDocument[]> {
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
      d.classification
    from documents d
    left join projects p on p.id = d.project_id
    order by d.uploaded_at desc
  `;
}

export async function getDocumentsByProject(
  projectId: number
): Promise<ComplianceDocument[]> {
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
      d.classification
    from documents d
    left join projects p on p.id = d.project_id
    where d.project_id = ${projectId}
    order by d.uploaded_at desc
  `;
}

export async function getAuditLogs(limit = 200): Promise<AuditLog[]> {
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
