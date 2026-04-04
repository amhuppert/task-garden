import { describe, expect, it } from "vitest";
import type { FlowNode } from "../../lib/graph/flow-projection-service";
import {
  LANE_BAND_PADDING,
  NODE_RENDER_HEIGHT,
  NODE_RENDER_WIDTH,
  computeLaneBands,
  computeMetricRanges,
  getLanePaletteColor,
  getPriorityAccentColor,
  getStatusAccentColor,
  normalizeMetric,
} from "./plan-graph-canvas.helpers";

function makeNode(
  id: string,
  laneLabel: string,
  x: number,
  y: number,
): FlowNode {
  return {
    id,
    position: { x, y },
    data: {
      id,
      title: `Item ${id}`,
      laneLabel,
      laneColor: null,
      status: "planned",
      priority: "p2",
      summary: "",
      estimate: undefined,
      isOnCriticalPath: false,
      metricSummary: {
        degree: 2,
        in_degree: 1,
        out_degree: 1,
        betweenness: 0.5,
        dependency_span: 2,
        estimate_days: 0,
        remaining_days: 0,
        downstream_effort_days: 0,
      },
      isSelected: false,
      visibilityRole: "focus",
    },
  };
}

describe("computeLaneBands", () => {
  it("returns empty array for no nodes", () => {
    expect(computeLaneBands([])).toEqual([]);
  });

  it("returns one band for a single-lane projection with single-column nodes", () => {
    // Same-lane nodes share the same X column, different Y (topological level)
    const nodes = [
      makeNode("a", "Frontend", 40, 0),
      makeNode("b", "Frontend", 40, 140),
    ];
    const bands = computeLaneBands(nodes);
    expect(bands).toHaveLength(1);
    expect(bands[0].laneLabel).toBe("Frontend");
    // x is the min node x minus padding
    expect(bands[0].x).toBe(40 - LANE_BAND_PADDING);
    expect(bands[0].minY).toBe(0 - LANE_BAND_PADDING * 2);
    // width is dynamic: (maxX - minX) + NODE_RENDER_WIDTH + 2 * padding
    // Single column: maxX == minX → NODE_RENDER_WIDTH + 2 * padding
    expect(bands[0].width).toBe(NODE_RENDER_WIDTH + LANE_BAND_PADDING * 2);
    // height covers node height + padding
    expect(bands[0].height).toBe(
      140 - 0 + NODE_RENDER_HEIGHT + LANE_BAND_PADDING * 4,
    );
  });

  it("band width expands to cover horizontally spread nodes", () => {
    // Two nodes in the same lane at different x positions (horizontal spread)
    const nodes = [
      makeNode("a", "Frontend", 40, 0),
      makeNode("b", "Frontend", 260, 0),
    ];
    const bands = computeLaneBands(nodes);
    expect(bands).toHaveLength(1);
    // Band x starts at min(x) - padding
    expect(bands[0].x).toBe(40 - LANE_BAND_PADDING);
    // Width covers from minX to maxX + node width + padding on each side
    expect(bands[0].width).toBe(
      260 - 40 + NODE_RENDER_WIDTH + LANE_BAND_PADDING * 2,
    );
  });

  it("returns separate bands for different lanes with distinct X positions", () => {
    // In TB layout, nodes in different lanes are in different vertical columns (different X)
    const nodes = [
      makeNode("a", "Frontend", 40, 100),
      makeNode("b", "Backend", 320, 200),
    ];
    const bands = computeLaneBands(nodes);
    expect(bands).toHaveLength(2);
    const frontend = bands.find((b) => b.laneLabel === "Frontend");
    const backend = bands.find((b) => b.laneLabel === "Backend");
    expect(frontend).toBeDefined();
    expect(backend).toBeDefined();
    // Bands have distinct X positions (each lane is its own column)
    expect(frontend?.x).not.toBe(backend?.x);
    expect(frontend?.x).toBe(40 - LANE_BAND_PADDING);
    expect(backend?.x).toBe(320 - LANE_BAND_PADDING);
    // All bands share the same minY and height
    expect(frontend?.minY).toBe(backend?.minY);
    expect(frontend?.height).toBe(backend?.height);
  });

  it("uses node x position for band x", () => {
    const nodes = [makeNode("a", "Solo", 560, 100)];
    const bands = computeLaneBands(nodes);
    expect(bands[0].x).toBe(560 - LANE_BAND_PADDING);
  });

  it("all bands share global minY and uniform height", () => {
    const nodes = [
      makeNode("a", "Frontend", 40, 0),
      makeNode("b", "Backend", 320, 200),
      makeNode("c", "Backend", 320, 400),
    ];
    const bands = computeLaneBands(nodes);
    const frontend = bands.find((b) => b.laneLabel === "Frontend")!;
    const backend = bands.find((b) => b.laneLabel === "Backend")!;
    // Both share global minY (0, the smallest y across all nodes)
    expect(frontend.minY).toBe(backend.minY);
    expect(frontend.minY).toBe(0 - LANE_BAND_PADDING * 2);
    // Both share same height (global extent: 400 - 0 + NODE_RENDER_HEIGHT + 4*padding)
    expect(frontend.height).toBe(backend.height);
    expect(frontend.height).toBe(
      400 - 0 + NODE_RENDER_HEIGHT + LANE_BAND_PADDING * 4,
    );
  });
});

