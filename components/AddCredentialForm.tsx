"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addCredential } from "@/lib/actions";

export default function AddCredentialForm({
  projectId,
}: {
  projectId: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      await addCredential(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[13.5px] font-medium text-white shadow-ios hover:bg-gray-800"
      >
        <Plus size={16} strokeWidth={2.4} />
        Add Key
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={() => !pending && setOpen(false)}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-ios-md animate-ios-in sm:rounded-ios-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">
            Add Credential
          </h2>
          <button
            onClick={() => !pending && setOpen(false)}
            className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <Field label="Service Name">
            <input
              name="serviceName"
              required
              autoFocus
              placeholder="Stripe API Key"
              className="vault-input"
            />
          </Field>
          <Field label="Key Type">
            <input
              name="keyType"
              required
              maxLength={100}
              placeholder="e.g. Database, API, Authentication"
              className="vault-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Environment">
              <select name="environment" defaultValue="Production" className="vault-input">
                <option>Production</option>
                <option>Staging</option>
                <option>Development</option>
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue="Active" className="vault-input">
                <option>Active</option>
                <option>Revoked</option>
              </select>
            </Field>
          </div>
          <Field label="Secret Value">
            <input
              name="secretValue"
              required
              placeholder="sk_live_••••••••"
              className="vault-input font-mono"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner Email">
              <input
                name="ownerEmail"
                type="email"
                placeholder="owner@olyxee.com"
                className="vault-input"
              />
            </Field>
            <Field label="Department">
              <input
                name="department"
                placeholder="Engineering"
                className="vault-input"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="tap mt-2 w-full rounded-xl bg-gray-900 py-3 text-[15px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save Credential"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}
