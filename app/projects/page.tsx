import Link from "next/link";
import { Boxes, Building2, Database, FolderLock, Gauge, Package, Sparkles, Truck } from "lucide-react";
import { getProjects } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/ui";
import CreateProjectForm from "@/components/CreateProjectForm";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ICONS = [Boxes, Sparkles, Truck, Building2, Database, Package, Gauge];

function projectIcon(name: string, category: string) {
  const text = `${name} ${category}`.toLowerCase();
  if (text.includes("logistics") || text.includes("freight")) return Truck;
  if (text.includes("data") || text.includes("infrastructure")) return Database;
  if (text.includes("business") || text.includes("org")) return Building2;
  return ICONS[name.length % ICONS.length];
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  const currentUser = await getCurrentUser();
  const canManageProjects = currentUser?.permissions.includes("MANAGE_PROJECTS") ?? false;

  return (
    <div className="animate-ios-in">
      <PageHeader title="Projects" subtitle="Choose a product workspace" action={canManageProjects ? <CreateProjectForm /> : undefined} />
      {projects.length === 0 ? (
        <EmptyState icon={<FolderLock size={26} />} title="No projects yet" description="Create your first project to start securing credentials and compliance documents." />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 pb-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {projects.map((project) => {
            const Icon = projectIcon(project.name, project.category);
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="group flex min-w-0 flex-col items-center rounded-3xl px-2 py-3 text-center outline-none transition-transform duration-200 ease-out hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-gray-400 active:scale-95">
                <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-gray-100 text-gray-700 shadow-sm transition-all duration-200 ease-out group-hover:scale-110 group-hover:bg-gray-900 group-hover:text-white group-hover:shadow-lg">
                  {project.logoUrl ? <img src={project.logoUrl} alt="" className="h-12 w-12 rounded-2xl object-contain transition-transform duration-200 group-hover:scale-105" /> : <Icon size={31} strokeWidth={1.8} />}
                </div>
                <span className="mt-3 max-w-[130px] truncate text-[13px] font-semibold text-gray-900">{project.name}</span>
                <span className="mt-1 max-w-[140px] truncate text-[11px] text-gray-400">{project.category || "Product workspace"}</span>
                <span className="mt-2 inline-flex items-center gap-2 text-[10px] text-gray-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"><span>{project.keyCount} keys</span><span>{project.docCount} docs</span></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
