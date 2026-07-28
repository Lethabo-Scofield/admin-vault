import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySessionToken,
  roleLabel,
  type Role,
} from "@/lib/auth";

export type CurrentUser = { email: string; role: string; roleKey: Role };

export async function getSession(): Promise<{ email: string; role: Role } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    email: session.email,
    role: roleLabel(session.role),
    roleKey: session.role,
  };
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
