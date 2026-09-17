"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, KeyRound, Database, Plug, ShieldCheck, Boxes } from "lucide-react";
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
  const [category, setCategory] = useState<CredentialCategory>("all");

  const counts = useMemo(() => {
    const result: Record<CredentialCategory, number> = {
      all: credentials.length,
      database: 0,
      services: 0,
      security: 0,
      other: 0,
    };
    credentials.forEach((credential) => {
      result[credentialCategory(credential.serviceName)] += 1;
    });
    return result;
  }, [credentials]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return credentials
      .filter(
        (credential) =>
          category === "all" ||
          credentialCategory(credential.serviceName) === category
      )
      .filter(
        (credential) =>
          !term ||
          [
            credential.serviceName,
            credential.projectName,
            credential.ownerEmail,
            credential.department,
            credential.environment,
            credential.status,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term))
      )
      .sort(
        (a, b) =>
          (a.projectName ?? "").localeCompare(b.projectName ?? "") ||
          a.serviceName.localeCompare(b.serviceName)
      );
  }, [q, category, credentials]);

  return (
    <>
      <div className="mb-5 rounded-ios bg-white p-2 shadow-ios">
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORY_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`tap inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${
                category === id
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={15} />
              {label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  category === id ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {counts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-5 w-full">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${category === "all" ? "all keys" : CATEGORY_TABS.find((tab) => tab.id === category)?.label.toLowerCase()}…`}
            className="vault-input h-12 w-full !pl-12 !pr-4"
          />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<KeyRound size={26} />}
          title={q ? "No matching keys" : `No ${category === "all" ? "" : CATEGORY_TABS.find((tab) => tab.id === category)?.label.toLowerCase() + " "}keys`}
          description={
            q
              ? "Try a different search term or another category."
              : category === "all"
                ? "Keys added inside projects appear here."
                : "Keys are categorized automatically from their service names."
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
                  {c.projectStatus === "SUSPENDED" ? (
                    <span className="text-[12px] text-gray-400">Read-only</span>
                  ) : (
                    <EditCredentialForm credential={c} />
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

type CredentialCategory = "all" | "database" | "services" | "security" | "other";

const CATEGORY_TABS: {
  id: CredentialCategory;
  label: string;
  icon: typeof KeyRound;
}[] = [
  { id: "all", label: "All Keys", icon: KeyRound },
  { id: "database", label: "Databases", icon: Database },
  { id: "services", label: "APIs & Services", icon: Plug },
  { id: "security", label: "Auth & Security", icon: ShieldCheck },
  { id: "other", label: "Other", icon: Boxes },
];

function credentialCategory(serviceName: string): Exclude<CredentialCategory, "all"> {
  const name = serviceName.toLowerCase();

  if (
    /(database|\bdb\b|postgres|mysql|mariadb|mongo|redis|supabase|neon|planetscale|cockroach|sqlite|dynamo|firestore)/.test(
      name
    )
  ) {
    return "database";
  }
  if (
    /(auth|oauth|jwt|session|clerk|auth0|captcha|turnstile|encryption|signing|security)/.test(
      name
    )
  ) {
    return "security";
  }
  if (
    /(api|webhook|stripe|paypal|sendgrid|mailgun|twilio|openai|anthropic|aws|azure|google|github|gitlab|vercel|netlify|cloudflare|slack|notion|shopify)/.test(
      name
    )
  ) {
    return "services";
  }
  return "other";
}
