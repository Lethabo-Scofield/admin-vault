import { getInterns } from "@/lib/intern-queries";
import { PageHeader } from "@/components/ui";
import InternCredentialForm from "@/components/InternCredentialForm";

export const dynamic = "force-dynamic";

export default async function NewInternCredentialPage({
  searchParams,
}: {
  searchParams: Promise<{ internId?: string }>;
}) {
  const { internId } = await searchParams;
  const interns = await getInterns({});

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="New Credential"
        subtitle="Saved as a draft first — the credential number (OLX-CERT-YYYY-XXXX) and secure verification token are assigned automatically."
      />
      <InternCredentialForm
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
