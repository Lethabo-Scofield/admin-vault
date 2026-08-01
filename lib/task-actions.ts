"use server";

import { revalidatePath } from "next/cache";
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
  action: string
): Promise<void> {
  await tx`
    insert into audit_logs (action, actor_email, actor_role, ip_address, status)
    values (${action}, ${actor.email}, ${actor.role}, ${"10.0.0.1"}, ${"SUCCESS"})
  `;
}

function text(formData: FormData, key: string, max = 5000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function dateOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Accept only http(s) URLs for PR links; anything else is stored empty. */
function safeUrl(v: string): string {
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

export async function createInternTask(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const internId = Number(formData.get("internId"));
  const title = text(formData, "title", 300);
  if (!internId || !title) return;
  const description = text(formData, "description");
  const dueDate = dateOrNull(formData.get("dueDate"));
  const assignedBy = text(formData, "assignedBy", 200);

  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      insert into intern_tasks (intern_id, title, description, due_date, assigned_by)
      values (${internId}, ${title}, ${description}, ${dueDate}, ${assignedBy})
    `;
    await writeAudit(tx, user, `Assigned task "${title}" to intern #${internId}`);
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/audit-logs");
}

export async function submitInternTaskPr(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const taskId = Number(formData.get("taskId"));
  const prLink = safeUrl(text(formData, "prLink", 1000));
  if (!taskId || !prLink) return;

  const sql = await db();
  let internId = 0;
  await sql.begin(async (tx) => {
    const [row] = await tx<{ internId: number; title: string }[]>`
      update intern_tasks
      set pr_link = ${prLink}, status = 'SUBMITTED', review_note = '', updated_at = now()
      where id = ${taskId} and status <> 'APPROVED'
      returning intern_id as "internId", title
    `;
    if (!row) return;
    internId = row.internId;
    await writeAudit(tx, user, `PR submitted for task "${row.title}" (${prLink})`);
  });
  if (internId) {
    revalidatePath(`/interns/${internId}`);
    revalidatePath("/audit-logs");
  }
}

export async function reviewInternTask(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const taskId = Number(formData.get("taskId"));
  const decision = text(formData, "decision", 30);
  const reviewNote = text(formData, "reviewNote", 2000);
  if (!taskId) return;
  if (decision !== "APPROVED" && decision !== "CHANGES_REQUESTED") return;

  const sql = await db();
  let internId = 0;
  await sql.begin(async (tx) => {
    const [row] = await tx<{ internId: number; title: string }[]>`
      update intern_tasks
      set status = ${decision}, review_note = ${reviewNote}, updated_at = now()
      where id = ${taskId} and status = 'SUBMITTED'
      returning intern_id as "internId", title
    `;
    if (!row) return;
    internId = row.internId;
    await writeAudit(
      tx,
      user,
      decision === "APPROVED"
        ? `Approved task "${row.title}"`
        : `Requested changes on task "${row.title}"`
    );
  });
  if (internId) {
    revalidatePath(`/interns/${internId}`);
    revalidatePath("/audit-logs");
  }
}

export async function deleteInternTask(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const taskId = Number(formData.get("taskId"));
  if (!taskId) return;

  const sql = await db();
  let internId = 0;
  await sql.begin(async (tx) => {
    const [row] = await tx<{ internId: number; title: string }[]>`
      delete from intern_tasks where id = ${taskId}
      returning intern_id as "internId", title
    `;
    if (!row) return;
    internId = row.internId;
    await writeAudit(tx, user, `Deleted task "${row.title}"`);
  });
  if (internId) {
    revalidatePath(`/interns/${internId}`);
    revalidatePath("/audit-logs");
  }
}
