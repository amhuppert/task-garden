import { describe, expect, it } from "vitest";
import {
  COLOR_MODE_OPTIONS,
  HIGHER_IS_BETTER_METRICS,
  METRIC_ENCODING_OPTIONS,
  METRIC_KEYS,
  SIZE_MODE_OPTIONS,
  compactUnitSuffix,
  formatMetricValue,
  getMetricLabel,
  getMetricSummary,
  isUnitBearingMetric,
} from "./metric-registry";

describe("METRIC_KEYS", () => {
  it("lists every metric in canonical display order", () => {
    expect(METRIC_KEYS).toEqual([
      "value",
      "value_per_effort",
      "estimate_days",
      "remaining_days",
      "downstream_effort_days",
      "degree",
      "in_degree",
      "out_degree",
      "betweenness",
      "dependency_span",
    ]);
  });
});

describe("encoding option arrays", () => {
  it("color options start with the non-metric modes", () => {
    expect(COLOR_MODE_OPTIONS.slice(0, 3)).toEqual([
      "default",
      "lane",
      "status",
    ]);
  });

  it("size options start with uniform", () => {
    expect(SIZE_MODE_OPTIONS[0]).toBe("uniform");
  });

  it("excludes in/out degree from encoding options", () => {
    expect(METRIC_ENCODING_OPTIONS).not.toContain("in_degree");
    expect(METRIC_ENCODING_OPTIONS).not.toContain("out_degree");
    expect(COLOR_MODE_OPTIONS).not.toContain("in_degree");
    expect(SIZE_MODE_OPTIONS).not.toContain("out_degree");
  });

  it("offers every other metric as both color and size encodings", () => {
    for (const key of METRIC_ENCODING_OPTIONS) {
      expect(COLOR_MODE_OPTIONS).toContain(key);
      expect(SIZE_MODE_OPTIONS).toContain(key);
    }
  });
});

describe("lookups", () => {
  it("returns display labels", () => {
    expect(getMetricLabel("value_per_effort")).toBe("Value / Effort");
    expect(getMetricLabel("remaining_days")).toBe("Remaining Chain");
    expect(getMetricLabel("in_degree")).toBe("In-Degree");
  });

  it("has a non-empty summary for every metric", () => {
    for (const key of METRIC_KEYS) {
      expect(getMetricSummary(key).length).toBeGreaterThan(0);
    }
  });

  it("flags exactly the estimate-based metrics as unit-bearing", () => {
    const unitBearing = METRIC_KEYS.filter(isUnitBearingMetric);
    expect(unitBearing).toEqual([
      "estimate_days",
      "remaining_days",
      "downstream_effort_days",
    ]);
  });

  it("orients gradients only for benefit metrics", () => {
    expect([...HIGHER_IS_BETTER_METRICS].sort()).toEqual([
      "value",
      "value_per_effort",
    ]);
  });
});

describe("compactUnitSuffix", () => {
  it("maps each estimate unit to its compact suffix", () => {
    expect(compactUnitSuffix("days")).toBe("d");
    expect(compactUnitSuffix("hours")).toBe("h");
    expect(compactUnitSuffix("points")).toBe("pt");
  });
});

describe("formatMetricValue", () => {
  it("appends the plan unit suffix to unit-bearing metrics", () => {
    expect(formatMetricValue("estimate_days", 3, "days")).toBe("3d");
    expect(formatMetricValue("remaining_days", 2.5, "hours")).toBe("2.5h");
    expect(formatMetricValue("downstream_effort_days", 8, "points")).toBe(
      "8pt",
    );
  });

  it("renders missing values as an em dash", () => {
    expect(formatMetricValue("value_per_effort", Number.NaN, "days")).toBe("—");
    expect(
      formatMetricValue("value_per_effort", Number.POSITIVE_INFINITY, "days"),
    ).toBe("—");
  });

  it("keeps integers free of fake decimals", () => {
    expect(formatMetricValue("degree", 3, "days")).toBe("3");
    expect(formatMetricValue("value_per_effort", 2, "days")).toBe("2");
    expect(formatMetricValue("value", 60, "days")).toBe("60");
  });

  it("renders authored value with one decimal and ratios with two", () => {
    expect(formatMetricValue("value", 60.25, "days")).toBe("60.3");
    expect(formatMetricValue("value_per_effort", 1.234, "days")).toBe("1.23");
    expect(formatMetricValue("betweenness", 0.5, "days")).toBe("0.50");
  });
});
