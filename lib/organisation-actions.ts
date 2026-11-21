"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, getSql } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

export async function saveOrganisationFunction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const leaderEmail = String(formData.get("leaderEmail") ?? "").trim().toLowerCase();
  if (!name) return;
  const actor = await requireSuperAdmin();
  await ensureSchema();
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [row] = await tx<{ id: number }[]>`
      insert into organisation_functions (name, description, leader_email)
      values (${name}, ${description}, ${leaderEmail})
      on conflict (name) do update set description = excluded.description,
        leader_email = excluded.leader_email, updated_at = now(), active = true
      returning id
    `;
    await tx`
      insert into audit_logs (action, actor_email, actor_role, status)
      values (${`Created organisation function "${name}"`}, ${actor.email}, ${actor.role}, 'SUCCESS')
    `;
    await tx`
      insert into ops_sync_events (event_key, event_type, aggregate_id, payload)
      values (${`organisation-function:${row.id}:${Date.now()}`}, 'ORGANISATION_FUNCTION_UPSERTED', ${String(row.id)}, ${JSON.stringify({ id: row.id, name, description, leaderEmail })}::jsonb)
    `;
  });
  revalidatePath("/organisation");
  revalidatePath("/audit-logs");
}

export async function deactivateOrganisationFunction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!id) return;
  const actor = await requireSuperAdmin();
  await ensureSchema();
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [row] = await tx<{ name: string }[]>`
      update organisation_functions set active = false, updated_at = now()
      where id = ${id} returning name
    `;
    if (!row) return;
    await tx`
      insert into audit_logs (action, actor_email, actor_role, status)
      values (${`Deactivated organisation function "${row.name}"`}, ${actor.email}, ${actor.role}, 'SUCCESS')
    `;
  });
  revalidatePath("/organisation");
  revalidatePath("/audit-logs");
}

export async function createEmployee(formData: FormData): Promise<void> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const engagementType = String(formData.get("engagementType") ?? "EMPLOYEE").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  if (!fullName || !email) return;
  const actor = await requireSuperAdmin();
  await ensureSchema();
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [sequence] = await tx<{ id: number }[]>`select nextval('people_identity_id_seq') as id`;
    const id = Number(sequence.id);
    const stableId = `employee:${id}`;
    await tx`
      insert into people_identity
        (id, stable_id, source_type, source_id, full_name, email, engagement_type, job_title)
      values (${id}, ${stableId}, 'EMPLOYEE', ${id}, ${fullName}, ${email}, ${engagementType}, ${jobTitle})
    `;
    await tx`
      insert into audit_logs (action, actor_email, actor_role, status)
      values (${`Created employee ${fullName}`}, ${actor.email}, ${actor.role}, 'SUCCESS')
    `;
    await tx`
      insert into ops_sync_events (event_key, event_type, aggregate_id, payload)
      values (${`employee:${stableId}:${Date.now()}`}, 'PERSON_UPSERTED', ${stableId}, ${JSON.stringify({ stableId, fullName, email, engagementType, jobTitle })}::jsonb)
    `;
  });
  revalidatePath("/people");
  revalidatePath("/audit-logs");
}
