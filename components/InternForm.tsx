"use client";

import { useTransition } from "react";
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

export default function InternForm({ intern }: { intern?: Intern }) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(intern);

  function action(formData: FormData) {
    startTransition(async () => {
      if (isEdit) await updateIntern(formData);
      else await createIntern(formData);
    });
  }

  return (
    <form
      action={action}
      className="rounded-ios bg-white p-6 shadow-ios"
    >
      {intern && <input type="hidden" name="internId" value={intern.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name">
          <input
            name="fullName"
            required
            defaultValue={intern?.fullName ?? ""}
            placeholder="Jane Doe"
            className="vault-input"
          />
        </Field>
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
        <Field label="Supervisor Name">
          <input
            name="supervisorName"
            defaultValue={intern?.supervisorName ?? ""}
            placeholder="John Smith"
            className="vault-input"
          />
        </Field>
        <Field label="Projects Completed" full>
          <textarea
            name="projectsCompleted"
            rows={3}
            defaultValue={intern?.projectsCompleted ?? ""}
            className="vault-input resize-none"
          />
        </Field>
        <Field label="Responsibilities" full>
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
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="tap rounded-full bg-gray-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Intern"}
        </button>
      </div>
    </form>
  );
}
