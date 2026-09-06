"use client";

import { useState } from "react";
import { Plus, ExternalLink, Trash2, CheckCircle2, RotateCcw, Pencil, X } from "lucide-react";
import {
  createInternProject,
  updateInternProject,
  setInternProjectStatus,
  deleteInternProject,
} from "@/lib/intern-project-actions";
import ConfirmButton from "@/components/ConfirmButton";
import type { InternProject } from "@/lib/types";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-gray-700">{children}</span>;
}

function ProjectFields({ project }: { project?: InternProject }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <Label>Project title</Label>
        <input
          name="title"
          required
          defaultValue={project?.title ?? ""}
          placeholder="Customer onboarding dashboard"
          className="vault-input"
        />
      </label>
      <label className="block sm:col-span-2">
        <Label>What was built / outcome</Label>
        <textarea
          name="description"
          rows={3}
          defaultValue={project?.description ?? ""}
          placeholder="Scope, what shipped, impact…"
          className="vault-input resize-none"
        />
      </label>
      <label className="block sm:col-span-2">
        <Label>Link (repo, PR, demo)</Label>
        <input
          name="link"
          type="url"
          defaultValue={project?.link ?? ""}
          placeholder="https://github.com/olyxee/…"
          className="vault-input"
        />
      </label>
      <label className="block">
        <Label>Status</Label>
        <select name="status" defaultValue={project?.status ?? "IN_PROGRESS"} className="vault-input">
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </label>
      <label className="block">
        <Label>Started</Label>
        <input
          name="startedAt"
          type="date"
          defaultValue={project?.startedAt ?? ""}
          className="vault-input"
        />
      </label>
      <label className="block">
        <Label>Completed on (if completed)</Label>
        <input
          name="completedAt"
          type="date"
          defaultValue={project?.completedAt ?? ""}
          className="vault-input"
        />
      </label>
    </div>
  );
}

function ProjectCard({ project, internId }: { project: InternProject; internId: number }) {
  const [editing, setEditing] = useState(false);
  const done = project.status === "COMPLETED";

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateInternProject(fd);
          setEditing(false);
        }}
        className="space-y-3 rounded-ios bg-white p-5 shadow-ios ring-1 ring-gray-900/10"
      >
        <input type="hidden" name="internId" value={internId} />
        <input type="hidden" name="projectId" value={project.id} />
        <ProjectFields project={project} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="tap rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="tap rounded-full bg-gray-900 px-5 py-2 text-[13px] font-medium text-white shadow-ios hover:bg-gray-800"
          >
            Save project
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-ios bg-white p-5 shadow-ios">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            {done && <CheckCircle2 size={16} className="shrink-0 text-green-600" />}
            {project.title}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-gray-400">
            {project.startedAt && <>Started {project.startedAt} · </>}
            {done && project.completedAt ? <>Completed {project.completedAt}</> : "In progress"}
            {project.createdBy && <> · added by {project.createdBy}</>}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[12px] font-medium ${
            done ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {done ? "Completed" : "In progress"}
        </span>
      </div>

      {project.description && (
        <p className="mt-3 whitespace-pre-line text-[14px] text-gray-700">{project.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
          >
            <ExternalLink size={14} className="shrink-0" />
            <span className="truncate">{project.link.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
        <form action={setInternProjectStatus} className="ml-auto">
          <input type="hidden" name="internId" value={internId} />
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="status" value={done ? "IN_PROGRESS" : "COMPLETED"} />
          <button
            type="submit"
            className={`tap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${
              done
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {done ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
            {done ? "Reopen" : "Mark completed"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="tap inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-200"
        >
          <Pencil size={14} /> Edit
        </button>
        <form action={deleteInternProject}>
          <input type="hidden" name="internId" value={internId} />
          <input type="hidden" name="projectId" value={project.id} />
          <ConfirmButton
            message={`Delete project "${project.title}"?`}
            className="tap inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-100"
          >
            <Trash2 size={14} /> Delete
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}

export default function InternProjects({
  internId,
  projects,
  goal,
}: {
  internId: number;
  projects: InternProject[];
  goal: number;
}) {
  const [adding, setAdding] = useState(false);
  const done = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-400">
          {projects.length === 0
            ? `No projects yet — the goal is ${goal}.`
            : `${done} of ${goal} completed · ${projects.length - done} in progress`}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white shadow-ios hover:bg-gray-800"
        >
          {adding ? <X size={15} /> : <Plus size={15} />} {adding ? "Close" : "Add Project"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createInternProject(fd);
            setAdding(false);
          }}
          className="space-y-3 rounded-ios bg-white p-5 shadow-ios ring-1 ring-gray-900/10"
        >
          <input type="hidden" name="internId" value={internId} />
          <ProjectFields />
          <div className="flex justify-end">
            <button
              type="submit"
              className="tap rounded-full bg-gray-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
            >
              Add Project
            </button>
          </div>
        </form>
      )}

      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} internId={internId} />
      ))}
    </div>
  );
}
