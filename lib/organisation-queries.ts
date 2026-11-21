import { ensureSchema, getSql } from "@/lib/db";
import { requireSuperAdmin, requireUser } from "@/lib/session";
import { getOpsPeople, getOpsIdentityLinks } from "@/lib/ops-queries";

export async function getOrganisationFunctions() {
  await requireSuperAdmin();
  await ensureSchema();
  return getSql()<{
    id: number; name: string; description: string; leaderEmail: string;
    active: boolean; memberCount: number; updatedAt: string;
  }[]>`
    select f.id, f.name, f.description, f.leader_email as "leaderEmail", f.active,
      (select count(*) from people_identity p where p.function_id = f.id and p.active) as "memberCount",
      f.updated_at as "updatedAt"
    from organisation_functions f order by f.active desc, f.name
  `;
}

export async function getPeopleDirectory() {
  const user = await requireUser();
  if (!user.permissions.includes("MANAGE_PROJECTS") && !user.permissions.includes("MANAGE_INTERNS")) {
    return [];
  }
  await ensureSchema();
  const sql = getSql();
  // Build the directory from existing authoritative records. Interns remain in
  // interns; workspace identities remain in workspace_accounts.
  const interns = await sql<{
    stableId: string; name: string; email: string; type: string; status: string;
    title: string; role: string; functionName: string | null; managerId: string; source: string;
  }[]>`
    select 'intern:' || i.id as "stableId", i.full_name as name, i.email,
      'INTERN' as type, i.employment_status as status, i.position as title, i.position as role,
      f.name as "functionName", coalesce(p.manager_stable_id, '') as "managerId",
      'interns' as source
    from interns i
    left join people_identity p on p.source_type = 'INTERN' and p.source_id = i.id
    left join organisation_functions f on f.id = p.function_id
    where i.archived_at is null
  `;
  const accounts = await sql<typeof interns[number][]>`
    select 'account:' || id as "stableId", coalesce(display_name, email) as name, email,
      'EMPLOYEE' as type, case when active then 'ACTIVE' else 'SUSPENDED' end as status,
      '' as title, case when manage_interns and manage_projects then 'People & Project Administrator' when manage_interns then 'People Administrator' when manage_projects then 'Project Administrator' else 'Read-only account' end as role, null as "functionName", '' as "managerId", 'workspace_accounts' as source
    from workspace_accounts order by display_name, email
  `;
  const employees = await sql<typeof interns[number][]>`
    select stable_id as "stableId", full_name as name, email,
      engagement_type as type, case when p.active then 'ACTIVE' else 'SUSPENDED' end as status,
      job_title as title, job_title as role, f.name as "functionName", manager_stable_id as "managerId",
      'people_identity' as source
    from people_identity p left join organisation_functions f on f.id = p.function_id
    where p.source_type = 'EMPLOYEE' order by p.full_name
  `;
  const localByEmail = new Map<string, (typeof interns)[number]>();
  for (const person of [...interns, ...employees, ...accounts]) {
    // Admin may contain historical duplicate rows; People is a directory of
    // identities, so the latest source row for an email wins.
    if (person.email) localByEmail.set(person.email.toLowerCase(), person);
  }
  const [ops, identityLinks] = await Promise.all([getOpsPeople(), getOpsIdentityLinks()]);
  const superseded = new Set(identityLinks.map((link) => link.supersededRef));
  const local = [...localByEmail.values()].filter((person) => {
    const ref = person.stableId.startsWith("intern:")
      ? person.stableId.replace(":", "-")
      : person.stableId.startsWith("account:")
        ? person.stableId.replace(":", "-")
        : person.stableId;
    return !superseded.has(ref);
  });
  const opsByEmail = new Map(ops.map((person) => [person.email.toLowerCase(), person]));
  const merged = local.map((person) => {
    const opsPerson = opsByEmail.get(person.email.toLowerCase());
    if (!opsPerson) return { ...person, hasProfile: person.type === "INTERN" };
    return {
      ...person,
      type: person.type === "INTERN" ? "INTERN" : "EMPLOYEE",
      role: opsPerson.title || (person.type === "INTERN" ? person.title : opsPerson.role || person.role),
      title: opsPerson.title || person.title,
      functionName: opsPerson.functionName || person.functionName,
      status: opsPerson.status,
      hasProfile: opsPerson.hasProfile || person.type === "INTERN",
    };
  });
  const localEmails = new Set(local.map((person) => person.email.toLowerCase()));
  return [...merged, ...ops.filter((person) => !localEmails.has(person.email.toLowerCase())).map((person) => ({
    stableId: person.stableRef, name: person.name, email: person.email, type: "EMPLOYEE",
    status: person.status, title: person.title, role: person.title || person.role,
    functionName: person.functionName, managerId: person.managerRef, source: "ops",
    hasProfile: person.hasProfile,
  }))];
}
