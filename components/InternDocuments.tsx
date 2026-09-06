"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText, Eye } from "lucide-react";
import { uploadInternDocument, deleteInternDocument, type UploadResult } from "@/lib/intern-document-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { INTERN_DOCUMENT_KINDS, type InternDocument, type InternDocumentKind } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const REQUIRED: InternDocumentKind[] = ["NDA", "ACCEPTANCE_LETTER"];
/** Mirrors the server cap; checked here too so an oversized file is refused
 *  before it is sent (the framework body limit would abort the request). */
const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InternDocuments({
  internId,
  documents,
}: {
  internId: number;
  documents: InternDocument[];
}) {
  const [state, formAction, pending] = useActionState<UploadResult | null, FormData>(
    uploadInternDocument,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (state && "ok" in state) formRef.current?.reset();
  }, [state]);

  function checkSize(e: React.FormEvent<HTMLFormElement>) {
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file && file.size > MAX_BYTES) {
      e.preventDefault();
      setLocalError(`File is larger than 10 MB (${formatBytes(file.size)}).`);
      return;
    }
    setLocalError(null);
  }

  const have = new Set(documents.map((d) => d.kind));
  const missing = REQUIRED.filter((k) => !have.has(k));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {REQUIRED.map((k) => (
          <span
            key={k}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
              have.has(k) ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${have.has(k) ? "bg-green-500" : "bg-amber-500"}`} />
            {INTERN_DOCUMENT_KINDS[k]} {have.has(k) ? "on file" : "missing"}
          </span>
        ))}
        {missing.length === 0 && documents.length > 0 && (
          <span className="text-gray-400">All required paperwork uploaded.</span>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={checkSize}
        className="space-y-3 rounded-ios bg-gray-50 p-4"
      >
        <input type="hidden" name="internId" value={internId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Document type</span>
            <select
              name="kind"
              defaultValue={missing[0] ?? "OTHER"}
              className="vault-input"
            >
              {(Object.keys(INTERN_DOCUMENT_KINDS) as InternDocumentKind[]).map((k) => (
                <option key={k} value={k}>
                  {INTERN_DOCUMENT_KINDS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700">File</span>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              className="block w-full text-[13px] text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-white hover:file:bg-gray-800"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Note (optional)</span>
            <input name="note" placeholder="Signed on 12 Aug, countersigned by …" className="vault-input" />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-gray-400">
            PDF, Word or image · up to 10 MB · kept in the admin database, only downloadable when signed in.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white shadow-ios hover:bg-gray-800 disabled:opacity-60"
          >
            <Upload size={14} /> {pending ? "Uploading…" : "Upload"}
          </button>
        </div>
        {localError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{localError}</p>
        )}
        {!localError && state && "error" in state && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{state.error}</p>
        )}
        {!localError && state && "ok" in state && (
          <p className="rounded-xl bg-green-50 px-3 py-2 text-[13px] text-green-700">Uploaded.</p>
        )}
      </form>

      {documents.length === 0 ? (
        <p className="text-[13px] text-gray-400">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-ios bg-white shadow-ios">
          {documents.map((d) => {
            const href = `/interns/${internId}/documents/${d.id}`;
            const previewable = d.mimeType === "application/pdf" || d.mimeType.startsWith("image/");
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-gray-900">{d.fileName}</p>
                  <p className="truncate text-[12px] text-gray-400">
                    {INTERN_DOCUMENT_KINDS[d.kind] ?? d.kind} · {formatBytes(d.sizeBytes)} ·{" "}
                    {formatDateTime(d.uploadedAt)}
                    {d.uploadedBy && <> · {d.uploadedBy}</>}
                    {d.note && <> · {d.note}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {previewable && (
                    <a
                      href={`${href}?inline=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tap inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <Eye size={14} /> View
                    </a>
                  )}
                  <a
                    href={href}
                    className="tap inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Download size={14} /> Download
                  </a>
                  <form action={deleteInternDocument}>
                    <input type="hidden" name="internId" value={internId} />
                    <input type="hidden" name="documentId" value={d.id} />
                    <ConfirmButton
                      message={`Delete "${d.fileName}"? This cannot be undone.`}
                      className="tap inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
