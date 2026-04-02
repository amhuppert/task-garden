import { describe, expect, it } from "vitest";
import type { TaskGardenPlan } from "../plan/task-garden-plan.schema";
import { createPlanAnalysisEngine } from "./plan-analysis-engine";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePlan(overrides: Partial<TaskGardenPlan> = {}): TaskGardenPlan {
  return {
    version: 1,
    plan_id: "test-plan",
    title: "Test Plan",
    last_updated: "2024-01-01",
    summary: "A plan for testing.",
    references: [],
    lanes: [
      { id: "backend", label: "Backend" },
      { id: "frontend", label: "Frontend" },
    ],
    work_items: [],
    ...overrides,
  };
}

// A simple linear chain: A → B → C (A must be done before B, B before C)
const LINEAR_PLAN = makePlan({
  lanes: [{ id: "core", label: "Core" }],
  work_items: [
    {
      id: "task-a",
      title: "Task A",
      summary: "First",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: [],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "task-b",
      title: "Task B",
      summary: "Second",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: ["task-a"],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "task-c",
      title: "Task C",
      summary: "Third",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: ["task-b"],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
});

// Diamond: A → B, A → C, B → D, C → D
const DIAMOND_PLAN = makePlan({
  lanes: [{ id: "core", label: "Core" }],
  work_items: [
    {
      id: "a",
      title: "A",
      summary: "Root",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: [],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "b",
      title: "B",
      summary: "Branch B",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: ["a"],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "c",
      title: "C",
      summary: "Branch C",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: ["a"],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "d",
      title: "D",
      summary: "Leaf",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: ["b", "c"],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
});

// Single item
const SINGLE_PLAN = makePlan({
  lanes: [{ id: "core", label: "Core" }],
  work_items: [
    {
      id: "only",
      title: "Only",
      summary: "Lone item",
      lane: "core",
      status: "planned",
      priority: "p1",
      depends_on: [],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
});

// ---------------------------------------------------------------------------
// Task 3.1: Canonical graph snapshot
// ---------------------------------------------------------------------------

describe("PlanAnalysisEngine — task 3.1: canonical graph snapshot", () => {
  describe("workItems lookup", () => {
    it("contains all work items keyed by id", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(Object.keys(snap.workItems)).toEqual(
        expect.arrayContaining(["task-a", "task-b", "task-c"]),
      );
      expect(Object.keys(snap.workItems).length).toBe(3);
    });

    it("values match original work items", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.workItems["task-a"].title).toBe("Task A");
    });
  });

  describe("laneOrder", () => {
    it("preserves the order lanes appear in the plan", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(
        makePlan({
          lanes: [
            { id: "backend", label: "Backend" },
            { id: "frontend", label: "Frontend" },
            { id: "infra", label: "Infra" },
          ],
          work_items: [
            {
              id: "x",
              title: "X",
              summary: "s",
              lane: "backend",
              status: "planned",
              priority: "p1",
              depends_on: [],
              tags: [],
              deliverables: [],
              reuse_candidates: [],
              links: [],
            },
          ],
        }),
      );
      expect(snap.laneOrder).toEqual(["backend", "frontend", "infra"]);
    });
  });

  describe("roots and leaves", () => {
    it("roots are items with no dependencies (in_degree = 0)", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.roots).toEqual(["task-a"]);
    });

    it("leaves are items with no dependents (out_degree = 0)", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.leaves).toEqual(["task-c"]);
    });

    it("single item is both root and leaf", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(SINGLE_PLAN);
      expect(snap.roots).toContain("only");
      expect(snap.leaves).toContain("only");
    });

    it("diamond: only a is root", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.roots).toEqual(["a"]);
    });

    it("diamond: only d is leaf", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.leaves).toEqual(["d"]);
    });
  });

  describe("topologicalOrder", () => {
    it("contains all work item ids", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.topologicalOrder).toHaveLength(3);
      expect(snap.topologicalOrder).toEqual(
        expect.arrayContaining(["task-a", "task-b", "task-c"]),
      );
    });

    it("dependencies come before dependents in linear chain", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      const order = snap.topologicalOrder;
      expect(order.indexOf("task-a")).toBeLessThan(order.indexOf("task-b"));
      expect(order.indexOf("task-b")).toBeLessThan(order.indexOf("task-c"));
    });

    it("diamond: a comes before b, c, and d", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      const order = snap.topologicalOrder;
      expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
      expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
      expect(order.indexOf("a")).toBeLessThan(order.indexOf("d"));
      expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
      expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
    });
  });

  describe("WorkItemAnalysis — dependencyIds and dependentIds", () => {
    it("dependencyIds matches depends_on for middle item", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-b"].dependencyIds).toEqual(["task-a"]);
    });

    it("dependentIds reflects reverse edges", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-a"].dependentIds).toEqual(["task-b"]);
    });

    it("root has empty dependencyIds", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-a"].dependencyIds).toEqual([]);
    });

    it("leaf has empty dependentIds", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-c"].dependentIds).toEqual([]);
    });

    it("diamond: d has b and c as dependencyIds", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.analysisById.d.dependencyIds).toEqual(
        expect.arrayContaining(["b", "c"]),
      );
    });
  });

  describe("WorkItemAnalysis — levels", () => {
    it("root is at level 0", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-a"].level).toBe(0);
    });

    it("direct dependency is at level 1", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-b"].level).toBe(1);
    });

    it("second-order dependency is at level 2", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-c"].level).toBe(2);
    });

    it("diamond: d is at level 2 (longest path from a)", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.analysisById.d.level).toBe(2);
    });

    it("single item is at level 0", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(SINGLE_PLAN);
      expect(snap.analysisById.only.level).toBe(0);
    });
  });

  describe("WorkItemAnalysis — isRoot / isLeaf", () => {
    it("root item has isRoot=true", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-a"].isRoot).toBe(true);
    });

    it("non-root item has isRoot=false", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-b"].isRoot).toBe(false);
    });

    it("leaf item has isLeaf=true", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-c"].isLeaf).toBe(true);
    });

    it("non-leaf item has isLeaf=false", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-b"].isLeaf).toBe(false);
    });
  });

  describe("WorkItemAnalysis — topologicalIndex", () => {
    it("topologicalIndex matches position in topologicalOrder array", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      for (const id of snap.topologicalOrder) {
        expect(snap.analysisById[id].topologicalIndex).toBe(
          snap.topologicalOrder.indexOf(id),
        );
      }
    });
  });

  describe("plan reference on snapshot", () => {
    it("snapshot.plan refers to the validated plan", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.plan.plan_id).toBe("test-plan");
    });
  });
});