describe("normalizeMetric", () => {
  it("returns 0 when value equals min", () =>
    expect(normalizeMetric(0, 0, 10)).toBe(0));
  it("returns 1 when value equals max", () =>
    expect(normalizeMetric(10, 0, 10)).toBe(1));
  it("returns 0.5 for midpoint", () =>
    expect(normalizeMetric(5, 0, 10)).toBe(0.5));
  it("returns 0 when min === max (degenerate range)", () =>
    expect(normalizeMetric(5, 5, 5)).toBe(0));
});

describe("computeMetricRanges", () => {
  it("returns empty for no nodes", () =>
    expect(computeMetricRanges([])).toEqual({}));

  it("derives correct min and max from two nodes", () => {
    const n1 = makeNode("a", "L", 0, 0);
    const n2 = makeNode("b", "L", 0, 0);
    n1.data.metricSummary = {
      degree: 2,
      in_degree: 1,
      out_degree: 1,
      betweenness: 0.2,
      dependency_span: 3,
      estimate_days: 1,
      remaining_days: 5,
      downstream_effort_days: 6,
    };
    n2.data.metricSummary = {
      degree: 4,
      in_degree: 2,
      out_degree: 2,
      betweenness: 0.8,
      dependency_span: 5,
      estimate_days: 3,
      remaining_days: 8,
      downstream_effort_days: 12,
    };
    const ranges = computeMetricRanges([n1, n2]);
    expect(ranges.degree).toEqual({ min: 2, max: 4 });
    expect(ranges.betweenness).toEqual({ min: 0.2, max: 0.8 });
    expect(ranges.dependency_span).toEqual({ min: 3, max: 5 });
    expect(ranges.estimate_days).toEqual({ min: 1, max: 3 });
    expect(ranges.remaining_days).toEqual({ min: 5, max: 8 });
  });

  it("handles a single node (min === max)", () => {
    const n = makeNode("a", "L", 0, 0);
    n.data.metricSummary = {
      degree: 3,
      in_degree: 1,
      out_degree: 2,
      betweenness: 0.5,
      dependency_span: 4,
      estimate_days: 2,
      remaining_days: 6,
      downstream_effort_days: 9,
    };
    const ranges = computeMetricRanges([n]);
    expect(ranges.degree).toEqual({ min: 3, max: 3 });
  });
});

describe("getStatusAccentColor", () => {
  it("returns CSS variable for planned", () =>
    expect(getStatusAccentColor("planned")).toBe(
      "var(--color-status-planned)",
    ));
  it("returns CSS variable for ready", () =>
    expect(getStatusAccentColor("ready")).toBe("var(--color-status-ready)"));
  it("returns CSS variable for blocked", () =>
    expect(getStatusAccentColor("blocked")).toBe(
      "var(--color-status-blocked)",
    ));
  it("returns CSS variable for in_progress", () =>
    expect(getStatusAccentColor("in_progress")).toBe(
      "var(--color-status-in-progress)",
    ));
  it("returns CSS variable for done", () =>
    expect(getStatusAccentColor("done")).toBe("var(--color-status-done)"));
  it("returns CSS variable for future", () =>
    expect(getStatusAccentColor("future")).toBe("var(--color-status-future)"));
});

describe("getPriorityAccentColor", () => {
  it("p0 → petal", () =>
    expect(getPriorityAccentColor("p0")).toBe("var(--color-petal)"));
  it("p1 → pollen", () =>
    expect(getPriorityAccentColor("p1")).toBe("var(--color-pollen)"));
  it("p2 → moss", () =>
    expect(getPriorityAccentColor("p2")).toBe("var(--color-moss)"));
  it("p3 → water", () =>
    expect(getPriorityAccentColor("p3")).toBe("var(--color-water)"));
  it("nice_to_have → iron", () =>
    expect(getPriorityAccentColor("nice_to_have")).toBe("var(--color-iron)"));
});

describe("getLanePaletteColor", () => {
  it("returns a non-empty string", () =>
    expect(getLanePaletteColor(0).length).toBeGreaterThan(0));
  it("is deterministic for the same index", () => {
    expect(getLanePaletteColor(0)).toBe(getLanePaletteColor(0));
  });
  it("returns a value from the botanical palette (starts with var(--color-))", () => {
    expect(getLanePaletteColor(1)).toMatch(/^var\(--color-/);
  });
  it("assigns unique colors for indices 0 through 7", () => {
    const colors = Array.from({ length: 8 }, (_, i) => getLanePaletteColor(i));
    expect(new Set(colors).size).toBe(8);
  });
  it("wraps around when index exceeds palette size", () => {
    expect(getLanePaletteColor(8)).toBe(getLanePaletteColor(0));
  });
});
