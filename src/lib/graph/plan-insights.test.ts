import { describe, expect, it } from "vitest";
import type {
  TaskGardenPlan,
  TaskGardenWorkItem,
} from "../plan/task-garden-plan.schema";
import { createPlanAnalysisEngine } from "./plan-analysis-engine";
import {
  buildOverviewRollups,
  buildReadyCandidates,
  isReadyToWork,
  rankHighImportance,
  rankReadyByValue,
  rankReadyByValueDensity,
  rankTopByDegree,
  rankUnlockedEffortLeaders,
} from "./plan-insights";

function makeItem(
  overrides: Partial<TaskGardenWorkItem> & { id: string },
): TaskGardenWorkItem {
  return {
    title: overrides.id,
    summary: "Summary.",
    lane: "core",
    status: "planned",
    value: 10,
    depends_on: [],
    tags: [],
    deliverables: [],
    reuse_candidates: [],
    links: [],
    ...overrides,
  };
}

function makePlan(workItems: TaskGardenWorkItem[]): TaskGardenPlan {
  return {
    version: 1,
    plan_id: "insights-test",
    title: "Insights Test",
    last_updated: "2026-04-03",
    summary: "Fixture plan for plan-insights.",
    estimate_unit: "days",
    references: [],
    lanes: [{ id: "core", label: "Core" }],
    work_items: workItems,
  };
}

function buildSnapshot(workItems: TaskGardenWorkItem[]) {
  return createPlanAnalysisEngine().build(makePlan(workItems));
}

describe("isReadyToWork", () => {
  it("accepts explicitly ready items even with unfinished dependencies", () => {
    const snapshot = buildSnapshot([
      makeItem({ id: "dep", status: "planned" }),
      makeItem({ id: "item", status: "ready", depends_on: ["dep"] }),
    ]);
    expect(isReadyToWork(snapshot.workItems.item!, snapshot)).toBe(true);
  });

  it("accepts planned items whose dependencies are all done", () => {
    const snapshot = buildSnapshot([
      makeItem({ id: "dep", status: "done" }),
      makeItem({ id: "item", status: "planned", depends_on: ["dep"] }),
    ]);
    expect(isReadyToWork(snapshot.workItems.item!, snapshot)).toBe(true);
  });

  it("rejects planned items with an unfinished dependency", () => {
    const snapshot = buildSnapshot([
      makeItem({ id: "dep", status: "in_progress" }),
      makeItem({ id: "item", status: "planned", depends_on: ["dep"] }),
    ]);
    expect(isReadyToWork(snapshot.workItems.item!, snapshot)).toBe(false);
  });

  it("rejects blocked, done, future, and in-progress items", () => {
    const snapshot = buildSnapshot([
      makeItem({ id: "blocked-item", status: "blocked" }),
      makeItem({ id: "done-item", status: "done" }),
      makeItem({ id: "future-item", status: "future" }),
      makeItem({ id: "wip-item", status: "in_progress" }),
    ]);
    for (const id of ["blocked-item", "done-item", "future-item", "wip-item"]) {
      expect(isReadyToWork(snapshot.workItems[id]!, snapshot)).toBe(false);
    }
  });
});

describe("buildReadyCandidates", () => {
  it("computes value density only for candidates with a positive estimate", () => {
    const snapshot = buildSnapshot([
      makeItem({ id: "estimated", status: "ready", value: 50, estimate: 2 }),
      makeItem({ id: "unestimated", status: "ready", value: 90 }),
      makeItem({ id: "excluded", status: "done", value: 100, estimate: 1 }),
    ]);
    const candidates = buildReadyCandidates(snapshot);
    expect(candidates.map((c) => c.item.id).sort()).toEqual([
      "estimated",
      "unestimated",
    ]);
    const estimated = candidates.find((c) => c.item.id === "estimated")!;
    expect(estimated.effort).toBe(2);
    expect(estimated.valueDensity).toBe(25);
    const unestimated = candidates.find((c) => c.item.id === "unestimated")!;
    expect(unestimated.effort).toBeNull();
    expect(unestimated.valueDensity).toBeNull();
  });
});

