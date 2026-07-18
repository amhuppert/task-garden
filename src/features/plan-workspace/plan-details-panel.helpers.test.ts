import { describe, expect, it } from "vitest";
import {
  compactUnitSuffix,
  formatCompactUnitValue,
  formatUnitCount,
  formatValue,
  formatValueDensity,
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
// Numeric / unit formatting
// ---------------------------------------------------------------------------

describe("formatValue", () => {
  it("formats integer and fractional values compactly", () => {
    expect(formatValue(80)).toBe("80");
    expect(formatValue(12.5)).toBe("12.5");
  });
});

describe("formatValueDensity", () => {
  it("formats ratios with two decimal places", () => {
    expect(formatValueDensity(12)).toBe("12");
    expect(formatValueDensity(12.345)).toBe("12.35");
  });

  it("formats non-finite ratios as a dash", () => {
    expect(formatValueDensity(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

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
