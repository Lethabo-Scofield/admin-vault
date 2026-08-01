"use client";

import { useState } from "react";
import { Pencil, X, User, Briefcase, FileText, ListChecks } from "lucide-react";
import InternForm from "@/components/InternForm";
import InternTasks from "@/components/InternTasks";
import type { Intern, InternTask } from "@/lib/types";

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

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "internship", label: "Internship", icon: Briefcase },
  { id: "writeups", label: "Write-ups & Notes", icon: FileText },
  { id: "tasks", label: "Tasks & PRs", icon: ListChecks },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function InternProfile({
  intern,
  tasks,
}: {
  intern: Intern;
  tasks: InternTask[];
}) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabId>("personal");

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
        <InternForm intern={intern} onSaved={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="rounded-ios bg-white shadow-ios">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 pt-3">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
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

      {tab === "tasks" && (
        <div className="p-6">
          <InternTasks
            internId={intern.id}
            tasks={tasks}
            defaultAssignedBy={intern.supervisorName}
          />
        </div>
      )}

      <dl
        className={`grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 ${tab === "tasks" ? "hidden" : ""}`}
      >
        {tab === "personal" && (
          <>
            <Item label="Full Name" value={intern.fullName} />
            <Item label="Email Address" value={intern.email} />
            <Item label="Pronouns" value={PRONOUNS[intern.pronouns ?? ""] ?? ""} />
            <Item label="Intern Number" value={intern.internNumber} />
          </>
        )}
        {tab === "internship" && (
          <>
            <Item label="Internship Position" value={intern.position} />
            <Item label="Department / Programme" value={intern.department} />
            <Item label="Employment Status" value={intern.employmentStatus} />
            <Item label="Supervisor Name" value={intern.supervisorName} />
            <Item label="Start Date" value={date(intern.startDate)} />
            <Item label="Completion Date" value={date(intern.completionDate)} />
          </>
        )}
        {tab === "writeups" && (
          <>
            <Item label="Projects Completed" value={intern.projectsCompleted} full />
            <Item label="Responsibilities" value={intern.responsibilities} full />
            <Item label="Skills Demonstrated" value={intern.skillsDemonstrated} full />
            <Item label="Supervisor Recommendation" value={intern.supervisorRecommendation} full />
            <Item label="Internal Notes (never public)" value={intern.internalNotes} full />
          </>
        )}
      </dl>
    </div>
  );
}
