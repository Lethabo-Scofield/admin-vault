import { CalendarRange, Clock3, Target } from "lucide-react";
import type { Intern } from "@/lib/types";
import {
  computeInternProgress,
  daysLeftLabel,
  PROGRESS_STYLE,
} from "@/lib/intern-progress";
import { formatDate } from "@/lib/format";

export default function InternProgressCard({
  intern,
  now,
}: {
  intern: Intern;
  now: Date;
}) {
  const progress = computeInternProgress(intern, now);
  const style = PROGRESS_STYLE[progress.state];
  const tracksTime = !["unscheduled", "withdrawn"].includes(progress.state);
  const remainingProjects = Math.max(
    0,
    progress.projectGoal - progress.projectsDone
  );

  const projectMessage =
    remainingProjects === 0
      ? "Project goal reached"
      : `${remainingProjects} project${remainingProjects === 1 ? "" : "s"} remaining`;

  const paceMessage =
    progress.state === "behind"
      ? `${progress.expectedByNow} expected by this point`
      : progress.state === "completed"
        ? `${progress.projectPercent}% of the programme goal completed`
        : projectMessage;

  return (
    <section className="overflow-hidden rounded-ios bg-white shadow-ios">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[16px] font-semibold text-gray-900">
            Programme Progress
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {progress.projectGoal} projects across the internship period
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium ${style.bg} ${style.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {progress.label}
        </span>
      </div>

      <div className="grid md:grid-cols-[1.2fr_1fr]">
        <div className="border-b border-gray-100 p-5 sm:p-6 md:border-b-0 md:border-r">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-gray-400">
                <Target size={14} /> Projects completed
              </p>
              <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-gray-900">
                {progress.projectsDone}
                <span className="ml-1 text-[18px] font-medium text-gray-400">
                  / {progress.projectGoal}
                </span>
              </p>
            </div>
            <p className="text-right text-[13px] font-medium text-gray-600">
              {progress.projectPercent}%
            </p>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${progress.projectPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[12.5px] text-gray-500">{paceMessage}</p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-gray-400">
                <Clock3 size={14} /> Time remaining
              </p>
              <p className="mt-2 text-[22px] font-semibold tracking-tight text-gray-900">
                {daysLeftLabel(progress)}
              </p>
            </div>
            {tracksTime && progress.totalDays > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-medium text-gray-600">
                {progress.timePercent}% elapsed
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <CalendarRange size={16} className="shrink-0 text-gray-400" />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-[12.5px]">
              <div>
                <p className="text-gray-400">Start</p>
                <p className="mt-0.5 font-medium text-gray-800">
                  {intern.startDate ? formatDate(intern.startDate) : "Not set"}
                </p>
              </div>
              <div className="h-px min-w-4 flex-1 bg-gray-200" />
              <div className="text-right">
                <p className="text-gray-400">
                  {intern.completionDate ? "Completed" : "Planned end"}
                </p>
                <p className="mt-0.5 font-medium text-gray-800">
                  {intern.completionDate
                    ? formatDate(intern.completionDate)
                    : progress.plannedEnd
                      ? formatDate(progress.plannedEnd)
                      : "Not set"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}