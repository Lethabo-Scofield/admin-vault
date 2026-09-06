import { describe, it, expect } from "vitest";
import {
  addMonths,
  computeInternProgress,
  daysLeftLabel,
  defaultPlannedEnd,
} from "@/lib/intern-progress";

const base = {
  startDate: "2026-08-01",
  plannedEndDate: null,
  completionDate: null,
  employmentStatus: "Active",
  projectGoal: 3,
  projectsDone: 0,
};

describe("intern progress", () => {
  it("defaults the planned end to start + 3 months (month-end clamped)", () => {
    expect(defaultPlannedEnd("2026-08-01")).toBe("2026-11-01");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(defaultPlannedEnd(null)).toBeNull();
  });

  it("counts days left and time percent", () => {
    const p = computeInternProgress(base, new Date("2026-09-06T10:00:00Z"));
    expect(p.plannedEnd).toBe("2026-11-01");
    expect(p.totalDays).toBe(92);
    expect(p.elapsedDays).toBe(36);
    expect(p.daysLeft).toBe(56);
    expect(p.timePercent).toBe(39);
    expect(daysLeftLabel(p)).toBe("56 days left");
  });

  it("flags interns who are behind the steady pace", () => {
    // 36/92 days used → 1 project expected by now
    const behind = computeInternProgress(base, new Date("2026-09-06"));
    expect(behind.expectedByNow).toBe(1);
    expect(behind.state).toBe("behind");

    const ok = computeInternProgress({ ...base, projectsDone: 1 }, new Date("2026-09-06"));
    expect(ok.state).toBe("on_track");

    const met = computeInternProgress({ ...base, projectsDone: 3 }, new Date("2026-09-06"));
    expect(met.state).toBe("on_track");
    expect(met.label).toBe("Goal reached");
  });

  it("marks overdue after the planned end", () => {
    const p = computeInternProgress({ ...base, projectsDone: 2 }, new Date("2026-11-10"));
    expect(p.state).toBe("overdue");
    expect(p.daysLeft).toBe(-9);
    expect(daysLeftLabel(p)).toBe("9 days over");
  });

  it("handles completed, withdrawn, upcoming and unscheduled interns", () => {
    expect(
      computeInternProgress({ ...base, employmentStatus: "Completed", projectsDone: 3 }).state
    ).toBe("completed");
    expect(
      computeInternProgress({ ...base, completionDate: "2026-10-30", projectsDone: 2 }).label
    ).toBe("Completed · 2/3 projects");
    expect(computeInternProgress({ ...base, employmentStatus: "Withdrawn" }).state).toBe("withdrawn");
    expect(computeInternProgress(base, new Date("2026-07-20")).state).toBe("not_started");
    expect(computeInternProgress({ ...base, startDate: null }).state).toBe("unscheduled");
  });

  it("respects a custom planned end and goal", () => {
    const p = computeInternProgress(
      { ...base, plannedEndDate: "2026-09-30", projectGoal: 2, projectsDone: 1 },
      new Date("2026-09-06")
    );
    expect(p.totalDays).toBe(60);
    expect(p.projectGoal).toBe(2);
    expect(p.projectPercent).toBe(50);
  });
});
