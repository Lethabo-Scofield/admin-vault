"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, getSql } from "@/lib/db";
import { getAdminEmail, type Permission } from "@/lib/auth";

export interface WorkspaceAccount {
  id: number;
  email: string;
  displayName: string;
  manageInterns: boolean;
  manageProjects: boolean;
  active: boolean;
  createdAt: string;
}

async function db() {
  await ensureSchema();
  return getSql();
}

export async function findActiveWorkspaceAccount(email: string): Promise<{
  email: string;
  displayName: string;
  permissions: Permission[];
} | null> {
  const sql = await db();
  const [row] = await sql<{
    email: string;
    displayName: string;
    manageInterns: boolean;
    manageProjects: boolean;
  }[]>`
    select email, display_name as "displayName", manage_interns as "manageInterns",
      manage_projects as "manageProjects"
    from workspace_accounts
    where lower(email) = ${email.trim().toLowerCase()} and active = true
  `;
  if (!row) return null;
  const permissions: Permission[] = [];
  if (row.manageInterns) permissions.push("MANAGE_INTERNS");
  if (row.manageProjects) permissions.push("MANAGE_PROJECTS");
  return { email: row.email.toLowerCase(), displayName: row.displayName, permissions };
}

export async function getWorkspaceAccounts(): Promise<WorkspaceAccount[]> {
  const { requireSuperAdmin } = await import("@/lib/session");
  await requireSuperAdmin();
  const sql = await db();
  return sql<WorkspaceAccount[]>`
    select id, email, display_name as "displayName",
      manage_interns as "manageInterns",
      manage_projects as "manageProjects", active,
      created_at as "createdAt"
    from workspace_accounts order by active desc, display_name, email
  `;
}

export async function getActiveSupervisors(): Promise<
  { email: string; label: string }[]
> {
  const sql = await db();
  const rows = await sql<{ email: string; displayName: string }[]>`
    select email, display_name as "displayName"
    from workspace_accounts
    where active = true and manage_interns = true
    order by display_name, email
  `;
  return rows.map((row) => ({
    email: row.email,
    label: row.displayName.trim() || row.email,
  }));
}

function value(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function saveWorkspaceAccount(formData: FormData): Promise<void> {
  const { requireSuperAdmin } = await import("@/lib/session");
  const actor = await requireSuperAdmin();
  const id = Number(formData.get("id"));
  const email = value(formData, "email", 320).toLowerCase();
  const displayName = value(formData, "displayName", 160);
  if (!email || !email.includes("@")) throw new Error("Enter a valid email address.");
  if (email === getAdminEmail()) {
    throw new Error("The default admin email is reserved for Super Admin.");
  }
  const manageInterns = formData.get("manageInterns") === "on";
  const manageProjects = formData.get("manageProjects") === "on";
  const active = formData.get("active") === "on";
  if (!manageInterns && !manageProjects) {
    throw new Error("Select at least one permission.");
  }
  const sql = await db();
  await sql.begin(async (tx) => {
    if (id) {
      await tx`
        update workspace_accounts set email=${email}, display_name=${displayName},
          manage_interns=${manageInterns}, manage_projects=${manageProjects},
          active=${active}, updated_at=now()
        where id=${id}
      `;
    } else {
      await tx`
        insert into workspace_accounts
          (email, display_name, manage_interns, manage_projects, active, created_by)
        values (${email}, ${displayName}, ${manageInterns}, ${manageProjects}, ${active}, ${actor.email})
      `;
    }
    await tx`
      insert into audit_logs (action, actor_email, actor_role, ip_address, status)
      values (${id ? `Updated workspace account ${email}` : `Invited workspace account ${email}`},
        ${actor.email}, ${actor.role}, ${"10.0.0.1"}, ${"SUCCESS"})
    `;
  });
  revalidatePath("/settings");
  revalidatePath("/interns");
  revalidatePath("/audit-logs");
}