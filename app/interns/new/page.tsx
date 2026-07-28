import { PageHeader } from "@/components/ui";
import InternForm from "@/components/InternForm";

export const dynamic = "force-dynamic";

export default function NewInternPage() {
  return (
    <div className="animate-ios-in">
      <PageHeader
        title="New Intern"
        subtitle="The intern number is assigned automatically (OLX-INT-XXXX)."
      />
      <InternForm />
    </div>
  );
}
