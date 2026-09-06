import { CalendarDays, Target, Flag, Clock } from "lucide-react";
import type { Intern } from "@/lib/types";
import {
  computeInternProgress,
  daysLeftLabel,
  PROGRESS_STYLE,
} from "@/lib/intern-progress";
import { formatDate } from "@/lib/format";

/**
 * The "smart" header for an intern: how much of the 3-month window is used,
 * how many of the goal projects are done, and whether they're on track.
 */
export default function InternProgressCard({
  intern,
  now,
}: {
  intern: Intern;
  now: Date;
}) {
  const p = computeInternProgress(intern, now);
  const style = PROGRESS_STYLE[p.state];
  const showTime = !["unscheduled", "withdrawn"].includes(p.state);

  return (
    <div className="rounded-ios bg-white p-5 shadow-ios sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
            Programme progress
          </p>
          <p className="mt-1 text-[15px] text-gray-700">
            Goal: <span className="font-semibold text-gray-900">{p.projectGoal} projects</span> in{" "}
            <span className="font-semibold text-gray-900">
              {intern.startDate && p.plannedEnd
                ? `${formatDate(intern.startDate)} – ${formatDate(p.plannedEnd)}`
                : "3 months"}
            </span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium ${style.bg} ${style.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {p.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon={<Clock size={16} />}
          label="Time left"
          value={daysLeftLabel(p)}
          sub={
            showTime && p.totalDays > 0
              ? `${p.elapsedDays} of ${p.totalDays} days used`
              : "Set a start date to track"
          }
        />
        <Stat
          icon={<Target size={16} />}
          label="Projects completed"
          value={`${p.projectsDone} / ${p.projectGoal}`}
          sub={
            p.state === "completed" || p.state === "withdrawn"
              ? `${p.projectPercent}% of goal`
              : p.projectsDone >= p.projectGoal
                ? "Goal reached"
                : `${p.expectedByNow} expected by now`
          }
        />
        <Stat
          icon={<CalendarDays size={16} />}
          label="Started"
          value={intern.startDate ? formatDate(intern.startDate) : "—"}
          sub={intern.department || intern.position || ""}
        />
        <Stat
          icon={<Flag size={16} />}
          label={intern.completionDate ? "Completed on" : "Planned end"}
          value={
            intern.completionDate
              ? formatDate(intern.completionDate)
              : p.plannedEnd
                ? formatDate(p.plannedEnd)
                : "—"
          }
          sub={intern.employmentStatus}
        />
      </div>

      <div className="mt-5 space-y-3">
        <Bar
          label="Internship window"
          percent={showTime ? p.timePercent : 0}
          right={showTime ? `${p.timePercent}%` : "—"}
          color="bg-gray-800"
        />
        <Bar
          label="Project goal"
          percent={p.projectPercent}
          right={`${p.projectsDone}/${p.projectGoal}`}
          color={style.bar}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight text-gray-900">{value}</p>
      {sub ? <p className="truncate text-[12px] text-gray-500">{sub}</p> : null}
    </div>
  );
}

function Bar({
  label,
  percent,
  right,
  color,
}: {
  label: string;
  percent: number;
  right: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{right}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
