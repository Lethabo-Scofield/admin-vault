import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, KeyRound, ShieldCheck } from "lucide-react";
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
import ProjectAnalyticsSection from "@/components/ProjectAnalytics";
import { getProjectAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view: requestedView } = await searchParams;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const currentUser = await getCurrentUser();
  const canManageAnalytics = currentUser?.roleKey === "SUPER_ADMIN";
  const canManageProjects =
    currentUser?.permissions.includes("MANAGE_PROJECTS") ?? false;
  const isSuspended = project.status === "SUSPENDED";
  const view =
    requestedView === "keys"
      ? "keys"
      : requestedView === "documents" && canManageAnalytics
        ? "documents"
        : "usage";
  const [credentials, documents, analytics] = await Promise.all([
    view === "keys" ? getCredentialsByProject(projectId) : Promise.resolve([]),
    view === "documents" && canManageAnalytics
      ? getDocumentsByProject(projectId)
      : Promise.resolve([]),
    view === "usage" && project.hasAnalyticsDb
      ? getProjectAnalytics(projectId)
      : Promise.resolve(null),
  ]);
  const tint = accentColor(project.name);

  return (
    <div className="animate-ios-in mx-auto w-full max-w-6xl">
      <Link
        href="/projects"
        className="tap mb-6 inline-flex min-h-9 items-center gap-1.5 text-[13.5px] font-medium text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft size={16} /> Projects
      </Link>

      <header className="mb-8 flex min-w-0 flex-wrap items-start gap-4 border-b border-gray-200 pb-7">
        {project.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.logoUrl}
            alt={`${project.name} logo`}
            className="h-14 w-14 shrink-0 rounded-2xl bg-white object-cover"
          />
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[18px] font-semibold text-white"
            style={{ backgroundColor: tint }}
          >
            {initials(project.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words text-[25px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-[30px]">
              {project.name}
            </h1>
            {canManageProjects && <EditProjectForm project={project} />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-gray-500">
            {project.category && <span className="break-words">{project.category}</span>}
            {project.category && <span aria-hidden="true" className="text-gray-300">·</span>}
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-gray-400" : "bg-emerald-500"}`} />
              {isSuspended ? "Suspended" : "Active"}
            </span>
            <span aria-hidden="true" className="text-gray-300">·</span>
            <span>Created {formatDate(project.createdAt)}</span>
          </div>
          {project.description && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-[14px] leading-relaxed text-gray-600">
              {project.description}
            </p>
          )}
        </div>
      </header>

      {isSuspended && (
        <div className="mb-7 flex items-start gap-3 border-b border-gray-200 pb-4 text-[13.5px] text-gray-600">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
          <p>This project is suspended. Credentials, analytics connection, and documents are read-only until a Super Admin reactivates it.</p>
        </div>
      )}

      <nav aria-label="Project sections" className="no-scrollbar mb-6 inline-flex w-fit max-w-full flex-nowrap gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        <SectionLink href={`/projects/${projectId}?view=usage`} selected={view === "usage"}>
          Usage
        </SectionLink>
        <SectionLink href={`/projects/${projectId}?view=keys`} selected={view === "keys"}>
          Keys <span className="tabular-nums text-gray-500">{project.keyCount}</span>
        </SectionLink>
        {canManageAnalytics && (
          <SectionLink href={`/projects/${projectId}?view=documents`} selected={view === "documents"}>
            Documents <span className="tabular-nums text-gray-500">{project.docCount}</span>
          </SectionLink>
        )}
      </nav>

      {view === "usage" && (
        <ProjectAnalyticsSection
          projectId={projectId}
          analytics={analytics}
          connectedHost={project.analyticsDbHost}
          canManage={canManageAnalytics && !isSuspended}
        />
      )}

      {view === "keys" && <section className="mb-9" aria-labelledby="credentials-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <KeyRound size={17} className="shrink-0 text-gray-500" />
            <h2 id="credentials-heading" className="text-[17px] font-semibold tracking-tight text-gray-900">
              Project keys
            </h2>
            <span className="text-[13px] tabular-nums text-gray-400">{credentials.length}</span>
          </div>
          {canManageProjects && !isSuspended && <AddCredentialForm projectId={projectId} />}
        </div>

        {credentials.length === 0 ? (
          <div className="border-y border-gray-200 py-8 text-[13.5px] text-gray-500">
            No keys have been added to this project.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border-y border-gray-200">
            {credentials.map((credential) => (
              <article key={credential.id} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="min-w-0 break-words text-[14px] font-semibold text-gray-900">
                      {credential.serviceName}
                    </h3>
                    {credential.keyType && (
                      <span className="break-words text-[12px] text-gray-500">{credential.keyType}</span>
                    )}
                  </div>
                  <p className="mt-1 break-all text-[12px] leading-snug text-gray-500">
                    {credential.ownerEmail || "No owner"}
                    {credential.department ? ` · ${credential.department}` : ""}
                  </p>
                </div>
                <div className="min-w-0 max-w-full sm:w-[280px] sm:shrink-0">
                  <SecretCell secret={credential.secretValue} />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <EnvBadge environment={credential.environment} />
                  <StatusBadge status={credential.status} />
                  {canManageProjects && !isSuspended && <EditCredentialForm credential={credential} />}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>}

      {view === "documents" && canManageAnalytics && (
        <section className="mb-8" aria-labelledby="documents-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <ShieldCheck size={17} className="shrink-0 text-gray-500" />
              <h2 id="documents-heading" className="text-[17px] font-semibold tracking-tight text-gray-900">
                Company documents
              </h2>
              <span className="text-[13px] tabular-nums text-gray-400">{documents.length}</span>
            </div>
            {!isSuspended && <UploadDocumentForm projectId={projectId} />}
          </div>

          {documents.length === 0 ? (
            <div className="border-y border-gray-200 py-8 text-[13.5px] text-gray-500">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border-y border-gray-200">
              {documents.map((document) => (
                <article key={document.id} className="flex min-w-0 items-start gap-3 py-4">
                  <FileText size={17} className="mt-0.5 shrink-0 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-[14px] font-medium text-gray-900">{document.fileName}</p>
                    <p className="mt-1 break-words font-mono text-[11.5px] text-gray-400">
                      {shortChecksum(document.sha256)}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-gray-500">
                      <span>{formatFileSize(document.fileSizeBytes)}</span>
                      <span>{formatDate(document.uploadedAt)}</span>
                      {document.classification && <span>{document.classification}</span>}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SectionLink({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`tap inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium ${
        selected ? "bg-white text-gray-900 shadow-ios" : "text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}