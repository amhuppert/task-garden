import { describe, expect, it } from "vitest";
import {
  formatEstimate,
  getPriorityLabel,
  getStatusLabel,
} from "./plan-details-panel.helpers";

// ---------------------------------------------------------------------------
// getStatusLabel
// ---------------------------------------------------------------------------

describe("getStatusLabel", () => {
  it("returns 'Planned' for planned", () => {
    expect(getStatusLabel("planned")).toBe("Planned");
  });

  it("returns 'Ready' for ready", () => {
    expect(getStatusLabel("ready")).toBe("Ready");
  });

  it("returns 'Blocked' for blocked", () => {
    expect(getStatusLabel("blocked")).toBe("Blocked");
  });

  it("returns 'In Progress' for in_progress", () => {
    expect(getStatusLabel("in_progress")).toBe("In Progress");
  });

  it("returns 'Done' for done", () => {
    expect(getStatusLabel("done")).toBe("Done");
  });

  it("returns 'Future' for future", () => {
    expect(getStatusLabel("future")).toBe("Future");
  });
});

// ---------------------------------------------------------------------------
// getPriorityLabel
// ---------------------------------------------------------------------------

describe("getPriorityLabel", () => {
  it("returns 'P0' for p0", () => {
    expect(getPriorityLabel("p0")).toBe("P0");
  });

  it("returns 'P1' for p1", () => {
    expect(getPriorityLabel("p1")).toBe("P1");
  });

  it("returns 'P2' for p2", () => {
    expect(getPriorityLabel("p2")).toBe("P2");
  });

  it("returns 'P3' for p3", () => {
    expect(getPriorityLabel("p3")).toBe("P3");
  });

  it("returns 'Nice to Have' for nice_to_have", () => {
    expect(getPriorityLabel("nice_to_have")).toBe("Nice to Have");
  });
});

// ---------------------------------------------------------------------------
// formatEstimate
// ---------------------------------------------------------------------------

describe("formatEstimate", () => {
  it("formats plural days", () => {
    expect(formatEstimate({ value: 3, unit: "days" })).toBe("3 days");
  });

  it("formats singular day", () => {
    expect(formatEstimate({ value: 1, unit: "days" })).toBe("1 day");
  });

  it("formats plural hours", () => {
    expect(formatEstimate({ value: 4, unit: "hours" })).toBe("4 hours");
  });

  it("formats singular hour", () => {
    expect(formatEstimate({ value: 1, unit: "hours" })).toBe("1 hour");
  });

  it("formats plural points", () => {
    expect(formatEstimate({ value: 5, unit: "points" })).toBe("5 points");
  });

  it("formats singular point", () => {
    expect(formatEstimate({ value: 1, unit: "points" })).toBe("1 point");
  });

  it("formats fractional values without singularizing", () => {
    expect(formatEstimate({ value: 0.5, unit: "days" })).toBe("0.5 days");
  });

  it("formats zero without singularizing", () => {
    expect(formatEstimate({ value: 0, unit: "hours" })).toBe("0 hours");
  });
});
