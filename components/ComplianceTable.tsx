"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileText, ShieldCheck, Eye, Download, Trash2 } from "lucide-react";
import type { ComplianceDocument } from "@/lib/types";
import { formatFileSize, shortChecksum, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";
import { deleteDocument } from "@/lib/actions";

export default function ComplianceTable({
  documents,
}: {
  documents: ComplianceDocument[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((d) =>
      [d.fileName, d.projectName, d.classification, d.uploadedBy, d.sha256]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    );
  }, [q, documents]);

  return (
    <>
      <div className="relative mb-5 max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by file, project, classification…"
          className="vault-input !pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={26} />}
          title={q ? "No matches" : "No documents yet"}
          description={
            q
              ? "Try a different search term."
               : "Upload company documents here or from a project."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-ios bg-white shadow-ios">
          <div className="hidden grid-cols-12 gap-4 border-b border-gray-100 px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-gray-400 md:grid">
            <span className="col-span-4">Document</span>
            <span className="col-span-3">Checksum (SHA-256)</span>
            <span className="col-span-2">Project</span>
            <span className="col-span-1">Size</span>
            <span className="col-span-1">Classification</span>
            <span className="col-span-1 text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-12 md:items-center"
              >
                <div className="flex items-center gap-3 md:col-span-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                    <FileText size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-gray-900">
                      {d.fileName}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      {formatDate(d.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <code className="font-mono text-[12.5px] text-gray-500">
                    {shortChecksum(d.sha256) || "—"}
                  </code>
                </div>
                <div className="md:col-span-1">
                  {d.projectName ? (
                    <Link
                      href={`/projects/${d.projectId}`}
                      className="text-[13.5px] text-gray-600 hover:text-gray-900 hover:underline"
                    >
                      {d.projectName}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] text-gray-400">—</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1 md:col-span-1">
                  {d.hasContent ? (
                    <>
                      <a
                        href={`/compliance/documents/${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${d.fileName}`}
                        title="View"
                        className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Eye size={15} />
                      </a>
                      <a
                        href={`/compliance/documents/${d.id}?download=1`}
                        aria-label={`Download ${d.fileName}`}
                        title="Download"
                        className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Download size={15} />
                      </a>
                    </>
                  ) : (
                    <span className="mr-1 text-[11px] text-amber-600" title="This record was created before file storage was enabled.">
                      Re-upload
                    </span>
                  )}
                  <form action={deleteDocument}>
                    <input type="hidden" name="documentId" value={d.id} />
                    <ConfirmButton
                      message={`Delete "${d.fileName}"? This cannot be undone.`}
                      aria-label={`Delete ${d.fileName}`}
                      title="Delete"
                      className="tap flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </ConfirmButton>
                  </form>
                </div>
                <div className="text-[13px] text-gray-600 md:col-span-1">
                  {formatFileSize(d.fileSizeBytes)}
                </div>
                <div className="md:col-span-2">
                  {d.classification ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-medium text-gray-600">
                      {d.classification}
                    </span>
                  ) : (
                    <span className="text-[13px] text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
