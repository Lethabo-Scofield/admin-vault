// Node-only password verification (bcrypt). Never import from edge code (proxy.ts).
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/auth";
import { isDemoCredentials, getAdminEmail } from "@/lib/auth";

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function matches(
  password: string,
  hashEnv: string | undefined,
  plainEnv: string | undefined
): Promise<boolean> {
  if (hashEnv) {
    try {
      return await bcrypt.compare(password, hashEnv);
    } catch {
      return false;
    }
  }
  if (plainEnv) return timingSafeEqualStr(password, plainEnv);
  return false;
}

export function isLoginConfigured(): boolean {
  return Boolean(
    process.env.SUPERADMIN_PASSWORD_HASH ||
      process.env.SUPERADMIN_PASSWORD ||
      process.env.ENGINEER_PASSWORD_HASH ||
      process.env.ENGINEER_PASSWORD ||
      process.env.ADMIN_PASSWORD
  );
}

/**
 * Resolve the role for a login attempt, or null if the credentials are invalid.
 * Order matters: the super-admin secret is checked first so it always wins.
 * Both roles may sign in with the same email — the password decides the role.
 * - SUPERADMIN_PASSWORD_HASH (bcrypt) or SUPERADMIN_PASSWORD  -> SUPER_ADMIN
 * - ENGINEER_PASSWORD_HASH (bcrypt) or ENGINEER_PASSWORD      -> FOUNDER_ENGINEER
 * - ADMIN_PASSWORD (the engineering team's normal password)   -> FOUNDER_ENGINEER
 * - demo/demo outside production                              -> SUPER_ADMIN
 */
export async function resolveLoginRole(
  email: string,
  password: string
): Promise<{ role: Role; email: string } | null> {
  if (isDemoCredentials(email, password)) {
    return { role: "SUPER_ADMIN", email: "demo@olyxee.com" };
  }
  const normalized = email.trim().toLowerCase();

  if (
    await matches(
      password,
      process.env.SUPERADMIN_PASSWORD_HASH,
      process.env.SUPERADMIN_PASSWORD
    )
  ) {
    return { role: "SUPER_ADMIN", email: normalized || getAdminEmail() };
  }
  if (
    await matches(
      password,
      process.env.ENGINEER_PASSWORD_HASH,
      process.env.ENGINEER_PASSWORD
    )
  ) {
    return { role: "FOUNDER_ENGINEER", email: normalized || "engineer@olyxee.com" };
  }
  // ADMIN_PASSWORD is the engineering team's normal password (same email,
  // different password than the super admin).
  const admin = process.env.ADMIN_PASSWORD;
  if (admin && timingSafeEqualStr(password, admin)) {
    return { role: "FOUNDER_ENGINEER", email: normalized || getAdminEmail() };
  }
  return null;
}

/** Simple in-memory login rate limiter (per key, e.g. IP). */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
