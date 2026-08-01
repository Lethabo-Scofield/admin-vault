"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
              onChange={(e) => {
                // Reload the page with the chosen intern so every field below
                // prefills from their profile — nothing has to be typed twice.
                const id = e.target.value;
                if (id) router.replace(`/credentials/new?internId=${id}`);
              }}
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
        <div className="sm:col-span-2 rounded-ios bg-gray-50 px-4 py-3 text-[13px] text-gray-600">
          <div className="mb-1 font-medium text-gray-800">
            From the intern profile (synced automatically on save)
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <div>Position: <b>{d?.position || "—"}</b></div>
            <div>Department: <b>{d?.department || "—"}</b></div>
            <div>
              Pronouns:{" "}
              <b>
                {d?.pronouns === "SHE_HER"
                  ? "She / Her"
                  : d?.pronouns === "HE_HIM"
                    ? "He / Him"
                    : d?.pronouns === "THEY_THEM"
                      ? "They / Them"
                      : "Not specified (they/them)"}
              </b>
            </div>
            <div>
              Dates: <b>{toDateInput(d?.startDate) || "—"}</b> →{" "}
              <b>{toDateInput(d?.completionDate) || "—"}</b>
            </div>
          </div>
          <div className="mt-1.5 text-[12px] text-gray-500">
            To change these, edit the intern's profile — they are copied from
            there whenever this credential is saved.
          </div>
        </div>
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
