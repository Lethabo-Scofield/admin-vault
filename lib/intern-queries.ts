import { getSql, ensureSchema } from "@/lib/db";
import { requireSuperAdmin, requireUser } from "@/lib/session";
import type {
  Intern,
  InternCredential,
  InternDocument,
  InternProject,
  InternTask,
} from "@/lib/types";

async function db() {
  await ensureSchema();
  return getSql();
}

const INTERN_COLUMNS = `
  i.id,
  i.intern_number             as "internNumber",
  i.full_name                 as "fullName",
  i.email,
  i.pronouns,
  i.position,
  i.department,
  i.start_date::text          as "startDate",
  i.completion_date::text     as "completionDate",
  i.employment_status         as "employmentStatus",
  i.projects_completed        as "projectsCompleted",
  i.responsibilities,
  i.skills_demonstrated       as "skillsDemonstrated",
  i.supervisor_name           as "supervisorName",
  i.supervisor_recommendation as "supervisorRecommendation",
  i.internal_notes            as "internalNotes",
  i.created_at                as "createdAt",
  i.updated_at                as "updatedAt",
  i.archived_at               as "archivedAt",
  i.planned_end_date::text    as "plannedEndDate",
  i.project_goal              as "projectGoal",
  (select count(*) from intern_projects p
     where p.intern_id = i.id and p.status = 'COMPLETED')::int as "projectsDone"
`;

export type InternStatusFilter = "active" | "completed" | "all";

export async function getInterns(opts?: {
  search?: string;
  includeArchived?: boolean;
  status?: InternStatusFilter;
}): Promise<Intern[]> {
  await requireUser();
  const sql = await db();
  const search = (opts?.search ?? "").trim();
  const like = `%${search}%`;
  const status = opts?.status ?? "all";
  const rows = await sql.unsafe<
    (Intern & { credentialCount: string; documentCount: string })[]
  >(
    `
    select ${INTERN_COLUMNS},
      (select count(*) from intern_credentials c where c.intern_id = i.id) as "credentialCount",
      (select count(*) from intern_documents d where d.intern_id = i.id) as "documentCount"
    from interns i
    where ($1 = '' or i.full_name ilike $2 or i.intern_number ilike $2
           or i.position ilike $2 or i.department ilike $2)
      and ($3 or i.archived_at is null)
      and ($4 = 'all'
           or ($4 = 'active'    and lower(i.employment_status) = 'active')
           or ($4 = 'completed' and lower(i.employment_status) = 'completed'))
    order by (lower(i.employment_status) = 'active') desc, i.intern_number desc
    `,
    [search, like, Boolean(opts?.includeArchived), status]
  );
  return rows.map((r) => ({
    ...r,
    credentialCount: Number(r.credentialCount),
    documentCount: Number(r.documentCount),
  }));
}

/** Roster counts for the list-page filter pills (non-archived interns). */
export async function getInternCounts(): Promise<{
  active: number;
  completed: number;
  all: number;
}> {
  await requireUser();
  const sql = await db();
  const [row] = await sql<{ active: number; completed: number; all: number }[]>`
    select
      count(*) filter (where lower(employment_status) = 'active')::int  as active,
      count(*) filter (where lower(employment_status) = 'completed')::int as completed,
      count(*)::int as all
    from interns where archived_at is null
  `;
  return row;
}

