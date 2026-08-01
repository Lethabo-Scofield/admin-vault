import { getIntern, getInterns } from "@/lib/intern-queries";
import { PageHeader } from "@/components/ui";
import InternCredentialForm from "@/components/InternCredentialForm";
import type { InternCredential } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewInternCredentialPage({
  searchParams,
}: {
  searchParams: Promise<{ internId?: string }>;
}) {
  const { internId } = await searchParams;
  const interns = await getInterns({});

  // Prefill from the intern's record so nothing has to be typed twice.
  // Everything stays editable before saving the draft.
  let defaults: Partial<InternCredential> | undefined;
  const intern = internId ? await getIntern(Number(internId)) : null;
  if (intern) {
    defaults = {
      programmeTitle: intern.position ? `${intern.position} Internship` : "",
      position: intern.position,
      department: intern.department,
      pronouns: intern.pronouns,
      startDate: intern.startDate,
      completionDate: intern.completionDate,
      projectsCompleted: intern.projectsCompleted,
      responsibilities: intern.responsibilities,
      skillsDemonstrated: intern.skillsDemonstrated,
      publicRecommendation: intern.supervisorRecommendation,
    };
  }

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="New Credential"
        subtitle={
          intern
            ? `Prefilled from ${intern.fullName}'s record — review, adjust, and save as a draft.`
            : "Saved as a draft first — the credential number (OLX-CERT-YYYY-XXXX) and secure verification token are assigned automatically."
        }
      />
      <InternCredentialForm
        // Remount when the intern changes so the prefilled values replace
        // whatever was in the (uncontrolled) fields before.
        key={internId ?? "none"}
        defaults={defaults}
        interns={interns.map((i) => ({
          id: i.id,
          internNumber: i.internNumber,
          fullName: i.fullName,
        }))}
        defaultInternId={internId ? Number(internId) : undefined}
      />
    </div>
  );
}
