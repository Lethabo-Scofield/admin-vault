"use client";

import { useTransition } from "react";
import {
  createInternCredential,
  updateInternCredential,
} from "@/lib/intern-actions";
import type { Intern, InternCredential } from "@/lib/types";

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

export default function InternCredentialForm({
  interns,
  credential,
  defaults,
  defaultInternId,
}: {
  interns?: Pick<Intern, "id" | "internNumber" | "fullName">[];
  credential?: InternCredential;
  /** Prefill values (from the intern's record) when creating a new credential. */
  defaults?: Partial<InternCredential>;
  defaultInternId?: number;
}) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(credential);
  const d = credential ?? defaults;

  function action(formData: FormData) {
    startTransition(async () => {
      if (isEdit) await updateInternCredential(formData);
      else await createInternCredential(formData);
    });
  }

  return (
    <form action={action} className="rounded-ios bg-white p-6 shadow-ios">
      {credential && (
        <input type="hidden" name="credentialId" value={credential.id} />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!isEdit && interns && (
          <Field label="Intern" full>
            <select
              name="internId"
              required
              defaultValue={defaultInternId ?? ""}
              className="vault-input"
            >
              <option value="" disabled>
                Select an intern…
              </option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.internNumber} — {i.fullName}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Programme / Internship Title">
          <input
            name="programmeTitle"
            required
            defaultValue={d?.programmeTitle ?? ""}
            placeholder="Olyxee Software Engineering Internship"
            className="vault-input"
          />
        </Field>
        <Field label="Position">
          <input
            name="position"
            defaultValue={d?.position ?? ""}
            placeholder="Software Engineering Intern"
            className="vault-input"
          />
        </Field>
        <Field label="Department">
          <input
            name="department"
            defaultValue={d?.department ?? ""}
            placeholder="Engineering Department"
            className="vault-input"
          />
        </Field>
        <Field label="Pronouns (never inferred from the name)">
          <select
            name="pronouns"
            defaultValue={d?.pronouns ?? ""}
            className="vault-input"
          >
            <option value="">Not specified (uses they/them)</option>
            <option value="SHE_HER">She / Her</option>
            <option value="HE_HIM">He / Him</option>
            <option value="THEY_THEM">They / Them</option>
          </select>
        </Field>
        <Field label="Start Date">
          <input
            name="startDate"
            type="date"
            defaultValue={toDateInput(d?.startDate)}
            className="vault-input"
          />
        </Field>
        <Field label="Completion Date">
          <input
            name="completionDate"
            type="date"
            defaultValue={toDateInput(d?.completionDate)}
            className="vault-input"
          />
        </Field>
        <Field label="Projects & Responsibilities Completed" full>
          <textarea
            name="projectsCompleted"
            rows={4}
            defaultValue={d?.projectsCompleted ?? ""}
            className="vault-input resize-none"
          />
        </Field>
        <Field label="Skills Demonstrated" full>
          <textarea
            name="skillsDemonstrated"
            rows={3}
            defaultValue={d?.skillsDemonstrated ?? ""}
            className="vault-input resize-none"
          />
        </Field>
        <Field label="Responsibilities" full>
          <textarea
            name="responsibilities"
            rows={3}
            defaultValue={d?.responsibilities ?? ""}
            className="vault-input resize-none"
          />
        </Field>
        <Field label="Public Supervisor Recommendation" full>
          <textarea
            name="publicRecommendation"
            rows={3}
            defaultValue={d?.publicRecommendation ?? ""}
            className="vault-input resize-none"
          />
        </Field>
        <Field label="Founder Name">
          <input
            name="founderName"
            defaultValue={d?.founderName ?? ""}
            placeholder="Dzowa"
            className="vault-input"
          />
        </Field>
        <Field label="Founder Title">
          <input
            name="founderTitle"
            defaultValue={d?.founderTitle ?? ""}
            placeholder="Founder & CEO"
            className="vault-input"
          />
        </Field>
        <Field label="Founder Recommendation" full>
          <textarea
            name="founderRecommendation"
            rows={3}
            defaultValue={d?.founderRecommendation ?? ""}
            className="vault-input resize-none"
          />
        </Field>
        <Field label="Manager Name">
          <input
            name="managerName"
            defaultValue={d?.managerName ?? ""}
            placeholder="Laura"
            className="vault-input"
          />
        </Field>
        <Field label="Manager Title">
          <input
            name="managerTitle"
            defaultValue={d?.managerTitle ?? ""}
            placeholder="Department Manager"
            className="vault-input"
          />
        </Field>
        <Field label="Manager Recommendation" full>
          <textarea
            name="managerRecommendation"
            rows={3}
            defaultValue={d?.managerRecommendation ?? ""}
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
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Save as Draft"}
        </button>
      </div>
    </form>
  );
}
