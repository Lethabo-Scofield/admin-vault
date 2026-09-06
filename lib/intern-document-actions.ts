"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import type { TransactionSql } from "postgres";
import { getSql, ensureSchema } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/session";
import { INTERN_DOCUMENT_KINDS, type InternDocumentKind } from "@/lib/types";

type Tx = TransactionSql<Record<string, never>>;

const MAX_INTERN_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed upload types → canonical MIME. Anything else is rejected. */
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "application/pdf",
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "application/msword": "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

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

function kindOrOther(v: FormDataEntryValue | null): InternDocumentKind {
  const s = String(v ?? "").toUpperCase();
  return s in INTERN_DOCUMENT_KINDS ? (s as InternDocumentKind) : "OTHER";
}

function resolveMime(file: File): string | null {
  const declared = ALLOWED_TYPES[file.type];
  if (declared) return declared;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? null;
}

export type UploadResult = { error: string } | { ok: true };

export async function uploadInternDocument(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const internId = Number(formData.get("internId"));
  const file = formData.get("file");
  if (!internId) return { error: "Missing intern." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_INTERN_DOCUMENT_BYTES) {
    return { error: "File is larger than 10 MB." };
  }
  const mime = resolveMime(file);
  if (!mime) {
    return { error: "Only PDF, Word (.doc/.docx) and image (PNG/JPG/WebP) files are accepted." };
  }
  const kind = kindOrOther(formData.get("kind"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const fileName = file.name.replace(/[\\/]/g, "_").slice(0, 255) || "document";

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const sql = await db();
  await sql.begin(async (tx) => {
    const [intern] = await tx<{ n: string; name: string }[]>`
      select intern_number as n, full_name as name from interns where id = ${internId}
    `;
    if (!intern) throw new Error("Intern not found.");
    await tx`
      insert into intern_documents
        (intern_id, kind, file_name, mime_type, size_bytes, sha256, content, note, uploaded_by)
      values
        (${internId}, ${kind}, ${fileName}, ${mime}, ${bytes.length}, ${sha256}, ${bytes}, ${note}, ${user.email})
    `;
    await writeAudit(
      tx,
      user,
      `Uploaded ${INTERN_DOCUMENT_KINDS[kind]} "${fileName}" for intern ${intern.n} (${intern.name})`
    );
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
  return { ok: true };
}

export async function deleteInternDocument(formData: FormData): Promise<void> {
  const user = await requireUser();
  const documentId = Number(formData.get("documentId"));
  const internId = Number(formData.get("internId"));
  if (!documentId || !internId) return;

  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx<{ fileName: string; kind: InternDocumentKind }[]>`
      delete from intern_documents
      where id = ${documentId} and intern_id = ${internId}
      returning file_name as "fileName", kind
    `;
    if (!row) return;
    await writeAudit(
      tx,
      user,
      `Deleted ${INTERN_DOCUMENT_KINDS[row.kind] ?? row.kind} "${row.fileName}" for intern #${internId}`
    );
  });
  revalidatePath(`/interns/${internId}`);
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
}
