"use client";

import { useState, useTransition } from "react";
import { Database, Plug, Unplug, X } from "lucide-react";
import {
  setProjectAnalyticsDb,
  clearProjectAnalyticsDb,
} from "@/lib/actions";

/**
 * Connect / replace / disconnect the application database that powers a
 * project's Traffic & Users section. The URL is sent once to the server,
 * stored encrypted, and never echoed back.
 */
export default function AnalyticsDbForm({
  projectId,
  connectedHost,
  variant = "button",
}: {
  projectId: number;
  connectedHost: string;
  /** "button" renders a compact trigger; "card" renders an inline call to action. */
  variant?: "button" | "card";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const connected = Boolean(connectedHost);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setProjectAnalyticsDb(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  function disconnect() {
    const formData = new FormData();
    formData.set("projectId", String(projectId));
    startTransition(async () => {
      await clearProjectAnalyticsDb(formData);
      setOpen(false);
    });
  }

  const trigger =
    variant === "card" ? (
      <button
        onClick={() => setOpen(true)}
        className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-gray-800"
      >
        <Plug size={16} /> Connect database
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13.5px] font-medium text-gray-700 hover:bg-gray-200"
      >
        <Database size={15} />
        {connected ? "Database" : "Connect database"}
      </button>
    );

  if (!open) return trigger;

  return (
    <>
      {trigger}
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div
          onClick={() => !pending && setOpen(false)}
          className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
        />
        <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-ios-md animate-ios-in sm:rounded-ios-lg">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-gray-900">
              {connected ? "Analytics database" : "Connect analytics database"}
            </h2>
            <button
              onClick={() => !pending && setOpen(false)}
              className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          {connected && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
                  Connected to
                </p>
                <p className="truncate font-mono text-[13px] text-gray-800">
                  {connectedHost}
                </p>
              </div>
              <button
                onClick={disconnect}
                disabled={pending}
                className="tap inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Unplug size={14} /> Disconnect
              </button>
            </div>
          )}

          <form action={submit} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-600">
                {connected
                  ? "Replace connection string"
                  : "PostgreSQL connection string"}
              </span>
              <input
                name="databaseUrl"
                type="password"
                autoComplete="off"
                required
                placeholder="postgresql://user:password@host:5432/db"
                className="vault-input font-mono"
              />
              <span className="mt-1.5 block text-[12px] leading-relaxed text-gray-400">
                Read access is enough. We verify the connection, then store the
                URL encrypted — it is never shown again. Works with Supabase
                pooler URLs.
              </span>
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="tap w-full rounded-xl bg-gray-900 py-3 text-[15px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {pending ? "Testing connection…" : connected ? "Save new connection" : "Connect"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
