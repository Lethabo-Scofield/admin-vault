"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createProject } from "@/lib/actions";

export default function CreateProjectForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      await createProject(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
      >
        <Plus size={17} strokeWidth={2.4} />
        New Project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        onClick={() => !pending && setOpen(false)}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-ios-md animate-ios-in sm:rounded-ios-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">
            New Project
          </h2>
          <button
            onClick={() => !pending && setOpen(false)}
            className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form action={action} className="space-y-4">
          <Field label="Project Name">
            <input
              name="name"
              required
              autoFocus
              placeholder="Payments Gateway"
              className="vault-input"
            />
          </Field>
          <Field label="Category">
            <input
              name="category"
              placeholder="Infrastructure"
              className="vault-input"
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              rows={3}
              placeholder="What this project secures…"
              className="vault-input resize-none"
            />
          </Field>
          <Field label="Project Logo (optional)">
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="vault-input file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-gray-700"
            />
            <span className="mt-1 block text-[12px] text-gray-400">
              PNG, JPEG, WebP, GIF or SVG · up to 1 MB
            </span>
          </Field>

          <button
            type="submit"
            disabled={pending}
            className="tap mt-2 w-full rounded-xl bg-gray-900 py-3 text-[15px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create Project"}
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
