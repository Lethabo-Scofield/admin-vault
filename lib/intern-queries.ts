import { getSql, ensureSchema } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import type { Intern, InternCredential } from "@/lib/types";

async function db() {
  await ensureSchema();
  return getSql();
}

const INTERN_COLUMNS = `
  i.id,
  i.intern_number             as "internNumber",
  i.full_name                 as "fullName",
  i.position,
  i.department,
  i.start_date                as "startDate",
  i.completion_date           as "completionDate",
  i.employment_status         as "employmentStatus",
  i.projects_completed        as "projectsCompleted",
  i.responsibilities,
  i.skills_demonstrated       as "skillsDemonstrated",
  i.supervisor_name           as "supervisorName",
  i.supervisor_recommendation as "supervisorRecommendation",
  i.internal_notes            as "internalNotes",
  i.created_at                as "createdAt",
  i.updated_at                as "updatedAt",
  i.archived_at               as "archivedAt"
`;

export async function getInterns(opts?: {
  search?: string;
  includeArchived?: boolean;
}): Promise<Intern[]> {
  await requireSuperAdmin();
  const sql = await db();
  const search = (opts?.search ?? "").trim();
  const like = `%${search}%`;
  const rows = await sql.unsafe<(Intern & { credentialCount: string })[]>(
    `
    select ${INTERN_COLUMNS},
      (select count(*) from intern_credentials c where c.intern_id = i.id) as "credentialCount"
    from interns i
    where ($1 = '' or i.full_name ilike $2 or i.intern_number ilike $2
           or i.position ilike $2 or i.department ilike $2)
      and ($3 or i.archived_at is null)
    order by i.intern_number desc
    `,
    [search, like, Boolean(opts?.includeArchived)]
  );
  return rows.map((r) => ({ ...r, credentialCount: Number(r.credentialCount) }));
}

export async function getIntern(id: number): Promise<Intern | null> {
  await requireSuperAdmin();
  const sql = await db();
  const rows = await sql.unsafe<Intern[]>(
    `select ${INTERN_COLUMNS} from interns i where i.id = $1`,
    [id]
  );
  return rows[0] ?? null;
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
  c.start_date            as "startDate",
  c.completion_date       as "completionDate",
  c.projects_completed    as "projectsCompleted",
  c.skills_demonstrated   as "skillsDemonstrated",
  c.public_recommendation as "publicRecommendation",
  c.issue_date            as "issueDate",
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
      issueDate: string | null;
    }[]
  >`
    select
      c.status,
      c.credential_number     as "credentialNumber",
      i.full_name             as "fullName",
      c.programme_title       as "programmeTitle",
      c.position,
      c.start_date            as "startDate",
      c.completion_date       as "completionDate",
      c.projects_completed    as "projectsCompleted",
      c.skills_demonstrated   as "skillsDemonstrated",
      c.public_recommendation as "publicRecommendation",
      i.supervisor_name       as "supervisorName",
      c.issue_date            as "issueDate"
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
