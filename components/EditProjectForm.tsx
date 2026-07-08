"use client";

import { useState, useTransition } from "react";
import { Pencil, X, Trash2 } from "lucide-react";
import { updateProject, deleteProject } from "@/lib/actions";
import type { Project } from "@/lib/types";

export default function EditProjectForm({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      await updateProject(formData);
      setOpen(false);
    });
  }

  function onDelete() {
    const formData = new FormData();
    formData.set("projectId", String(project.id));
    startTransition(async () => {
      await deleteProject(formData);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setConfirmDelete(false);
          setOpen(true);
        }}
        className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13.5px] font-medium text-gray-700 hover:bg-gray-200"
      >
        <Pencil size={15} />
        Edit
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
            Edit Project
          </h2>
          <button
            onClick={() => !pending && setOpen(false)}
            className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="projectId" value={project.id} />
          <Field label="Project Name">
            <input
              name="name"
              required
              defaultValue={project.name}
              className="vault-input"
            />
          </Field>
          <Field label="Category">
            <input
              name="category"
              defaultValue={project.category}
              placeholder="Infrastructure"
              className="vault-input"
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              rows={3}
              defaultValue={project.description}
              placeholder="What this project secures…"
              className="vault-input resize-none"
            />
          </Field>
          <Field label="Project Logo (optional)">
            {project.logoUrl ? (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.logoUrl}
                  alt="Current logo"
                  className="h-10 w-10 rounded-xl object-cover shadow-ios"
                />
                <label className="flex items-center gap-2 text-[13px] text-gray-600">
                  <input type="checkbox" name="removeLogo" className="rounded" />
                  Remove current logo
                </label>
              </div>
            ) : null}
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="vault-input file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-gray-700"
            />
            <span className="mt-1 block text-[12px] text-gray-400">
              Upload to replace · PNG, JPEG, WebP, GIF or SVG · up to 1 MB
            </span>
          </Field>

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
                Delete “{project.name}”? All its credentials and documents will
                be permanently removed.
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
              Delete Project
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
