"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifyCredentials,
  getAdminEmail,
  isDemoCredentials,
  hasSigningSecret,
} from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const isDemo = isDemoCredentials(email, password);

  if (!isDemo && !process.env.ADMIN_PASSWORD) {
    return { error: "Admin login is not configured. Set ADMIN_PASSWORD." };
  }

  const ok = await verifyCredentials(email, password);
  if (!ok) {
    return { error: "Invalid email or password." };
  }

  if (!hasSigningSecret()) {
    return {
      error: "Login is not configured. Set SESSION_SECRET or ADMIN_PASSWORD.",
    };
  }

  const token = await createSessionToken(
    isDemo ? "demo@olyxee.com" : getAdminEmail()
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