describe("ready rankings", () => {
  const snapshot = buildSnapshot([
    makeItem({
      id: "cheap-impact",
      title: "Cheap Impact",
      status: "ready",
      value: 50,
      estimate: 1,
    }),
    makeItem({
      id: "high-value-big",
      title: "High Value Big",
      status: "ready",
      value: 100,
      estimate: 10,
    }),
    makeItem({
      id: "no-effort-impact",
      title: "No Effort Impact",
      status: "ready",
      value: 90,
    }),
  ]);
  const candidates = buildReadyCandidates(snapshot);

  it("ranks by value density with unestimated candidates last", () => {
    expect(rankReadyByValueDensity(candidates).map((c) => c.item.id)).toEqual([
      "cheap-impact",
      "high-value-big",
      "no-effort-impact",
    ]);
  });

  it("ranks by authored value regardless of estimates", () => {
    expect(rankReadyByValue(candidates).map((c) => c.item.id)).toEqual([
      "high-value-big",
      "no-effort-impact",
      "cheap-impact",
    ]);
  });

  it("breaks value ties alphabetically by title", () => {
    const tied = buildReadyCandidates(
      buildSnapshot([
        makeItem({ id: "b", title: "Beta", status: "ready", value: 10 }),
        makeItem({ id: "a", title: "Alpha", status: "ready", value: 10 }),
      ]),
    );
    expect(rankReadyByValue(tied).map((c) => c.item.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });
});

describe("buildOverviewRollups", () => {
  it("rolls up status segments, completion, and effort", () => {
    const rollups = buildOverviewRollups(
      buildSnapshot([
        makeItem({ id: "a", status: "done", estimate: 3 }),
        makeItem({ id: "b", status: "done", estimate: 1 }),
        makeItem({ id: "c", status: "in_progress", estimate: 2 }),
        makeItem({ id: "d", status: "planned", estimate: 2 }),
      ]),
    );
    expect(rollups.totalItems).toBe(4);
    expect(rollups.laneCount).toBe(1);
    expect(rollups.statusSegments).toEqual([
      { status: "done", count: 2 },
      { status: "in_progress", count: 1 },
      { status: "planned", count: 1 },
    ]);
    expect(rollups.doneCount).toBe(2);
    expect(rollups.donePercent).toBe(50);
    expect(rollups.doneEffort).toBe(4);
    expect(rollups.estimatedTotalEffort).toBe(8);
    expect(rollups.effortPercent).toBe(50);
  });

  it("reports null effort percent when nothing is estimated", () => {
    const rollups = buildOverviewRollups(
      buildSnapshot([makeItem({ id: "a", status: "planned" })]),
    );
    expect(rollups.effortPercent).toBeNull();
  });
});

describe("metric rankings", () => {
  // root → bridge → {x, y, z}: bridge sits on every root-to-leaf path.
  // Leaves are unestimated so they gate no effort (downstream effort
  // includes an item's own estimate).
  const snapshot = buildSnapshot([
    makeItem({ id: "root", estimate: 1 }),
    makeItem({ id: "bridge", depends_on: ["root"], estimate: 2 }),
    makeItem({ id: "x", depends_on: ["bridge"] }),
    makeItem({ id: "y", depends_on: ["bridge"] }),
    makeItem({ id: "z", depends_on: ["bridge"] }),
  ]);

  it("ranks high importance by betweenness and respects the limit", () => {
    const ranked = rankHighImportance(snapshot, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.item.id).toBe("bridge");
  });

  it("ranks unlocked effort leaders and excludes items gating nothing", () => {
    const ranked = rankUnlockedEffortLeaders(snapshot, 10);
    expect(ranked.map((r) => r.item.id)).toEqual(["root", "bridge"]);
    expect(ranked[0]!.analysis.metrics.downstream_effort_days).toBeGreaterThan(
      ranked[1]!.analysis.metrics.downstream_effort_days,
    );
  });

  it("ranks top items by degree and respects the limit", () => {
    const ranked = rankTopByDegree(snapshot, 3);
    expect(ranked).toHaveLength(3);
    expect(ranked[0]!.item.id).toBe("bridge");
    for (const pair of ranked.slice(1)) {
      expect(pair.analysis.metrics.degree).toBeLessThanOrEqual(
        ranked[0]!.analysis.metrics.degree,
      );
    }
  });
});
