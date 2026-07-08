"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Trash2 } from "lucide-react";
import { updateCredential, deleteCredential } from "@/lib/actions";
import type { VaultCredential } from "@/lib/types";

const ENVIRONMENTS = ["Production", "Staging", "Development"];
const STATUSES = ["Active", "Revoked"];

export default function EditCredentialForm({
  credential,
}: {
  credential: VaultCredential;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      await updateCredential(formData);
      setOpen(false);
    });
  }

  function onDelete() {
    const formData = new FormData();
    formData.set("credentialId", String(credential.id));
    startTransition(async () => {
      await deleteCredential(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setConfirmDelete(false);
          setOpen(true);
        }}
        title="Edit credential"
        className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <Pencil size={15} />
      </button>
    );
  }

  const envOptions = ENVIRONMENTS.includes(credential.environment)
    ? ENVIRONMENTS
    : [credential.environment, ...ENVIRONMENTS].filter(Boolean);
  const statusOptions = STATUSES.includes(credential.status)
    ? STATUSES
    : [credential.status, ...STATUSES].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={() => !pending && setOpen(false)}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-ios-md animate-ios-in sm:rounded-ios-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">
            Edit Credential
          </h2>
          <button
            onClick={() => !pending && setOpen(false)}
            className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="credentialId" value={credential.id} />
          <Field label="Service Name">
            <input
              name="serviceName"
              required
              defaultValue={credential.serviceName}
              className="vault-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Environment">
              <select
                name="environment"
                defaultValue={credential.environment}
                className="vault-input"
              >
                {envOptions.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                name="status"
                defaultValue={credential.status}
                className="vault-input"
              >
                {statusOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Secret Value">
            <input
              name="secretValue"
              placeholder="Leave blank to keep current secret"
              className="vault-input font-mono"
            />
            <span className="mt-1 block text-[12px] text-gray-400">
              Enter a new value only if you want to rotate the secret.
            </span>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner Email">
              <input
                name="ownerEmail"
                type="email"
                defaultValue={credential.ownerEmail}
                placeholder="owner@olyxee.com"
                className="vault-input"
              />
            </Field>
            <Field label="Department">
              <input
                name="department"
                defaultValue={credential.department}
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
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </form>

        <div className="mt-5 border-t border-gray-100 pt-4">
          {confirmDelete ? (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="mb-3 text-[13px] font-medium text-red-700">
                Delete “{credential.serviceName}”? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  disabled={pending}
                  className="tap flex-1 rounded-lg bg-red-600 py-2 text-[13.5px] font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                  className="tap flex-1 rounded-lg bg-white py-2 text-[13.5px] font-medium text-gray-700 shadow-ios hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="tap flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete Credential
            </button>
          )}
        </div>
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
