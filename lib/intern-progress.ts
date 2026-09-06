/**
 * Pure helpers for the internship programme goal: N projects (default 3) in
 * the window from startDate to plannedEndDate (default start + 3 months).
 * No database access — safe for client and server components and unit tests.
 */

export const DEFAULT_PROJECT_GOAL = 3;
export const DEFAULT_DURATION_MONTHS = 3;

export type InternProgressState =
  | "not_started"
  | "on_track"
  | "behind"
  | "overdue"
  | "completed"
  | "withdrawn"
  | "unscheduled";

export interface InternProgressInput {
  startDate: string | null;
  plannedEndDate: string | null;
  completionDate: string | null;
  employmentStatus: string;
  projectGoal: number;
  projectsDone: number;
}

export interface InternProgress {
  state: InternProgressState;
  label: string;
  /** ISO date (YYYY-MM-DD) or null when there's no start date. */
  plannedEnd: string | null;
  totalDays: number;
  elapsedDays: number;
  /** Negative when past the planned end. */
  daysLeft: number;
  /** 0–100 share of the internship window that has elapsed. */
  timePercent: number;
  projectsDone: number;
  projectGoal: number;
  /** 0–100 share of the project goal reached. */
  projectPercent: number;
  /** Projects that should be done by now at a steady pace. */
  expectedByNow: number;
}

const DAY = 86_400_000;

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** start + N calendar months, clamped to month end (Jan 31 + 1m = Feb 28/29). */
export function addMonths(iso: string, months: number): string {
  const d = parseDate(iso);
  if (!d) return iso;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return toIso(target);
}

/** The planned end date to store when none was given explicitly. */
export function defaultPlannedEnd(startDate: string | null): string | null {
  return startDate ? addMonths(startDate, DEFAULT_DURATION_MONTHS) : null;
}

export function computeInternProgress(
  input: InternProgressInput,
  now: Date = new Date()
): InternProgress {
  const goal = Math.max(1, Math.floor(input.projectGoal || DEFAULT_PROJECT_GOAL));
  const done = Math.max(0, Math.floor(input.projectsDone || 0));
  const projectPercent = Math.min(100, Math.round((done / goal) * 100));
  const status = (input.employmentStatus || "").toLowerCase();

  const start = parseDate(input.startDate);
  const plannedEnd =
    parseDate(input.plannedEndDate) ??
    (input.startDate ? parseDate(defaultPlannedEnd(input.startDate)) : null);
  const today = utcMidnight(now);

  const base: Omit<InternProgress, "state" | "label"> = {
    plannedEnd: plannedEnd ? toIso(plannedEnd) : null,
    totalDays: 0,
    elapsedDays: 0,
    daysLeft: 0,
    timePercent: 0,
    projectsDone: done,
    projectGoal: goal,
    projectPercent,
    expectedByNow: 0,
  };

  if (status === "withdrawn") {
    return { ...base, state: "withdrawn", label: "Withdrawn" };
  }
  if (status === "completed" || input.completionDate) {
    return {
      ...base,
      timePercent: 100,
      expectedByNow: goal,
      state: "completed",
      label: done >= goal ? "Completed · goal met" : `Completed · ${done}/${goal} projects`,
    };
  }
  if (!start || !plannedEnd) {
    return { ...base, state: "unscheduled", label: "No start date" };
  }

  const totalDays = Math.max(1, Math.round((plannedEnd.getTime() - start.getTime()) / DAY));
  const elapsedRaw = Math.round((today.getTime() - start.getTime()) / DAY);
  const elapsedDays = Math.min(Math.max(elapsedRaw, 0), totalDays);
  const daysLeft = Math.round((plannedEnd.getTime() - today.getTime()) / DAY);
  const timePercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const expectedByNow = Math.floor((goal * elapsedDays) / totalDays);

  const full = { ...base, totalDays, elapsedDays, daysLeft, timePercent, expectedByNow };

  if (elapsedRaw < 0) {
    return { ...full, state: "not_started", label: `Starts in ${-elapsedRaw} day${elapsedRaw === -1 ? "" : "s"}` };
  }
  if (done >= goal) {
    return { ...full, state: "on_track", label: "Goal reached" };
  }
  if (daysLeft < 0) {
    return { ...full, state: "overdue", label: `${-daysLeft} day${daysLeft === -1 ? "" : "s"} overdue` };
  }
  if (done < expectedByNow) {
    return { ...full, state: "behind", label: `Behind · ${expectedByNow - done} project${expectedByNow - done === 1 ? "" : "s"} short` };
  }
  return { ...full, state: "on_track", label: "On track" };
}

export function daysLeftLabel(p: InternProgress): string {
  switch (p.state) {
    case "completed":
      return "Completed";
    case "withdrawn":
      return "Withdrawn";
    case "unscheduled":
      return "—";
    case "not_started":
      return p.label;
    default:
      if (p.daysLeft < 0) return `${-p.daysLeft} days over`;
      if (p.daysLeft === 0) return "Ends today";
      return `${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"} left`;
  }
}

export const PROGRESS_STYLE: Record<InternProgressState, { dot: string; text: string; bg: string; bar: string }> = {
  on_track:    { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  bar: "bg-green-500" },
  behind:      { dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50",  bar: "bg-amber-500" },
  overdue:     { dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    bar: "bg-red-500" },
  completed:   { dot: "bg-gray-800",   text: "text-gray-800",   bg: "bg-gray-100",  bar: "bg-gray-800" },
  withdrawn:   { dot: "bg-gray-400",   text: "text-gray-500",   bg: "bg-gray-100",  bar: "bg-gray-400" },
  not_started: { dot: "bg-sky-500",    text: "text-sky-700",    bg: "bg-sky-50",    bar: "bg-sky-500" },
  unscheduled: { dot: "bg-gray-300",   text: "text-gray-500",   bg: "bg-gray-50",   bar: "bg-gray-300" },
};
