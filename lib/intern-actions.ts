"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TransactionSql } from "postgres";
import { getSql, ensureSchema } from "@/lib/db";
import { requireSuperAdmin, type CurrentUser } from "@/lib/session";

type Tx = TransactionSql<Record<string, never>>;

async function db() {
  await ensureSchema();
  return getSql();
}

async function writeAudit(
  tx: Tx,
  actor: CurrentUser,
  action: string,
  status: string = "SUCCESS"
): Promise<void> {
  await tx`
    insert into audit_logs (action, actor_email, actor_role, ip_address, status)
    values (${action}, ${actor.email}, ${actor.role}, ${"10.0.0.1"}, ${status})
  `;
}

/** Atomically allocate the next number for a named counter. Never reuses values. */
async function nextCounter(tx: Tx, name: string): Promise<number> {
  const [row] = await tx<{ value: number }[]>`
    insert into number_counters (name, value) values (${name}, 1)
    on conflict (name) do update set value = number_counters.value + 1
    returning value
  `;
  return row.value;
}

function dateOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function text(formData: FormData, key: string, max = 5000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

// ---------------------------------------------------------------------------
// Interns
// ---------------------------------------------------------------------------

export async function createIntern(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const fullName = text(formData, "fullName", 200);
  if (!fullName) return;

  const sql = await db();
  let internId = 0;
  await sql.begin(async (tx) => {
    const n = await nextCounter(tx, "intern");
    const internNumber = `OLX-INT-${String(n).padStart(4, "0")}`;
    const [row] = await tx<{ id: number }[]>`
      insert into interns
        (intern_number, full_name, position, department, start_date, completion_date,
         employment_status, projects_completed, responsibilities, skills_demonstrated,
         supervisor_name, supervisor_recommendation, internal_notes)
      values
        (${internNumber}, ${fullName}, ${text(formData, "position", 200)},
         ${text(formData, "department", 200)}, ${dateOrNull(formData.get("startDate"))},
         ${dateOrNull(formData.get("completionDate"))},
         ${text(formData, "employmentStatus", 50) || "Active"},
         ${text(formData, "projectsCompleted")}, ${text(formData, "responsibilities")},
         ${text(formData, "skillsDemonstrated")}, ${text(formData, "supervisorName", 200)},
         ${text(formData, "supervisorRecommendation")}, ${text(formData, "internalNotes")})
      returning id
    `;
    internId = row.id;
    await writeAudit(tx, user, `Created intern ${internNumber} ("${fullName}")`);
  });

  revalidatePath("/interns");
  revalidatePath("/audit-logs");
  redirect(`/interns/${internId}`);
}

export async function updateIntern(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const internId = Number(formData.get("internId"));
  const fullName = text(formData, "fullName", 200);
  if (!internId || !fullName) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ internNumber: string }[]>`
      update interns set
        full_name = ${fullName},
        position = ${text(formData, "position", 200)},
        department = ${text(formData, "department", 200)},
        start_date = ${dateOrNull(formData.get("startDate"))},
        completion_date = ${dateOrNull(formData.get("completionDate"))},
        employment_status = ${text(formData, "employmentStatus", 50) || "Active"},
        projects_completed = ${text(formData, "projectsCompleted")},
        responsibilities = ${text(formData, "responsibilities")},
        skills_demonstrated = ${text(formData, "skillsDemonstrated")},
        supervisor_name = ${text(formData, "supervisorName", 200)},
        supervisor_recommendation = ${text(formData, "supervisorRecommendation")},
        internal_notes = ${text(formData, "internalNotes")},
        updated_at = now()
      where id = ${internId}
      returning intern_number as "internNumber"
    `;
    if (rows.length > 0) {
      await writeAudit(tx, user, `Updated intern ${rows[0].internNumber}`);
    }
  });

  revalidatePath("/interns");
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/audit-logs");
}

export async function archiveIntern(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const internId = Number(formData.get("internId"));
  const unarchive = formData.get("unarchive") === "on";
  if (!internId) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ internNumber: string }[]>`
      update interns
      set archived_at = ${unarchive ? null : new Date()}, updated_at = now()
      where id = ${internId}
      returning intern_number as "internNumber"
    `;
    if (rows.length > 0) {
      await writeAudit(
        tx,
        user,
        `${unarchive ? "Unarchived" : "Archived"} intern ${rows[0].internNumber}`
      );
    }
  });

  revalidatePath("/interns");
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/audit-logs");
}

// ---------------------------------------------------------------------------
// Internship credentials
// ---------------------------------------------------------------------------

