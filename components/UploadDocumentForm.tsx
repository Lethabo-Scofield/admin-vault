"use client";

import { useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { uploadDocument } from "@/lib/actions";

export default function UploadDocumentForm({
  projectId,
  projects,
}: {
  projectId?: number;
  projects?: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      await uploadDocument(formData);
      setOpen(false);
      setFileName("");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13.5px] font-medium text-gray-700 shadow-ios hover:bg-gray-50"
      >
        <Upload size={16} strokeWidth={2.2} />
        Upload Doc
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={() => !pending && setOpen(false)}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-ios-md animate-ios-in sm:rounded-ios-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900">
            Upload Company Document
          </h2>
          <button
            onClick={() => !pending && setOpen(false)}
            className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form action={action} className="space-y-4">
          {projectId ? (
            <input type="hidden" name="projectId" value={projectId} />
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-600">
                Project
              </span>
              <select name="projectId" required defaultValue="" className="vault-input">
                <option value="" disabled>Select a project…</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-gray-300 hover:bg-gray-100">
            <Upload size={22} className="mb-2 text-gray-400" />
            <span className="text-[13.5px] font-medium text-gray-700">
              {fileName || "Choose a file"}
            </span>
            <span className="mt-0.5 text-[12px] text-gray-400">
              PDF, document, image, or text · up to 10 MB
            </span>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-600">
              Classification
            </span>
            <select
              name="classification"
              defaultValue="Confidential"
              className="vault-input"
            >
              <option>Public</option>
              <option>Internal</option>
              <option>Confidential</option>
              <option>Restricted</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={pending}
            className="tap mt-2 w-full rounded-xl bg-gray-900 py-3 text-[15px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {pending ? "Uploading…" : "Upload Document"}
          </button>
        </form>
      </div>
    </div>
  );
}
