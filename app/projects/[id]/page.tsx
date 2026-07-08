import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  KeyRound,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  getProject,
  getCredentialsByProject,
  getDocumentsByProject,
} from "@/lib/queries";
import {
  initials,
  accentColor,
  formatFileSize,
  shortChecksum,
  formatDate,
} from "@/lib/format";
import { EnvBadge, StatusBadge } from "@/components/ui";
import SecretCell from "@/components/SecretCell";
import AddCredentialForm from "@/components/AddCredentialForm";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import EditProjectForm from "@/components/EditProjectForm";
import EditCredentialForm from "@/components/EditCredentialForm";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const [credentials, documents] = await Promise.all([
    getCredentialsByProject(projectId),
    getDocumentsByProject(projectId),
  ]);

  const tint = accentColor(project.name);

  return (
    <div className="animate-ios-in">
      <Link
        href="/projects"
        className="tap mb-5 inline-flex items-center gap-1 text-[13.5px] font-medium text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft size={16} /> Projects
      </Link>

      <div className="mb-8 flex items-start gap-4">
        {project.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.logoUrl}
            alt={`${project.name} logo`}
            className="h-16 w-16 shrink-0 rounded-3xl bg-white object-cover shadow-ios"
          />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-[22px] font-bold text-white shadow-ios"
            style={{ backgroundColor: tint }}
          >
            {initials(project.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
              {project.name}
            </h1>
            <EditProjectForm project={project} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-gray-500">
            {project.category && <span>{project.category}</span>}
            <span className="text-gray-300">·</span>
            <span>Created {formatDate(project.createdAt)}</span>
          </div>
          {project.description && (
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-gray-600">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Credentials */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-gray-900">
            <KeyRound size={18} /> Credentials
            <span className="text-[14px] font-normal text-gray-400">
              ({credentials.length})
            </span>
          </h2>
          <AddCredentialForm projectId={projectId} />
        </div>

        {credentials.length === 0 ? (
          <div className="rounded-ios bg-white px-5 py-10 text-center text-[14px] text-gray-400 shadow-ios">
            No credentials in this project yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-ios bg-white shadow-ios">
            <div className="divide-y divide-gray-100">
              {credentials.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
                >
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[14.5px] font-medium text-gray-900">
                      {c.serviceName}
                    </p>
                    <p className="text-[12.5px] text-gray-400">
                      {c.ownerEmail || "No owner"}
                      {c.department ? ` · ${c.department}` : ""}
                    </p>
                  </div>
                  <SecretCell secret={c.secretValue} />
                  <div className="flex items-center gap-2">
                    <EnvBadge environment={c.environment} />
                    <StatusBadge status={c.status} />
                    <EditCredentialForm credential={c} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Documents */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-gray-900">
            <ShieldCheck size={18} /> Compliance Documents
            <span className="text-[14px] font-normal text-gray-400">
              ({documents.length})
            </span>
          </h2>
          <UploadDocumentForm projectId={projectId} />
        </div>

        {documents.length === 0 ? (
          <div className="rounded-ios bg-white px-5 py-10 text-center text-[14px] text-gray-400 shadow-ios">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-ios bg-white shadow-ios">
            <div className="divide-y divide-gray-100">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                    <FileText size={17} />
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[14.5px] font-medium text-gray-900">
                      {d.fileName}
                    </p>
                    <p className="font-mono text-[12px] text-gray-400">
                      {shortChecksum(d.sha256)}
                    </p>
                  </div>
                  <span className="text-[13px] text-gray-500">
                    {formatFileSize(d.fileSizeBytes)}
                  </span>
                  {d.classification && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-medium text-gray-600">
                      {d.classification}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
