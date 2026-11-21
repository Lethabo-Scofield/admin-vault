"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { requireSuperAdmin } from "@/lib/session";

const globalOps = globalThis as unknown as { crudSql?: ReturnType<typeof postgres> };
function opsSql() {
  if (!process.env.OPS_DATABASE_URL) throw new Error("Ops database is not configured.");
  if (!globalOps.crudSql) globalOps.crudSql = postgres(process.env.OPS_DATABASE_URL, { ssl: "require", prepare: false, max: 3, connect_timeout: 15 });
  return globalOps.crudSql;
}
function field(data: FormData, key: string, max: number) { return String(data.get(key) ?? "").trim().slice(0, max); }

export async function updateOpsPerson(formData: FormData) {
  await requireSuperAdmin();
  const id = field(formData, "id", 80);
  const email = field(formData, "email", 320).toLowerCase();
  const name = field(formData, "name", 160);
  const role = field(formData, "role", 120);
  const contactDetails = field(formData, "contactDetails", 200);
  const githubUsername = field(formData, "githubUsername", 120);
  if (!id || !email.includes("@") || !name) throw new Error("Name and a valid email are required.");
  const sql = opsSql();
  await sql`
    update ops_users set email=${email}::citext, display_name=${name}, role=${role},
      profile_data = profile_data || ${JSON.stringify({ contactDetails, githubUsername })}::jsonb,
      updated_at=now() where id=${id}::uuid
  `;
  revalidatePath(`/people/ops:${id}`);
  revalidatePath("/people");
}

export async function deleteOpsPerson(formData: FormData) {
  await requireSuperAdmin();
  const id = field(formData, "id", 80);
  if (!id) throw new Error("Missing Ops person.");
  const sql = opsSql();
  const refs = [`user-${id}`, id, `ops:${id}`];
  await sql.begin(async (tx) => {
    for (const [table, trigger] of [["org_assignments", "org_assignments_guard"], ["org_relationships", "org_relationships_guard"], ["org_department_leads", "org_department_leads_guard"], ["org_changes", "org_changes_guard"]]) await tx.unsafe(`alter table ${table} disable trigger ${trigger}`);
    const tasks = await tx`select id from tasks where creator_user_id=${id}::uuid or assignee_external_id = any(${refs})`;
    const taskIds = tasks.map((row) => row.id);
    if (taskIds.length) {
      for (const table of ["email_notifications", "task_activity", "task_assignees", "task_checklist_items", "task_departments", "task_evidence", "task_updates"]) await tx.unsafe(`delete from ${table} where ${table === "email_notifications" ? "related_task_id" : "task_id"} = any($1::uuid[])`, [taskIds]);
      await tx`delete from tasks where id = any(${taskIds})`;
    }
    await tx`delete from task_updates where author_user_id=${id}::uuid`;
    await tx`delete from task_evidence where submitted_by=${id}::uuid`;
    await tx`delete from task_activity where actor_user_id=${id}::uuid`;
    await tx`delete from email_notifications where recipient_user_id=${id}::uuid`;
    await tx`delete from app_assets where owner_user_id=${id}::uuid or external_person_id = any(${refs})`;
    await tx`delete from org_capabilities where user_id=${id}::uuid or granted_by=${id}::uuid or revoked_by=${id}::uuid`;
    await tx`delete from personal_calendar_access where user_id=${id}::uuid or granted_by=${id}::uuid`;
    await tx`delete from personal_calendar_events where owner_user_id=${id}::uuid`;
    await tx`delete from account_setup_tokens where user_id=${id}::uuid`;
    await tx`delete from org_assignments where person_ref = any(${refs})`;
    await tx`delete from org_relationships where subject_ref = any(${refs}) or manager_ref = any(${refs})`;
    await tx`delete from org_department_leads where person_ref = any(${refs})`;
    await tx`delete from org_person_classification where person_ref = any(${refs})`;
    await tx`delete from org_chart_exclusions where person_ref = any(${refs})`;
    await tx`delete from org_cover where covering_ref = any(${refs}) or covered_ref = any(${refs})`;
    await tx`delete from org_identity_links where superseded_ref = any(${refs}) or canonical_ref = any(${refs})`;
    await tx`delete from org_changes where subject_refs && ${refs}`;
    await tx`delete from ops_users where id=${id}::uuid`;
    for (const [table, trigger] of [["org_assignments", "org_assignments_guard"], ["org_relationships", "org_relationships_guard"], ["org_department_leads", "org_department_leads_guard"], ["org_changes", "org_changes_guard"]]) await tx.unsafe(`alter table ${table} enable trigger ${trigger}`);
  });
  revalidatePath("/people");
  revalidatePath("/people/departments");
  redirect("/people");
}

export async function addOpsCareerEvent(formData: FormData) {
  await requireSuperAdmin();
  const personRef = field(formData, "personRef", 120);
  const title = field(formData, "title", 160);
  const from = field(formData, "from", 30);
  if (!personRef || !title || !from) throw new Error("Role and start date are required.");
  const sql = opsSql();
  await sql.begin(async (tx) => {
    const rows = await tx`insert into org_changes (kind, actor_name, reason, subject_refs, before, after) values ('ROLE_UPDATE','Olyxee Admin','Updated career timeline',${[personRef]},'{}'::jsonb,${JSON.stringify({ title, from })}::jsonb) returning id`;
    const changeId = rows[0].id;
    await tx.unsafe("update org_assignments set effective_to=$1 where person_ref=$2 and effective_to is null", [from, personRef]);
    const current = await tx.unsafe("select position_id,department_id from org_assignments where person_ref=$1 order by effective_from desc limit 1", [personRef]);
    await tx.unsafe("insert into org_assignments (id,person_ref,title,position_id,department_id,effective_from,effective_to,change_id) values (gen_random_uuid(),$1,$2,$3,$4,$5,null,$6)", [personRef, title, current[0]?.position_id ?? null, current[0]?.department_id ?? null, from, changeId]);
  });
  revalidatePath("/people");
}
