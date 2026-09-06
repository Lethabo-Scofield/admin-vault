"use server";

import { revalidatePath } from "next/cache";
import type { TransactionSql } from "postgres";
import { getSql, ensureSchema } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/session";

type Tx = TransactionSql<Record<string, never>>;

async function db() {
  await ensureSchema();
  return getSql();
}

async function writeAudit(tx: Tx, actor: CurrentUser, action: string): Promise<void> {
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

function safeUrl(v: string): string {
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function internLabel(tx: Tx, internId: number): Promise<string> {
  const [row] = await tx<{ n: string; name: string }[]>`
    select intern_number as n, full_name as name from interns where id = ${internId}
  `;
  return row ? `${row.n} (${row.name})` : `#${internId}`;
}

export async function createInternProject(formData: FormData): Promise<void> {
  const user = await requireUser();
  const internId = Number(formData.get("internId"));
  const title = text(formData, "title", 300);
  if (!internId || !title) return;
  const completed = formData.get("status") === "COMPLETED";

  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      insert into intern_projects
        (intern_id, title, description, link, status, started_at, completed_at, created_by)
      values
        (${internId}, ${title}, ${text(formData, "description")}, ${safeUrl(text(formData, "link", 2000))},
         ${completed ? "COMPLETED" : "IN_PROGRESS"},
         ${dateOrNull(formData.get("startedAt")) ?? today()},
         ${completed ? dateOrNull(formData.get("completedAt")) ?? today() : null},
         ${user.email})
    `;
    await writeAudit(tx, user, `Added project "${title}" for intern ${await internLabel(tx, internId)}`);
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
}

export async function updateInternProject(formData: FormData): Promise<void> {
  const user = await requireUser();
  const projectId = Number(formData.get("projectId"));
  const internId = Number(formData.get("internId"));
  const title = text(formData, "title", 300);
  if (!projectId || !internId || !title) return;
  const completed = formData.get("status") === "COMPLETED";

  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      update intern_projects set
        title        = ${title},
        description  = ${text(formData, "description")},
        link         = ${safeUrl(text(formData, "link", 2000))},
        status       = ${completed ? "COMPLETED" : "IN_PROGRESS"},
        started_at   = ${dateOrNull(formData.get("startedAt"))},
        completed_at = ${completed ? dateOrNull(formData.get("completedAt")) ?? today() : null},
        updated_at   = now()
      where id = ${projectId} and intern_id = ${internId}
    `;
    await writeAudit(tx, user, `Updated project "${title}" for intern ${await internLabel(tx, internId)}`);
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
}

/** Toggle between IN_PROGRESS and COMPLETED (stamps completed_at with today). */
export async function setInternProjectStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const projectId = Number(formData.get("projectId"));
  const internId = Number(formData.get("internId"));
  const completed = formData.get("status") === "COMPLETED";
  if (!projectId || !internId) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx<{ title: string }[]>`
      update intern_projects set
        status       = ${completed ? "COMPLETED" : "IN_PROGRESS"},
        completed_at = ${completed ? today() : null},
        updated_at   = now()
      where id = ${projectId} and intern_id = ${internId}
      returning title
    `;
    if (!row) return;
    await writeAudit(
      tx,
      user,
      `Marked project "${row.title}" ${completed ? "completed" : "in progress"} for intern ${await internLabel(tx, internId)}`
    );
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
}

export async function deleteInternProject(formData: FormData): Promise<void> {
  const user = await requireUser();
  const projectId = Number(formData.get("projectId"));
  const internId = Number(formData.get("internId"));
  if (!projectId || !internId) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx<{ title: string }[]>`
      delete from intern_projects where id = ${projectId} and intern_id = ${internId} returning title
    `;
    if (!row) return;
    await writeAudit(tx, user, `Deleted project "${row.title}" for intern ${await internLabel(tx, internId)}`);
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
}
