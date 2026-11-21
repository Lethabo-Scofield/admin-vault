import postgres from "postgres";

type OpsSql = ReturnType<typeof postgres>;
const globalOps = globalThis as unknown as { sql?: OpsSql };

function getOpsSql(): OpsSql | null {
  const url = process.env.OPS_DATABASE_URL;
  if (!url) return null;
  if (!globalOps.sql) globalOps.sql = postgres(url, { ssl: "require", prepare: false, max: 3, idle_timeout: 20, connect_timeout: 15 });
  return globalOps.sql;
}

export type OpsPerson = {
  stableRef: string;
  name: string;
  email: string;
  role: string;
  status: string;
  title: string;
  functionName: string | null;
  managerRef: string;
  tasksTotal: number;
  tasksCompleted: number;
  hasProfile: boolean;
  avatarUrl: string;
};

export type OpsIdentityLink = {
  supersededRef: string;
  canonicalRef: string;
};

export type OpsCareerEvent = {
  title: string;
  from: string;
  to: string | null;
};

/** Historical role assignments, used to show a LinkedIn-style career path. */
export async function getOpsCareerHistory(personRefs: string[]): Promise<OpsCareerEvent[]> {
  const sql = getOpsSql();
  if (!sql || personRefs.length === 0) return [];
  const rows = await sql<OpsCareerEvent[]>`
    select title, effective_from as "from", effective_to as "to"
    from org_assignments
    where person_ref in ${sql(personRefs)}
    order by effective_from asc
  `;
  // Ops can record the same title more than once during sync; collapse adjacent
  // duplicates so the profile reads as a career timeline, not an audit dump.
  return rows.filter((row, index) => index === 0 || row.title !== rows[index - 1].title);
}

export async function getOpsIdentityLinks(): Promise<OpsIdentityLink[]> {
  const sql = getOpsSql();
  if (!sql) return [];
  return sql<OpsIdentityLink[]>`
    select superseded_ref as "supersededRef", canonical_ref as "canonicalRef"
    from org_identity_links
  `;
}

export async function getOpsPeople(): Promise<OpsPerson[]> {
  const sql = getOpsSql();
  if (!sql) return [];
  const [users, assignments, relationships, taskCounts] = await Promise.all([
    sql<{ id: string; email: string; name: string; role: string; active: boolean; profileData: Record<string, unknown> }[]>`
      select id::text, email::text, display_name as name, role, active, profile_data as "profileData"
      from ops_users where active = true order by display_name
    `,
    sql<{ personRef: string; title: string; functionName: string | null }[]>`
      select distinct on (a.person_ref) a.person_ref as "personRef", a.title, d.name as "functionName"
      from org_assignments a left join org_departments d on d.id = a.department_id
      where a.effective_to is null order by a.person_ref, a.effective_from desc
    `,
    sql<{ subjectRef: string; managerRef: string }[]>`
      select distinct on (subject_ref) subject_ref as "subjectRef", manager_ref as "managerRef"
      from org_relationships where effective_to is null order by subject_ref, effective_from desc
    `,
    sql<{ ref: string; total: number; completed: number }[]>`
      select ref, count(*)::int as total, count(*) filter (where status = 'Completed')::int as completed
      from (select t.assignee_external_id as ref, t.status from tasks t where t.assignee_external_id is not null
            union all select ta.assignee_external_id as ref, t.status from task_assignees ta join tasks t on t.id = ta.task_id) x
      group by ref
    `,
  ]);
  const assignmentMap = new Map(assignments.map((x) => [x.personRef, x]));
  const managerMap = new Map(relationships.map((x) => [x.subjectRef, x.managerRef]));
  const taskMap = new Map(taskCounts.map((x) => [x.ref, x]));
  return users.map((user) => {
    // Ops uses account-/intern- refs for organisation records; email remains
    // the stable cross-system fallback until an identity link is confirmed.
    const assignment = assignmentMap.get(`user-${user.id}`);
    const tasks = taskMap.get(user.email) ?? taskMap.get(user.id);
    return {
      stableRef: `ops:${user.id}`,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.active ? "ACTIVE" : "SUSPENDED",
      title: assignment?.title ?? "",
      functionName: assignment?.functionName ?? null,
      managerRef: managerMap.get(`user-${user.id}`) ?? "",
      tasksTotal: tasks?.total ?? 0,
      tasksCompleted: tasks?.completed ?? 0,
      hasProfile: Object.keys(user.profileData ?? {}).length > 0,
      avatarUrl: typeof user.profileData?.avatarUrl === "string" ? user.profileData.avatarUrl : "",
    };
  });
}

export async function getOpsProfile(stableRef: string) {
  const sql = getOpsSql();
  if (!sql || !stableRef.startsWith("ops:")) return null;
  const id = stableRef.slice(4);
  const rows = await sql<{ email: string; name: string; role: string; active: boolean; profileData: Record<string, unknown> }[]>`
    select email::text, display_name as name, role, active, profile_data as "profileData"
    from ops_users where id = ${id}::uuid limit 1
  `;
  return rows[0] ?? null;
}