// ---------------------------------------------------------------------------
// Task 3.2: Metrics and longest dependency chain
// ---------------------------------------------------------------------------

describe("PlanAnalysisEngine — task 3.2: metrics and longest dependency chain", () => {
  describe("metrics on WorkItemAnalysis", () => {
    it("in_degree equals number of depends_on entries", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-b"].metrics.in_degree).toBe(1);
      expect(snap.analysisById["task-a"].metrics.in_degree).toBe(0);
    });

    it("out_degree equals number of direct dependents", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-a"].metrics.out_degree).toBe(1);
      expect(snap.analysisById["task-c"].metrics.out_degree).toBe(0);
    });

    it("degree equals in_degree + out_degree", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      for (const id of snap.topologicalOrder) {
        const m = snap.analysisById[id].metrics;
        expect(m.degree).toBe(m.in_degree + m.out_degree);
      }
    });

    it("diamond: a has in_degree=0 and out_degree=2", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.analysisById.a.metrics.in_degree).toBe(0);
      expect(snap.analysisById.a.metrics.out_degree).toBe(2);
    });

    it("diamond: d has in_degree=2 and out_degree=0", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.analysisById.d.metrics.in_degree).toBe(2);
      expect(snap.analysisById.d.metrics.out_degree).toBe(0);
    });

    it("betweenness centrality values are numbers between 0 and 1 (normalized)", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      for (const id of snap.topologicalOrder) {
        const bc = snap.analysisById[id].metrics.betweenness;
        expect(typeof bc).toBe("number");
        expect(bc).toBeGreaterThanOrEqual(0);
        expect(bc).toBeLessThanOrEqual(1);
      }
    });

    it("dependency_span is 0 for leaves", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.analysisById["task-c"].metrics.dependency_span).toBe(0);
    });

    it("dependency_span for root reflects remaining depth", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      // task-a at level 0, furthest leaf (task-c) at level 2 => span = 2
      expect(snap.analysisById["task-a"].metrics.dependency_span).toBe(2);
    });

    it("dependency_span for middle item in linear chain is 1", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      // task-b at level 1, furthest leaf (task-c) at level 2 => span = 1
      expect(snap.analysisById["task-b"].metrics.dependency_span).toBe(1);
    });
  });

  describe("metricRanges", () => {
    it("contains all MetricKey entries", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      const keys = Object.keys(snap.metricRanges);
      expect(keys).toEqual(
        expect.arrayContaining([
          "degree",
          "in_degree",
          "out_degree",
          "betweenness",
          "dependency_span",
        ]),
      );
    });

    it("min is less than or equal to max for every metric", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      for (const key of Object.keys(snap.metricRanges) as Array<
        keyof typeof snap.metricRanges
      >) {
        expect(snap.metricRanges[key].min).toBeLessThanOrEqual(
          snap.metricRanges[key].max,
        );
      }
    });

    it("in_degree min=0 for a plan with at least one root", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.metricRanges.in_degree.min).toBe(0);
    });

    it("in_degree max equals the max number of dependencies across items", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      // d has 2 dependencies
      expect(snap.metricRanges.in_degree.max).toBe(2);
    });

    it("single item plan has min=max=0 for all degree metrics", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(SINGLE_PLAN);
      expect(snap.metricRanges.degree.min).toBe(0);
      expect(snap.metricRanges.degree.max).toBe(0);
    });
  });

  describe("longestDependencyChain", () => {
    it("label is exactly 'longest_dependency_chain'", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.longestDependencyChain.label).toBe(
        "longest_dependency_chain",
      );
    });

    it("length matches workItemIds count", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      expect(snap.longestDependencyChain.length).toBe(
        snap.longestDependencyChain.workItemIds.length,
      );
    });

    it("linear chain: longest chain includes all 3 items in dependency order", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      const chain = snap.longestDependencyChain.workItemIds;
      expect(chain).toHaveLength(3);
      expect(chain[0]).toBe("task-a");
      expect(chain[1]).toBe("task-b");
      expect(chain[2]).toBe("task-c");
    });

    it("diamond: longest chain has length 3", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      expect(snap.longestDependencyChain.length).toBe(3);
    });

    it("diamond: chain starts with a and ends with d", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(DIAMOND_PLAN);
      const chain = snap.longestDependencyChain.workItemIds;
      expect(chain[0]).toBe("a");
      expect(chain[chain.length - 1]).toBe("d");
    });

    it("single item: chain contains just that item", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(SINGLE_PLAN);
      expect(snap.longestDependencyChain.workItemIds).toEqual(["only"]);
      expect(snap.longestDependencyChain.length).toBe(1);
    });

    it("chain items are in dependency order (each depends on previous)", () => {
      const engine = createPlanAnalysisEngine();
      const snap = engine.build(LINEAR_PLAN);
      const chain = snap.longestDependencyChain.workItemIds;
      for (let i = 1; i < chain.length; i++) {
        const item = snap.workItems[chain[i]];
        expect(item.depends_on).toContain(chain[i - 1]);
      }
    });
  });
});