export async function getIntern(id: number): Promise<Intern | null> {
  await requireUser();
  const sql = await db();
  const rows = await sql.unsafe<Intern[]>(
    `select ${INTERN_COLUMNS} from interns i where i.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getInternTasks(internId: number): Promise<InternTask[]> {
  await requireUser();
  const sql = await db();
  return sql<InternTask[]>`
    select id,
           intern_id   as "internId",
           title,
           description,
           status,
           pr_link     as "prLink",
           review_note as "reviewNote",
           assigned_by as "assignedBy",
           due_date::text as "dueDate",
           created_at  as "createdAt",
           updated_at  as "updatedAt"
    from intern_tasks
    where intern_id = ${internId}
    order by (status = 'APPROVED'), created_at desc
  `;
}

const CREDENTIAL_COLUMNS = `
  c.id,
  c.intern_id             as "internId",
  i.full_name             as "internName",
  i.intern_number         as "internNumber",
  i.supervisor_name       as "supervisorName",
  c.credential_number     as "credentialNumber",
  c.verification_token    as "verificationToken",
  c.programme_title       as "programmeTitle",
  c.position,
  c.start_date::text      as "startDate",
  c.completion_date::text as "completionDate",
  c.projects_completed    as "projectsCompleted",
  c.skills_demonstrated   as "skillsDemonstrated",
  c.public_recommendation as "publicRecommendation",
  i.email                 as "internEmail",
  c.department,
  c.pronouns,
  c.responsibilities,
  c.founder_name          as "founderName",
  c.founder_title         as "founderTitle",
  c.founder_recommendation as "founderRecommendation",
  c.manager_name          as "managerName",
  c.manager_title         as "managerTitle",
  c.manager_recommendation as "managerRecommendation",
  c.email_sent_at         as "emailSentAt",
  c.email_sent_to         as "emailSentTo",
  (c.certificate_pdf is not null) as "hasCertificatePdf",
  (c.letter_pdf is not null)      as "hasLetterPdf",
  c.issue_date::text      as "issueDate",
  c.status,
  c.published_at          as "publishedAt",
  c.revoked_at            as "revokedAt",
  c.revocation_reason     as "revocationReason",
  c.created_by            as "createdBy",
  c.updated_by            as "updatedBy",
  c.created_at            as "createdAt",
  c.updated_at            as "updatedAt"
`;

export async function getInternCredentials(opts?: {
  internId?: number;
}): Promise<InternCredential[]> {
  await requireSuperAdmin();
  const sql = await db();
  return sql.unsafe<InternCredential[]>(
    `
    select ${CREDENTIAL_COLUMNS}
    from intern_credentials c
    join interns i on i.id = c.intern_id
    where ($1::int is null or c.intern_id = $1)
    order by c.credential_number desc
    `,
    [opts?.internId ?? null]
  );
}

/**
 * INTERNAL — no auth check. Only for server-side maintenance paths (e.g.
 * regenerating documents after credential renumbering). Never expose to
 * request-controlled input without an auth check upstream.
 */
export async function getInternCredentialInternal(
  id: number
): Promise<InternCredential | null> {
  const sql = await db();
  const rows = await sql.unsafe<InternCredential[]>(
    `
    select ${CREDENTIAL_COLUMNS}
    from intern_credentials c
    join interns i on i.id = c.intern_id
    where c.id = $1
    `,
    [id]
  );
  return rows[0] ?? null;
}

export async function getInternCredential(
  id: number
): Promise<InternCredential | null> {
  await requireSuperAdmin();
  const sql = await db();
  const rows = await sql.unsafe<InternCredential[]>(
    `
    select ${CREDENTIAL_COLUMNS}
    from intern_credentials c
    join interns i on i.id = c.intern_id
    where c.id = $1
    `,
    [id]
  );
  return rows[0] ?? null;
}

/** Public verification lookup — NO auth. Returns only public-safe fields. */
export async function getPublicCredentialByToken(token: string): Promise<{
  status: string;
  credentialNumber: string;
  fullName?: string;
  programmeTitle?: string;
  position?: string;
  startDate?: string | null;
  completionDate?: string | null;
  projectsCompleted?: string;
  skillsDemonstrated?: string;
  publicRecommendation?: string;
  supervisorName?: string;
  department?: string;
  responsibilities?: string;
  founderRecommendation?: string;
  managerRecommendation?: string;
  founderName?: string;
  founderTitle?: string;
  managerName?: string;
  managerTitle?: string;
  hasCertificatePdf?: boolean;
  hasLetterPdf?: boolean;
  hasCertificatePreview?: boolean;
  issueDate?: string | null;
} | null> {
  if (!token || token.length > 128) return null;
  const sql = await db();
  const rows = await sql<
    {
      status: string;
      credentialNumber: string;
      fullName: string;
      programmeTitle: string;
      position: string;
      startDate: string | null;
      completionDate: string | null;
      projectsCompleted: string;
      skillsDemonstrated: string;
      publicRecommendation: string;
      supervisorName: string;
      department: string;
      responsibilities: string;
      founderRecommendation: string;
      managerRecommendation: string;
      founderName: string;
      founderTitle: string;
      managerName: string;
      managerTitle: string;
      hasCertificatePdf: boolean;
      hasLetterPdf: boolean;
      hasCertificatePreview: boolean;
      issueDate: string | null;
    }[]
  >`
    select
      c.status,
      c.credential_number     as "credentialNumber",
      i.full_name             as "fullName",
      c.programme_title       as "programmeTitle",
      c.position,
      c.start_date::text      as "startDate",
      c.completion_date::text as "completionDate",
      c.projects_completed    as "projectsCompleted",
      c.skills_demonstrated   as "skillsDemonstrated",
      c.public_recommendation as "publicRecommendation",
      i.supervisor_name       as "supervisorName",
      c.department,
      c.responsibilities,
      c.founder_recommendation as "founderRecommendation",
      c.manager_recommendation as "managerRecommendation",
      c.founder_name          as "founderName",
      c.founder_title         as "founderTitle",
      c.manager_name          as "managerName",
      c.manager_title         as "managerTitle",
      (c.certificate_pdf is not null) as "hasCertificatePdf",
      (c.letter_pdf is not null)      as "hasLetterPdf",
      (c.certificate_preview_png is not null) as "hasCertificatePreview",
      c.issue_date::text      as "issueDate"
    from intern_credentials c
    join interns i on i.id = c.intern_id
    where c.verification_token = ${token}
      and c.status in ('PUBLISHED', 'REVOKED', 'EXPIRED')
  `;
  const row = rows[0];
  if (!row) return null;
  if (row.status !== "PUBLISHED") {
    // Revoked/expired: expose only status + number.
    return { status: row.status, credentialNumber: row.credentialNumber };
  }
  return row;
}

/** Stored PDFs for a credential (super-admin). */
export async function getCredentialPdfs(id: number): Promise<{
  certificatePdf: Buffer | null;
  letterPdf: Buffer | null;
} | null> {
  await requireSuperAdmin();
  const sql = await db();
  const rows = await sql<
    { certificatePdf: Buffer | null; letterPdf: Buffer | null }[]
  >`
    select certificate_pdf as "certificatePdf", letter_pdf as "letterPdf"
    from intern_credentials where id = ${id}
  `;
  return rows[0] ?? null;
}

/** Stored certificate preview PNG for a PUBLISHED credential — public. */
export async function getPublicCertificatePreviewByToken(
  token: string
): Promise<Buffer | null> {
  if (!token || token.length > 128) return null;
  const sql = await db();
  const rows = await sql<{ png: Buffer | null }[]>`
    select certificate_preview_png as "png"
    from intern_credentials
    where verification_token = ${token} and status = 'PUBLISHED'
  `;
  return rows[0]?.png ?? null;
}

/** Stored PDFs for a PUBLISHED credential looked up by token — public. */
export async function getPublicCredentialPdfsByToken(token: string): Promise<{
  fullName: string;
  position: string;
  certificatePdf: Buffer | null;
  letterPdf: Buffer | null;
} | null> {
  if (!token || token.length > 128) return null;
  const sql = await db();
  const rows = await sql<
    {
      fullName: string;
      position: string;
      certificatePdf: Buffer | null;
      letterPdf: Buffer | null;
    }[]
  >`
    select i.full_name as "fullName", c.position,
           c.certificate_pdf as "certificatePdf", c.letter_pdf as "letterPdf"
    from intern_credentials c
    join interns i on i.id = c.intern_id
    where c.verification_token = ${token} and c.status = 'PUBLISHED'
  `;
  return rows[0] ?? null;
}

export async function getInternProjects(internId: number): Promise<InternProject[]> {
  await requireUser();
  const sql = await db();
  return sql<InternProject[]>`
    select id,
           intern_id         as "internId",
           title,
           description,
           link,
           status,
           started_at::text   as "startedAt",
           completed_at::text as "completedAt",
           created_by        as "createdBy",
           created_at        as "createdAt",
           updated_at        as "updatedAt"
    from intern_projects
    where intern_id = ${internId}
    order by (status = 'COMPLETED'), coalesce(completed_at, started_at, created_at::date) desc, id desc
  `;
}

export async function getInternDocuments(internId: number): Promise<InternDocument[]> {
  await requireUser();
  const sql = await db();
  return sql<InternDocument[]>`
    select id,
           intern_id   as "internId",
           kind,
           file_name   as "fileName",
           mime_type   as "mimeType",
           size_bytes  as "sizeBytes",
           sha256,
           note,
           uploaded_by as "uploadedBy",
           uploaded_at as "uploadedAt"
    from intern_documents
    where intern_id = ${internId}
    order by uploaded_at desc
  `;
}

/** Full document including bytes — only for the authenticated download route. */
export async function getInternDocumentContent(
  internId: number,
  documentId: number
): Promise<(InternDocument & { content: Uint8Array }) | null> {
  await requireUser();
  const sql = await db();
  const rows = await sql<(InternDocument & { content: Uint8Array })[]>`
    select id,
           intern_id   as "internId",
           kind,
           file_name   as "fileName",
           mime_type   as "mimeType",
           size_bytes  as "sizeBytes",
           sha256,
           note,
           uploaded_by as "uploadedBy",
           uploaded_at as "uploadedAt",
           content
    from intern_documents
    where id = ${documentId} and intern_id = ${internId}
  `;
  return rows[0] ?? null;
}
