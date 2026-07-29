"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TransactionSql } from "postgres";
import type { InternCredential } from "@/lib/types";
import { getSql, ensureSchema } from "@/lib/db";
import { requireSuperAdmin, type CurrentUser } from "@/lib/session";
import { getInternCredential } from "@/lib/intern-queries";
import { validateIssueDate } from "@/lib/documents/fields";
import {
  generateCertificatePdf,
  generateLetterPdf,
} from "@/lib/documents/generate";

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

/** Pronouns must be selected explicitly — never inferred from the name. */
function pronounsOrEmpty(v: FormDataEntryValue | null): string {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "SHE_HER" || s === "HE_HIM" || s === "THEY_THEM" ? s : "";
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
        (intern_number, full_name, email, pronouns, position, department, start_date,
         completion_date, employment_status, projects_completed, responsibilities,
         skills_demonstrated, supervisor_name, supervisor_recommendation, internal_notes)
      values
        (${internNumber}, ${fullName}, ${text(formData, "email", 320)},
         ${pronounsOrEmpty(formData.get("pronouns"))}, ${text(formData, "position", 200)},
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
        email = ${text(formData, "email", 320)},
        pronouns = ${pronounsOrEmpty(formData.get("pronouns"))},
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
    department: text(formData, "department", 200),
    pronouns: pronounsOrEmpty(formData.get("pronouns")),
    startDate: dateOrNull(formData.get("startDate")),
    completionDate: dateOrNull(formData.get("completionDate")),
    projectsCompleted: text(formData, "projectsCompleted"),
    responsibilities: text(formData, "responsibilities"),
    skillsDemonstrated: text(formData, "skillsDemonstrated"),
    publicRecommendation: text(formData, "publicRecommendation"),
    founderName: text(formData, "founderName", 200),
    founderTitle: text(formData, "founderTitle", 200),
    founderRecommendation: text(formData, "founderRecommendation"),
    managerName: text(formData, "managerName", 200),
    managerTitle: text(formData, "managerTitle", 200),
    managerRecommendation: text(formData, "managerRecommendation"),
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
         department, pronouns, start_date, completion_date, projects_completed,
         responsibilities, skills_demonstrated, public_recommendation,
         founder_name, founder_title, founder_recommendation,
         manager_name, manager_title, manager_recommendation,
         status, created_by, updated_by)
      values
        (${internId}, ${credentialNumber}, ${token}, ${f.programmeTitle}, ${f.position},
         ${f.department}, ${f.pronouns}, ${f.startDate}, ${f.completionDate},
         ${f.projectsCompleted}, ${f.responsibilities}, ${f.skillsDemonstrated},
         ${f.publicRecommendation},
         ${f.founderName}, ${f.founderTitle}, ${f.founderRecommendation},
         ${f.managerName}, ${f.managerTitle}, ${f.managerRecommendation},
         'DRAFT', ${user.email}, ${user.email})
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

  const existing = await getInternCredential(credentialId);
  if (!existing) return;

  const isPublished = existing.status === "PUBLISHED";

  // Published records must keep the publish-time invariants: dates present
  // and the fixed issue date never earlier than the (possibly edited)
  // completion date.
  let regenerated: { certificatePdf: Buffer; letterPdf: Buffer } | null = null;
  if (isPublished) {
    if (!f.startDate || !f.completionDate) {
      redirect(
        `/credentials/${credentialId}?error=${encodeURIComponent("Start and completion dates are required on a published credential.")}`
      );
    }
    const check = validateIssueDate(existing.issueDate, f.completionDate);
    if (!check.ok) {
      redirect(
        `/credentials/${credentialId}?error=${encodeURIComponent(check.error ?? "Invalid completion date.")}`
      );
    }
    // Regenerate the stored PDFs from the edited values BEFORE writing
    // anything, so a failed render leaves the record and its documents
    // untouched. The verification URL and QR code never change.
    const merged = {
      ...existing,
      ...f,
      pronouns: f.pronouns as InternCredential["pronouns"],
    };
    try {
      const [certificatePdf, letterPdf] = await Promise.all([
        generateCertificatePdf(merged),
        generateLetterPdf(merged),
      ]);
      regenerated = { certificatePdf, letterPdf };
    } catch {
      redirect(
        `/credentials/${credentialId}?error=${encodeURIComponent("Document regeneration failed; no changes were saved. Please try again.")}`
      );
    }
  }

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ credentialNumber: string }[]>`
      update intern_credentials set
        programme_title = ${f.programmeTitle},
        position = ${f.position},
        department = ${f.department},
        pronouns = ${f.pronouns},
        start_date = ${f.startDate},
        completion_date = ${f.completionDate},
        projects_completed = ${f.projectsCompleted},
        responsibilities = ${f.responsibilities},
        skills_demonstrated = ${f.skillsDemonstrated},
        public_recommendation = ${f.publicRecommendation},
        founder_name = ${f.founderName},
        founder_title = ${f.founderTitle},
        founder_recommendation = ${f.founderRecommendation},
        manager_name = ${f.managerName},
        manager_title = ${f.managerTitle},
        manager_recommendation = ${f.managerRecommendation},
        certificate_pdf = ${regenerated ? regenerated.certificatePdf : sql`certificate_pdf`},
        letter_pdf = ${regenerated ? regenerated.letterPdf : sql`letter_pdf`},
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

  const credential = await getInternCredential(credentialId);
  if (!credential || credential.status !== "DRAFT") return;

  // The issue date (today) can never be earlier than the completion date.
  const issueDate = new Date().toISOString().slice(0, 10);
  const check = validateIssueDate(issueDate, credential.completionDate);
  if (!check.ok) {
    redirect(
      `/credentials/${credentialId}?error=${encodeURIComponent(check.error ?? "Invalid issue date.")}`
    );
  }
  if (!credential.completionDate || !credential.startDate) {
    redirect(
      `/credentials/${credentialId}?error=${encodeURIComponent("Start and completion dates are required before publishing.")}`
    );
  }

  // Generate the final PDFs before flipping the status so a failed render
  // never leaves a published credential without documents.
  const forDocs = { ...credential, issueDate };
  const [certificatePdf, letterPdf] = await Promise.all([
    generateCertificatePdf(forDocs),
    generateLetterPdf(forDocs),
  ]);

  const sql = await db();
  await sql.begin(async (tx) => {
    const rows = await tx<{ credentialNumber: string }[]>`
      update intern_credentials
      set status = 'PUBLISHED', published_at = now(), issue_date = current_date,
          certificate_pdf = ${certificatePdf}, letter_pdf = ${letterPdf},
          updated_by = ${user.email}, updated_at = now()
      where id = ${credentialId} and status = 'DRAFT'
      returning credential_number as "credentialNumber"
    `;
    if (rows.length > 0) {
      await writeAudit(tx, user, `Published credential ${rows[0].credentialNumber}`);
      await writeAudit(
        tx,
        user,
        `Generated certificate, recommendation letter and QR code for credential ${rows[0].credentialNumber}`
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

export async function deleteInternCredential(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const credentialId = Number(formData.get("credentialId"));
  if (!credentialId) return;

  const existing = await getInternCredential(credentialId);
  if (!existing) return;

  // Published credentials must stay verifiable — revoke them instead.
  // Revoked ones keep their public "revoked" notice as a permanent record.
  if (existing.status !== "DRAFT") {
    redirect(
      `/credentials/${credentialId}?error=${encodeURIComponent(
        "Only draft credentials can be deleted. Published credentials must be revoked so the public record stays intact."
      )}`
    );
  }

  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`delete from intern_credentials where id = ${credentialId}`;
    await writeAudit(
      tx,
      user,
      `Deleted draft credential ${existing.credentialNumber}`
    );
  });

  revalidatePath("/credentials");
  revalidatePath(`/interns/${existing.internId}`);
  revalidatePath("/audit-logs");
  redirect("/credentials");
}

export async function deleteIntern(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const internId = Number(formData.get("internId"));
  if (!internId) return;

  const sql = await db();
  const [intern] = await sql<{ internNumber: string }[]>`
    select intern_number as "internNumber" from interns where id = ${internId}
  `;
  if (!intern) return;

  // Interns with published/revoked credentials cannot be deleted — those
  // credentials back public verification pages that must stay intact.
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from intern_credentials
    where intern_id = ${internId} and status <> 'DRAFT'
  `;
  if (count > 0) {
    redirect(
      `/interns/${internId}?error=${encodeURIComponent(
        "This intern has published or revoked credentials, which must stay verifiable. Revoke credentials if needed and use Archive instead of Delete."
      )}`
    );
  }

  await sql.begin(async (tx) => {
    await tx`delete from intern_credentials where intern_id = ${internId} and status = 'DRAFT'`;
    await tx`delete from interns where id = ${internId}`;
    await writeAudit(
      tx,
      user,
      `Deleted intern ${intern.internNumber} (and their draft credentials)`
    );
  });

  revalidatePath("/interns");
  revalidatePath("/credentials");
  revalidatePath("/audit-logs");
  redirect("/interns");
}
