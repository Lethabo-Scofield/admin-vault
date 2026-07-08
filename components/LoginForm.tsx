"use client";

import { useActionState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { login, type LoginState } from "@/lib/auth-actions";

const initial: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-3xl border border-gray-200/70 bg-white/80 p-7 shadow-ios-md backdrop-blur-xl"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Olyxee"
          className="mb-4 h-14 w-14 rounded-2xl object-cover shadow-ios"
        />
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
          Olyxee Vault
        </h1>
        <p className="mt-1 text-[14px] text-gray-400">
          Admin sign in
        </p>
      </div>

      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
        Email
      </label>
      <input
        name="email"
        type="text"
        autoComplete="username"
        required
        defaultValue="admin@olyxee.com"
        className="vault-input mb-4 w-full"
        placeholder="admin@olyxee.com"
      />

      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
        Password
      </label>
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="vault-input mb-2 w-full"
        placeholder="••••••••"
      />

      {state.error ? (
        <div className="mb-2 mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-600">
          <AlertCircle size={16} />
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-[15px] font-semibold text-white shadow-ios transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 size={18} className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {process.env.NODE_ENV !== "production" ? (
        <p className="mt-4 text-center text-[12px] text-gray-400">
          Preview access: use <span className="font-medium">demo</span> /{" "}
          <span className="font-medium">demo</span>
        </p>
      ) : null}
    </form>
  );
}
