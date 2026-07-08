"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TransactionSql } from "postgres";
import { getSql, ensureSchema } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/session";

const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

async function logoToDataUrl(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!ALLOWED_LOGO_TYPES.has(value.type)) {
    throw new Error("Logo must be a PNG, JPEG, WebP, GIF, or SVG image.");
  }
  if (value.size > MAX_LOGO_BYTES) {
    throw new Error("Logo image must be 1 MB or smaller.");
  }
  const buffer = Buffer.from(await value.arrayBuffer());
  return `data:${value.type};base64,${buffer.toString("base64")}`;
}

type Sql = ReturnType<typeof getSql>;
type Tx = TransactionSql<Record<string, never>>;

async function db(): Promise<Sql> {
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

export async function createProject(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return;

  const logoUrl = (await logoToDataUrl(formData.get("logo"))) ?? "";

  const user = await requireUser();
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      insert into projects (name, category, description, logo_url)
      values (${name}, ${category}, ${description}, ${logoUrl})
    `;
    await writeAudit(tx, user, `Created project "${name}"`);
  });

  revalidatePath("/projects");
  revalidatePath("/audit-logs");
  revalidatePath("/");
}

export async function updateProject(formData: FormData): Promise<void> {
  const projectId = Number(formData.get("projectId"));
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const removeLogo = formData.get("removeLogo") === "on";

  if (!projectId || !name) return;

  const newLogo = await logoToDataUrl(formData.get("logo"));

  const user = await requireUser();
  const sql = await db();
  await sql.begin(async (tx) => {
    let rows: { id: number }[];
    if (newLogo !== null) {
      rows = await tx<{ id: number }[]>`
        update projects
        set name = ${name}, category = ${category}, description = ${description},
            logo_url = ${newLogo}
        where id = ${projectId}
        returning id
      `;
    } else if (removeLogo) {
      rows = await tx<{ id: number }[]>`
        update projects
        set name = ${name}, category = ${category}, description = ${description},
            logo_url = ''
        where id = ${projectId}
        returning id
      `;
    } else {
      rows = await tx<{ id: number }[]>`
        update projects
        set name = ${name}, category = ${category}, description = ${description}
        where id = ${projectId}
        returning id
      `;
    }
    if (rows.length > 0) {
      await writeAudit(tx, user, `Updated project "${name}"`);
    }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/audit-logs");
  revalidatePath("/");
}

export async function deleteProject(formData: FormData): Promise<void> {
  const projectId = Number(formData.get("projectId"));
  if (!projectId) return;

  const user = await requireUser();
  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx<{ name: string }[]>`
      delete from projects where id = ${projectId} returning name
    `;
    if (row) {
      await writeAudit(
        tx,
        user,
        `Deleted project "${row.name}" (and its credentials/documents)`
      );
    }
  });

  revalidatePath("/projects");
  revalidatePath("/credentials");
  revalidatePath("/compliance");
  revalidatePath("/audit-logs");
  revalidatePath("/");
  redirect("/projects");
}

export async function addCredential(formData: FormData): Promise<void> {
  const projectId = Number(formData.get("projectId"));
  const serviceName = String(formData.get("serviceName") ?? "").trim();
  const environment = String(formData.get("environment") ?? "").trim();
  const secretValue = String(formData.get("secretValue") ?? "");
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const status = String(formData.get("status") ?? "Active").trim() || "Active";

  if (!projectId || !serviceName || !secretValue) return;

  const user = await requireUser();
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      insert into credentials
        (project_id, service_name, environment, secret_value, owner_email, department, status)
      values
        (${projectId}, ${serviceName}, ${environment}, ${secretValue}, ${ownerEmail}, ${department}, ${status})
    `;
    await writeAudit(tx, user, `Added credential "${serviceName}" (${environment || "n/a"})`);
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/credentials");
  revalidatePath("/audit-logs");
  revalidatePath("/");
}

export async function updateCredential(formData: FormData): Promise<void> {
  const credentialId = Number(formData.get("credentialId"));
  const serviceName = String(formData.get("serviceName") ?? "").trim();
  const environment = String(formData.get("environment") ?? "").trim();
  const secretValue = String(formData.get("secretValue") ?? "");
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const status = String(formData.get("status") ?? "Active").trim() || "Active";

  if (!credentialId || !serviceName) return;

  const user = await requireUser();
  const sql = await db();
  let projectId: number | null = null;
  await sql.begin(async (tx) => {
    // Blank secret keeps the existing value.
    const rows = secretValue
      ? await tx<{ projectId: number }[]>`
          update credentials
          set service_name = ${serviceName}, environment = ${environment},
              secret_value = ${secretValue}, owner_email = ${ownerEmail},
              department = ${department}, status = ${status}
          where id = ${credentialId}
          returning project_id as "projectId"
        `
      : await tx<{ projectId: number }[]>`
          update credentials
          set service_name = ${serviceName}, environment = ${environment},
              owner_email = ${ownerEmail}, department = ${department},
              status = ${status}
          where id = ${credentialId}
          returning project_id as "projectId"
        `;
    projectId = rows[0]?.projectId ?? null;
    if (rows.length > 0) {
      await writeAudit(
        tx,
        user,
        `Updated credential "${serviceName}" (${environment || "n/a"})${secretValue ? " — secret rotated" : ""}`
      );
    }
  });

  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/credentials");
  revalidatePath("/audit-logs");
  revalidatePath("/");
}

export async function deleteCredential(formData: FormData): Promise<void> {
  const credentialId = Number(formData.get("credentialId"));
  if (!credentialId) return;

  const user = await requireUser();
  const sql = await db();
  let projectId: number | null = null;
  await sql.begin(async (tx) => {
    const rows = await tx<{ projectId: number; serviceName: string }[]>`
      delete from credentials where id = ${credentialId}
      returning project_id as "projectId", service_name as "serviceName"
    `;
    projectId = rows[0]?.projectId ?? null;
    if (rows.length > 0) {
      await writeAudit(tx, user, `Deleted credential "${rows[0].serviceName}"`);
    }
  });

  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/credentials");
  revalidatePath("/audit-logs");
  revalidatePath("/");
}

export async function uploadDocument(formData: FormData): Promise<void> {
  const projectId = Number(formData.get("projectId"));
  const classification = String(formData.get("classification") ?? "").trim();
  const file = formData.get("file");

  if (!projectId || !(file instanceof File) || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const user = await requireUser();
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      insert into documents
        (project_id, file_name, file_size_bytes, sha256, uploaded_by, classification)
      values
        (${projectId}, ${file.name}, ${file.size}, ${sha256}, ${user.email}, ${classification})
    `;
    await writeAudit(tx, user, `Uploaded document "${file.name}"`);
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/compliance");
  revalidatePath("/audit-logs");
  revalidatePath("/");
}
