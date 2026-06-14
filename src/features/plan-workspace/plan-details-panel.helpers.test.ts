import { describe, expect, it } from "vitest";
import {
  compactUnitSuffix,
  formatCompactUnitValue,
  formatUnitCount,
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
// Estimate / unit formatting
// ---------------------------------------------------------------------------

describe("compactUnitSuffix", () => {
  it("maps each unit to its compact suffix", () => {
    expect(compactUnitSuffix("days")).toBe("d");
    expect(compactUnitSuffix("hours")).toBe("h");
    expect(compactUnitSuffix("points")).toBe("pt");
  });
});

describe("formatCompactUnitValue", () => {
  it("formats integer values with the unit suffix", () => {
    expect(formatCompactUnitValue(8, "days")).toBe("8d");
    expect(formatCompactUnitValue(5, "points")).toBe("5pt");
    expect(formatCompactUnitValue(4, "hours")).toBe("4h");
  });

  it("formats fractional values with one decimal place", () => {
    expect(formatCompactUnitValue(2.5, "days")).toBe("2.5d");
    expect(formatCompactUnitValue(1.5, "points")).toBe("1.5pt");
  });
});

describe("formatUnitCount", () => {
  it("singularises at exactly 1", () => {
    expect(formatUnitCount(1, "days")).toBe("1 day");
    expect(formatUnitCount(1, "points")).toBe("1 point");
    expect(formatUnitCount(1, "hours")).toBe("1 hour");
  });

  it("pluralises otherwise", () => {
    expect(formatUnitCount(8, "days")).toBe("8 days");
    expect(formatUnitCount(5, "points")).toBe("5 points");
  });

  it("formats fractional values without singularising", () => {
    expect(formatUnitCount(2.5, "days")).toBe("2.5 days");
  });
});
