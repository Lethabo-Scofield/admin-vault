import { getDocuments, getProjects } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import ComplianceTable from "@/components/ComplianceTable";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import { requireSuperAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  await requireSuperAdmin();
  const [documents, projects] = await Promise.all([getDocuments(), getProjects()]);

  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Company Documents"
        subtitle={`${documents.length} document${
          documents.length === 1 ? "" : "s"
        } with verified SHA-256 checksums`}
        action={<UploadDocumentForm projects={projects.map(({ id, name }) => ({ id, name }))} />}
      />
      <ComplianceTable documents={documents} />
    </div>
  );
}
