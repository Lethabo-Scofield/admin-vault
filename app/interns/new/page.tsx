import { PageHeader } from "@/components/ui";
import InternForm from "@/components/InternForm";
import { getActiveSupervisors } from "@/lib/workspace-accounts";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewInternPage() {
  await requirePermission("MANAGE_INTERNS");
  const supervisors = await getActiveSupervisors();
  return (
    <div className="animate-ios-in">
      <PageHeader
        title="New Intern"
        subtitle="The intern number is assigned automatically (OLX-INT-XXXX)."
      />
      <InternForm supervisors={supervisors} />
    </div>
  );
}
