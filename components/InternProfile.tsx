"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, X, User, Briefcase, FileText, FolderKanban, Paperclip, Award, Plus } from "lucide-react";
import InternForm from "@/components/InternForm";
import InternProjects from "@/components/InternProjects";
import InternDocuments from "@/components/InternDocuments";
import type { Intern, InternCredential, InternDocument, InternProject } from "@/lib/types";
import CredentialStatusBadge from "@/components/CredentialStatusBadge";
import { itemColor, parseListItems } from "@/lib/list-items";
import { getEmployeeNumber } from "@/lib/employee-numbers";

const PRONOUNS: Record<string, string> = {
  SHE_HER: "She / Her",
  HE_HIM: "He / Him",
  THEY_THEM: "They / Them",
};

function date(v: string | null | undefined): string {
  return v ? String(v).slice(0, 10) : "—";
}

function Item({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line text-[14.5px] text-gray-900">
        {value?.trim() ? value : <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}

function ColoredItems({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const items = parseListItems(value);
  return (
    <div className="sm:col-span-2">
      <dt className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-2 flex flex-wrap gap-2">
        {items.length > 0 ? items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 ${itemColor(index)}`}
          >
            {item}
          </span>
        )) : <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "internship", label: "Internship", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "documents", label: "Documents", icon: Paperclip },
  { id: "writeups", label: "Write-ups & Notes", icon: FileText },
  { id: "certificates", label: "Certificates", icon: Award },
] as const;

const PANEL_TABS: ReadonlyArray<TabId> = ["projects", "documents", "certificates"];

type TabId = (typeof TABS)[number]["id"];

export default function InternProfile({
  intern,
  projects,
  documents,
  credentials,
  supervisors,
  showCertificates = false,
  initialTab = "projects",
  careerHistory = [],
}: {
  intern: Intern;
  projects: InternProject[];
  documents: InternDocument[];
  credentials: InternCredential[];
  supervisors: { email: string; label: string }[];
  showCertificates?: boolean;
  initialTab?: TabId;
  careerHistory?: { title: string; from: string; to: string | null }[];
}) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabId>(initialTab);

  if (editing) {
    return (
      <div>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-200"
          >
            <X size={15} /> Cancel Editing
          </button>
        </div>
        <InternForm
          intern={intern}
          supervisors={supervisors}
          onSaved={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-ios bg-white shadow-ios">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 pt-3">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.filter(({ id }) => id !== "personal" && (id !== "certificates" || showCertificates)).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`tap inline-flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-[13.5px] font-medium transition ${
                tab === id
                  ? "border-b-2 border-gray-900 text-gray-900"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="tap mb-1.5 inline-flex shrink-0 items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white shadow-ios hover:bg-gray-800"
        >
          <Pencil size={14} /> Edit
        </button>
      </div>

      {tab === "projects" && (
        <div className="p-6">
          <InternProjects internId={intern.id} projects={projects} goal={intern.projectGoal} />
        </div>
      )}
      {tab === "documents" && (
        <div className="p-6">
          <InternDocuments internId={intern.id} documents={documents} />
        </div>
      )}
      {tab === "certificates" && showCertificates && (
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 rounded-3xl bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Credential workspace</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">Official documents</h2><p className="mt-1 text-[13px] text-gray-500">Issue, review and manage certificates and completion letters for {intern.fullName}.</p></div><Link href={`/credentials/new?internId=${intern.id}`} className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-gray-800"><Plus size={15} /> Issue credential</Link></div>
          {credentials.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center"><p className="text-[14px] font-medium text-gray-700">No credentials yet</p><p className="mt-1 text-[13px] text-gray-400">Create the first certificate or completion letter for this intern.</p><Link href={`/credentials/new?internId=${intern.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-200"><Plus size={14} /> Create credential</Link></div> : <div className="grid gap-3 sm:grid-cols-2">{credentials.map((c) => <Link key={c.id} href={`/credentials/${c.id}`} className="group rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[14px] font-semibold text-gray-900 group-hover:underline">{c.credentialNumber}</p><p className="mt-1 text-[12px] text-gray-500">{c.programmeTitle || "Credential"}</p></div><CredentialStatusBadge status={c.status} /></div><p className="mt-5 text-[11px] text-gray-400">{c.issueDate ? `Issued ${String(c.issueDate).slice(0, 10)}` : "Draft — needs review"}</p></Link>)}</div>}
        </div>
      )}
      <dl
        className={`grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 ${PANEL_TABS.includes(tab) ? "hidden" : ""}`}
      >
        {tab === "personal" && (
          <>
            <Item label="Full Name" value={intern.fullName} />
            <Item label="Email Address" value={intern.email} />
            <Item label="Pronouns" value={PRONOUNS[intern.pronouns ?? ""] ?? ""} />
            <Item label={getEmployeeNumber(intern.email, intern.fullName) ? "Employee Number" : "Intern Number"} value={getEmployeeNumber(intern.email, intern.fullName) ?? intern.internNumber} />
          </>
        )}
        {tab === "internship" && (
          <>
            <Item label="Internship Position" value={intern.position} />
            <Item label="Department / Programme" value={intern.department} />
            <Item label="Employment Status" value={intern.employmentStatus} />
            <Item label="Supervisor Name" value={intern.supervisorName} />
            <Item label="Start Date" value={date(intern.startDate)} />
            <Item label="Planned End (3-month window)" value={date(intern.plannedEndDate)} />
            <Item label="Completion Date (actual)" value={date(intern.completionDate)} />
            <Item label="Project Goal" value={`${intern.projectsDone} of ${intern.projectGoal} completed`} />
            {careerHistory.length > 0 && (
              <div className="sm:col-span-2 mt-2 border-t border-gray-100 pt-5">
                <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">Career timeline</p>
                <div className="mt-3 space-y-3">
                  {careerHistory.map((event, index) => (
                    <div key={`${event.title}-${event.from}-${index}`} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-900" />
                      <div><p className="text-[14px] font-medium text-gray-900">{event.title}</p><p className="text-[12px] text-gray-500">{date(event.from)}{event.to ? ` — ${date(event.to)}` : " — Present"}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {tab === "writeups" && (
          <>
            <ColoredItems label="Responsibilities" value={intern.responsibilities} />
            <ColoredItems label="Skills Demonstrated" value={intern.skillsDemonstrated} />
            <Item label="Supervisor Recommendation" value={intern.supervisorRecommendation} full />
            <Item label="Internal Notes (never public)" value={intern.internalNotes} full />
          </>
        )}
      </dl>
    </div>
  );
}
