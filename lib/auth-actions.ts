"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  hasSigningSecret,
  roleLabel,
} from "@/lib/auth";
import {
  resolveLoginRole,
  isLoginConfigured,
  checkRateLimit,
  clearRateLimit,
} from "@/lib/passwords";
import { getSql, ensureSchema } from "@/lib/db";
import { getSession } from "@/lib/session";

export type LoginState = { error: string | null };

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

async function audit(
  action: string,
  actorEmail: string,
  actorRole: string,
  ip: string,
  status: string
): Promise<void> {
  try {
    await ensureSchema();
    await getSql()`
      insert into audit_logs (action, actor_email, actor_role, ip_address, status)
      values (${action}, ${actorEmail}, ${actorRole}, ${ip}, ${status})
    `;
  } catch {
    // Never block auth on audit failures.
  }
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ip = await clientIp();

  if (!checkRateLimit(ip)) {
    await audit("Login blocked by rate limit", email, "-", ip, "FAILURE");
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  if (!isLoginConfigured() && !(await resolveLoginRole(email, password))) {
    return {
      error:
        "Login is not configured. Set SUPERADMIN_PASSWORD_HASH / ENGINEER_PASSWORD_HASH.",
    };
  }

  const resolved = await resolveLoginRole(email, password);
  if (!resolved) {
    await audit("Login failed", email, "-", ip, "FAILURE");
    return { error: "Invalid email or password." };
  }

  if (!hasSigningSecret()) {
    return { error: "Login is not configured. Set SESSION_SECRET." };
  }

  clearRateLimit(ip);
  const token = await createSessionToken(resolved.email, resolved.role);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  await audit(
    "Login succeeded",
    resolved.email,
    roleLabel(resolved.role),
    ip,
    "SUCCESS"
  );
  redirect("/");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  (await cookies()).delete(SESSION_COOKIE);
  if (session) {
    await audit(
      "Logout",
      session.email,
      roleLabel(session.role),
      await clientIp(),
      "SUCCESS"
    );
  }
  redirect("/login");
}
