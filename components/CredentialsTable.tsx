"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, KeyRound } from "lucide-react";
import type { VaultCredential } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { EnvBadge, StatusBadge, EmptyState } from "@/components/ui";
import SecretCell from "@/components/SecretCell";
import EditCredentialForm from "@/components/EditCredentialForm";

export default function CredentialsTable({
  credentials,
}: {
  credentials: VaultCredential[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return credentials;
    return credentials.filter((c) =>
      [c.serviceName, c.projectName, c.ownerEmail, c.department, c.environment, c.status]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    );
  }, [q, credentials]);

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
          placeholder="Search by service, project, owner…"
          className="vault-input !pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<KeyRound size={26} />}
          title={q ? "No matches" : "No credentials yet"}
          description={
            q
              ? "Try a different search term."
              : "Credentials added inside projects appear here."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-ios bg-white shadow-ios">
          <div className="hidden grid-cols-12 gap-4 border-b border-gray-100 px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-gray-400 md:grid">
            <span className="col-span-3">Service</span>
            <span className="col-span-3">Secret</span>
            <span className="col-span-2">Project</span>
            <span className="col-span-2">Environment</span>
            <span className="col-span-1">Status</span>
            <span className="col-span-1 text-right">Edit</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-3">
                  <p className="text-[14px] font-medium text-gray-900">
                    {c.serviceName}
                  </p>
                  <p className="text-[12px] text-gray-400">
                    {c.ownerEmail || "No owner"}
                  </p>
                </div>
                <div className="md:col-span-3">
                  <SecretCell secret={c.secretValue} />
                </div>
                <div className="md:col-span-2">
                  {c.projectName ? (
                    <Link
                      href={`/projects/${c.projectId}`}
                      className="text-[13.5px] text-gray-600 hover:text-gray-900 hover:underline"
                    >
                      {c.projectName}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] text-gray-400">—</span>
                  )}
                  <p className="text-[12px] text-gray-300">
                    {formatDate(c.createdAt)}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <EnvBadge environment={c.environment} />
                </div>
                <div className="md:col-span-1">
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex md:col-span-1 md:justify-end">
                  <EditCredentialForm credential={c} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
