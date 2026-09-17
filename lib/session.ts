import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySessionToken,
  roleLabel,
  type Permission,
  type Role,
} from "@/lib/auth";
import { findActiveWorkspaceAccount } from "@/lib/workspace-accounts";

export type CurrentUser = {
  email: string;
  role: string;
  roleKey: Role;
  permissions: Permission[];
};

export async function getSession(): Promise<{ email: string; role: Role } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const permissions =
    session.role === "SUPER_ADMIN"
      ? (["MANAGE_INTERNS", "MANAGE_PROJECTS"] as Permission[])
      : (await findActiveWorkspaceAccount(session.email))?.permissions;
  if (!permissions) return null;
  return {
    email: session.email,
    role: roleLabel(session.role),
    roleKey: session.role,
    permissions,
  };
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) {
    throw new Error("Forbidden: this workspace account does not have permission.");
  }
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: no valid admin session.");
  }
  return user;
}

/** Server-side guard for super-admin-only actions, queries and routes. */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.roleKey !== "SUPER_ADMIN") {
    throw new Error("Forbidden: super admin access required.");
  }
  return user;
}
