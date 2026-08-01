"use client";

import { useState, useTransition } from "react";
import { User, Briefcase, FileText } from "lucide-react";
import { createIntern, updateIntern } from "@/lib/intern-actions";
import type { Intern } from "@/lib/types";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function toDateInput(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).slice(0, 10);
}

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "internship", label: "Internship", icon: Briefcase },
  { id: "writeups", label: "Write-ups & Notes", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function InternForm({ intern }: { intern?: Intern }) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("personal");
  const isEdit = Boolean(intern);

  function action(formData: FormData) {
    startTransition(async () => {
      if (isEdit) await updateIntern(formData);
      else await createIntern(formData);
    });
  }

  // All tab panels stay mounted (just hidden) so one Save submits everything.
  return (
    <form action={action} className="rounded-ios bg-white shadow-ios">
      {intern && <input type="hidden" name="internId" value={intern.id} />}

      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-3">
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

      <div className="p-6">
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${tab === "personal" ? "" : "hidden"}`}
        >
          <Field label="Full Name">
            <input
              name="fullName"
              required
              defaultValue={intern?.fullName ?? ""}
              placeholder="Jane Doe"
              className="vault-input"
            />
          </Field>
          <Field label="Email Address">
            <input
              name="email"
              type="email"
              defaultValue={intern?.email ?? ""}
              placeholder="jane@example.com"
              className="vault-input"
            />
          </Field>
          <Field label="Pronouns (never inferred from the name)">
            <select
              name="pronouns"
              defaultValue={intern?.pronouns ?? ""}
              className="vault-input"
            >
              <option value="">Not specified</option>
              <option value="SHE_HER">She / Her</option>
              <option value="HE_HIM">He / Him</option>
              <option value="THEY_THEM">They / Them</option>
            </select>
          </Field>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${tab === "internship" ? "" : "hidden"}`}
        >
          <Field label="Internship Position">
            <input
              name="position"
              defaultValue={intern?.position ?? ""}
              placeholder="Software Engineering Intern"
              className="vault-input"
            />
          </Field>
          <Field label="Department / Programme">
            <input
              name="department"
              defaultValue={intern?.department ?? ""}
              placeholder="Engineering"
              className="vault-input"
            />
          </Field>
          <Field label="Employment Status">
            <select
              name="employmentStatus"
              defaultValue={intern?.employmentStatus ?? "Active"}
              className="vault-input"
            >
              <option>Active</option>
              <option>Completed</option>
              <option>Withdrawn</option>
            </select>
          </Field>
          <Field label="Supervisor Name">
            <input
              name="supervisorName"
              defaultValue={intern?.supervisorName ?? ""}
              placeholder="John Smith"
              className="vault-input"
            />
          </Field>
          <Field label="Start Date">
            <input
              name="startDate"
              type="date"
              defaultValue={toDateInput(intern?.startDate)}
              className="vault-input"
            />
          </Field>
          <Field label="Completion Date">
            <input
              name="completionDate"
              type="date"
              defaultValue={toDateInput(intern?.completionDate)}
              className="vault-input"
            />
          </Field>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${tab === "writeups" ? "" : "hidden"}`}
        >
          <Field label="Projects Completed (one per line — shown as bullets)" full>
            <textarea
              name="projectsCompleted"
              rows={3}
              defaultValue={intern?.projectsCompleted ?? ""}
              className="vault-input resize-none"
            />
          </Field>
          <Field label="Responsibilities (one per line)" full>
            <textarea
              name="responsibilities"
              rows={3}
              defaultValue={intern?.responsibilities ?? ""}
              className="vault-input resize-none"
            />
          </Field>
          <Field label="Skills Demonstrated" full>
            <textarea
              name="skillsDemonstrated"
              rows={3}
              defaultValue={intern?.skillsDemonstrated ?? ""}
              className="vault-input resize-none"
            />
          </Field>
          <Field label="Supervisor Recommendation" full>
            <textarea
              name="supervisorRecommendation"
              rows={3}
              defaultValue={intern?.supervisorRecommendation ?? ""}
              className="vault-input resize-none"
            />
          </Field>
          <Field label="Internal Notes (never public)" full>
            <textarea
              name="internalNotes"
              rows={3}
              defaultValue={intern?.internalNotes ?? ""}
              className="vault-input resize-none"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-gray-400">
            One save applies changes from every tab.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="tap rounded-full bg-gray-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Intern"}
          </button>
        </div>
      </div>
    </form>
  );
}