function credentialFields(formData: FormData) {
  return {
    programmeTitle: text(formData, "programmeTitle", 300),
    position: text(formData, "position", 200),
    startDate: dateOrNull(formData.get("startDate")),
    completionDate: dateOrNull(formData.get("completionDate")),
    projectsCompleted: text(formData, "projectsCompleted"),
    skillsDemonstrated: text(formData, "skillsDemonstrated"),
    publicRecommendation: text(formData, "publicRecommendation"),
  };
}

export async function createInternCredential(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const internId = Number(formData.get("internId"));
  const f = credentialFields(formData);
  if (!internId || !f.programmeTitle) return;

  const sql = await db();
  let credentialId = 0;
  await sql.begin(async (tx) => {
    const year = new Date().getFullYear();
    const n = await nextCounter(tx, `cert-${year}`);
    const credentialNumber = `OLX-CERT-${year}-${String(n).padStart(4, "0")}`;
    // Secure random, non-sequential, not derived from any personal data.
    const token = randomBytes(9).toString("base64url");
    const [row] = await tx<{ id: number }[]>`
      insert into intern_credentials
        (intern_id, credential_number, verification_token, programme_title, position,
         start_date, completion_date, projects_completed, skills_demonstrated,
         public_recommendation, status, created_by, updated_by)
      values
        (${internId}, ${credentialNumber}, ${token}, ${f.programmeTitle}, ${f.position},
         ${f.startDate}, ${f.completionDate}, ${f.projectsCompleted},
         ${f.skillsDemonstrated}, ${f.publicRecommendation}, 'DRAFT',
         ${user.email}, ${user.email})
      returning id
    `;
    credentialId = row.id;
    await writeAudit(tx, user, `Created credential ${credentialNumber} (draft)`);
  });

  revalidatePath("/credentials");
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/audit-logs");
  redirect(`/credentials/${credentialId}`);
}

export async function updateInternCredential(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const credentialId = Number(formData.get("credentialId"));
  const f = credentialFields(formData);
  if (!credentialId || !f.programmeTitle) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ credentialNumber: string }[]>`
      update intern_credentials set
        programme_title = ${f.programmeTitle},
        position = ${f.position},
        start_date = ${f.startDate},
        completion_date = ${f.completionDate},
        projects_completed = ${f.projectsCompleted},
        skills_demonstrated = ${f.skillsDemonstrated},
        public_recommendation = ${f.publicRecommendation},
        updated_by = ${user.email},
        updated_at = now()
      where id = ${credentialId}
      returning credential_number as "credentialNumber"
    `;
    if (rows.length > 0) {
      await writeAudit(tx, user, `Updated credential ${rows[0].credentialNumber}`);
    }
  });

  revalidatePath("/credentials");
  revalidatePath(`/credentials/${credentialId}`);
  revalidatePath(`/credentials/${credentialId}/preview`);
  revalidatePath("/audit-logs");
}

export async function publishInternCredential(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const credentialId = Number(formData.get("credentialId"));
  if (!credentialId) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ credentialNumber: string }[]>`
      update intern_credentials
      set status = 'PUBLISHED', published_at = now(), issue_date = current_date,
          updated_by = ${user.email}, updated_at = now()
      where id = ${credentialId} and status = 'DRAFT'
      returning credential_number as "credentialNumber"
    `;
    if (rows.length > 0) {
      await writeAudit(tx, user, `Published credential ${rows[0].credentialNumber}`);
      await writeAudit(
        tx,
        user,
        `Generated QR code for credential ${rows[0].credentialNumber}`
      );
    }
  });

  revalidatePath("/credentials");
  revalidatePath(`/credentials/${credentialId}`);
  revalidatePath("/audit-logs");
}

export async function revokeInternCredential(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const credentialId = Number(formData.get("credentialId"));
  const reason = text(formData, "reason", 500);
  if (!credentialId) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ credentialNumber: string }[]>`
      update intern_credentials
      set status = 'REVOKED', revoked_at = now(), revocation_reason = ${reason},
          updated_by = ${user.email}, updated_at = now()
      where id = ${credentialId} and status = 'PUBLISHED'
      returning credential_number as "credentialNumber"
    `;
    if (rows.length > 0) {
      await writeAudit(
        tx,
        user,
        `Revoked credential ${rows[0].credentialNumber}${reason ? ` — ${reason}` : ""}`
      );
    }
  });

  revalidatePath("/credentials");
  revalidatePath(`/credentials/${credentialId}`);
  revalidatePath("/audit-logs");
}

export async function logQrDownload(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const credentialNumber = text(formData, "credentialNumber", 50);
  const format = text(formData, "format", 10);
  if (!credentialNumber) return;
  const sql = await db();
  await sql.begin(async (tx) => {
    await writeAudit(
      tx,
      user,
      `Downloaded QR code (${format || "png"}) for credential ${credentialNumber}`
    );
  });
  revalidatePath("/audit-logs");
}
