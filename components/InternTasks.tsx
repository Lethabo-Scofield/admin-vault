"use client";

import { useState } from "react";
import { Plus, ExternalLink, Trash2, GitPullRequest } from "lucide-react";
import {
  createInternTask,
  submitInternTaskPr,
  reviewInternTask,
  deleteInternTask,
} from "@/lib/task-actions";
import ConfirmButton from "@/components/ConfirmButton";
import type { InternTask } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700",
  SUBMITTED: "bg-amber-50 text-amber-700",
  CHANGES_REQUESTED: "bg-red-50 text-red-600",
  APPROVED: "bg-green-50 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  SUBMITTED: "PR Submitted",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
};

function TaskCard({ task }: { task: InternTask }) {
  return (
    <div className="rounded-ios bg-white p-5 shadow-ios">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900">{task.title}</h3>
          <p className="mt-0.5 text-[12.5px] text-gray-400">
            {task.assignedBy && <>Assigned by {task.assignedBy} · </>}
            {task.dueDate && <>Due {task.dueDate} · </>}
            Created {String(task.createdAt).slice(0, 10)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[12px] font-medium ${STATUS_STYLE[task.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
      </div>

      {task.description && (
        <p className="mt-3 whitespace-pre-line text-[14px] text-gray-700">
          {task.description}
        </p>
      )}

      {task.prLink && (
        <a
          href={task.prLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
        >
          <GitPullRequest size={14} className="shrink-0" />
          <span className="truncate">{task.prLink}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>
      )}

      {task.reviewNote && task.status === "CHANGES_REQUESTED" && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          <span className="font-medium">Manager feedback:</span> {task.reviewNote}
        </p>
      )}

      {task.status !== "APPROVED" && (
        <form
          action={submitInternTaskPr}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <input
            name="prLink"
            type="url"
            required
            defaultValue={task.prLink}
            placeholder="https://github.com/org/repo/pull/123"
            className="vault-input max-w-md flex-1"
          />
          <button
            type="submit"
            className="tap rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800"
          >
            {task.prLink ? "Update PR Link" : "Submit PR Link"}
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        {task.status === "SUBMITTED" && (
          <>
            <form action={reviewInternTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="decision" value="APPROVED" />
              <button
                type="submit"
                className="tap rounded-full bg-green-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-green-700"
              >
                Approve
              </button>
            </form>
            <form
              action={reviewInternTask}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="decision" value="CHANGES_REQUESTED" />
              <input
                name="reviewNote"
                placeholder="What needs to change?"
                className="vault-input max-w-xs"
              />
              <button
                type="submit"
                className="tap rounded-full bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100"
              >
                Request Changes
              </button>
            </form>
          </>
        )}
        <form action={deleteInternTask} className="ml-auto">
          <input type="hidden" name="taskId" value={task.id} />
          <ConfirmButton
            message={`Delete task "${task.title}"? This cannot be undone.`}
            className="tap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={13} /> Delete
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}

export default function InternTasks({
  internId,
  tasks,
  defaultAssignedBy,
}: {
  internId: number;
  tasks: InternTask[];
  defaultAssignedBy: string;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-400">
          {tasks.length === 0
            ? "No tasks assigned yet."
            : `${tasks.filter((t) => t.status === "APPROVED").length} of ${tasks.length} approved`}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white shadow-ios hover:bg-gray-800"
        >
          <Plus size={15} /> {adding ? "Close" : "Assign Task"}
        </button>
      </div>

      {adding && (
        <form
          action={createInternTask}
          className="space-y-3 rounded-ios bg-white p-5 shadow-ios"
        >
          <input type="hidden" name="internId" value={internId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Task Title
              </span>
              <input
                name="title"
                required
                placeholder="Implement the data export endpoint"
                className="vault-input"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Description
              </span>
              <textarea
                name="description"
                rows={3}
                placeholder="What should be built, acceptance criteria, links…"
                className="vault-input resize-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Assigned By (manager)
              </span>
              <input
                name="assignedBy"
                defaultValue={defaultAssignedBy}
                placeholder="Alisha Fatima"
                className="vault-input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Due Date
              </span>
              <input name="dueDate" type="date" className="vault-input" />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="tap rounded-full bg-gray-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
            >
              Assign Task
            </button>
          </div>
        </form>
      )}

      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}
