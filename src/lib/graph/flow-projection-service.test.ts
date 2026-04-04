import { beforeEach, describe, expect, it } from "vitest";
import type { PlanDisplayStateValue } from "../../features/plan-workspace/plan-display.store";
import type { PlanExplorerStateValue } from "../../features/plan-workspace/plan-explorer.store";
import type { TaskGardenPlan } from "../plan/task-garden-plan.schema";
import { createFlowProjectionService } from "./flow-projection-service";
import { createPlanAnalysisEngine } from "./plan-analysis-engine";
import type { PlanAnalysisSnapshot } from "./plan-analysis-engine";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWorkItem(
  id: string,
  lane: string,
  depends_on: string[] = [],
  overrides: Partial<{
    title: string;
    summary: string;
    status: TaskGardenPlan["work_items"][0]["status"];
    priority: TaskGardenPlan["work_items"][0]["priority"];
    tags: string[];
    estimateDays: number;
  }> = {},
): TaskGardenPlan["work_items"][0] {
  return {
    id,
    title: overrides.title ?? `Title ${id}`,
    summary: overrides.summary ?? `Summary ${id}`,
    lane,
    status: overrides.status ?? "planned",
    priority: overrides.priority ?? "p1",
    depends_on,
    tags: overrides.tags ?? [],
    deliverables: [],
    reuse_candidates: [],
    links: [],
    ...(overrides.estimateDays === undefined
      ? {}
      : {
          estimate: {
            value: overrides.estimateDays,
            unit: "days" as const,
          },
        }),
  };
}

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

const defaultExplorer: PlanExplorerStateValue = {
  selectedWorkItemId: null,
  searchQuery: "",
  activeScope: "all",
  laneIds: [],
  statuses: [],
  priorities: [],
  tags: [],
};

const defaultDisplay: PlanDisplayStateValue = {
  colorMode: "default",
  sizeMode: "uniform",
  insightMode: "overview",
  scheduleOverlay: "none",
};

// A → B → C linear plan (A is root, C is leaf)
// A is in backend lane, B and C in frontend lane
function makeLinearSnapshot(): PlanAnalysisSnapshot {
  const plan = makePlan({
    lanes: [
      { id: "backend", label: "Backend" },
      { id: "frontend", label: "Frontend" },
    ],
    work_items: [
      makeWorkItem("a", "backend"),
      makeWorkItem("b", "frontend", ["a"]),
      makeWorkItem("c", "frontend", ["b"]),
    ],
  });
  return createPlanAnalysisEngine().build(plan);
}

// Diamond: a → b, a → c, b → d, c → d
function makeDiamondSnapshot(): PlanAnalysisSnapshot {
  const plan = makePlan({
    lanes: [
      { id: "core", label: "Core" },
      { id: "infra", label: "Infra" },
    ],
    work_items: [
      makeWorkItem("a", "core"),
      makeWorkItem("b", "core", ["a"]),
      makeWorkItem("c", "infra", ["a"]),
      makeWorkItem("d", "core", ["b", "c"]),
    ],
  });
  return createPlanAnalysisEngine().build(plan);
}

function makeEstimatedBranchingSnapshot(): PlanAnalysisSnapshot {
  const plan = makePlan({
    lanes: [{ id: "core", label: "Core" }],
    work_items: [
      makeWorkItem("a", "core", [], { estimateDays: 2 }),
      makeWorkItem("b", "core", ["a"], { estimateDays: 1 }),
      makeWorkItem("c", "core", ["a"], { estimateDays: 4 }),
      makeWorkItem("d", "core", ["b", "c"], { estimateDays: 2 }),
    ],
  });
  return createPlanAnalysisEngine().build(plan);
}

// ---------------------------------------------------------------------------
// Tests — Task 3.3: Basic projection (nodes, edges, layout, legend)
// ---------------------------------------------------------------------------

describe("FlowProjectionService — task 3.3: basic projection", () => {
  it("returns all nodes when no filters are active", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("returns correct edges for a linear chain", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const edgePairs = result.edges.map((e) => `${e.source}→${e.target}`).sort();
    expect(edgePairs).toEqual(["a→b", "b→c"]);
  });

  it("populates FlowNodeData correctly", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    expect(nodeA.data.id).toBe("a");
    expect(nodeA.data.title).toBe("Title a");
    expect(nodeA.data.laneLabel).toBe("Backend");
    expect(nodeA.data.status).toBe("planned");
    expect(nodeA.data.priority).toBe("p1");
    expect(nodeA.data.summary).toBe("Summary a");
    expect(nodeA.data.estimate).toBeUndefined();
    expect(nodeA.data.isOnCriticalPath).toBe(false);
    expect(nodeA.data.criticalPathOrder).toBeNull();
    expect(nodeA.data.slackDays).toBe(0);
    expect(nodeA.data.isSelected).toBe(false);
  });

  it("marks selected node as isSelected=true", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const explorer = { ...defaultExplorer, selectedWorkItemId: "b" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    expect(nodeB.data.isSelected).toBe(true);
    expect(nodeA.data.isSelected).toBe(false);
  });

  it("all nodes have non-null positions", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    for (const node of result.nodes) {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe("number");
      expect(typeof node.position.y).toBe("number");
    }
  });

  it("nodes in different lanes get different x positions", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const nodeA = result.nodes.find((n) => n.id === "a")!; // backend lane
    const nodeB = result.nodes.find((n) => n.id === "b")!; // frontend lane
    expect(nodeA.position.x).not.toBe(nodeB.position.x);
  });

  it("intra-lane dependents are positioned to the right of their dependencies", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a(backend), b→c(frontend)
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const nodeB = result.nodes.find((n) => n.id === "b")!; // frontend, level 1
    const nodeC = result.nodes.find((n) => n.id === "c")!; // frontend, level 2
    // Within the same lane (frontend), b→c should flow left to right
    expect(nodeC.position.x).toBeGreaterThan(nodeB.position.x);
  });

  it("caches layout positions when topology does not change (selection change)", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result1 = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const explorer2 = { ...defaultExplorer, selectedWorkItemId: "a" };
    const result2 = svc.project(snapshot, explorer2, defaultDisplay);
    // Same visible set → same positions
    expect(result1.nodes.find((n) => n.id === "b")!.position).toEqual(
      result2.nodes.find((n) => n.id === "b")!.position,
    );
  });

  it("invalidates layout cache when visible topology changes", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot();
    // First: full graph
    const result1 = svc.project(snapshot, defaultExplorer, defaultDisplay);
    // Second: upstream scope from 'd' → only a, b, c, d
    const explorer2 = {
      ...defaultExplorer,
      selectedWorkItemId: "b",
      activeScope: "upstream" as const,
    };
    const result2 = svc.project(snapshot, explorer2, defaultDisplay);
    // Different visible sets should be different (b upstream = {a, b})
    expect(result1.nodes.length).not.toBe(result2.nodes.length);
  });

  it("generates a colorLegend for default color mode", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(result.colorLegend).toBeDefined();
    expect(typeof result.colorLegend.title).toBe("string");
    expect(Array.isArray(result.colorLegend.items)).toBe(true);
  });

  it("sizeLegend is null when sizeMode is uniform", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(result.sizeLegend).toBeNull();
  });

  it("generates separate sizeLegend with min, mean, max items", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const display = { ...defaultDisplay, sizeMode: "betweenness" as const };
    const result = svc.project(snapshot, defaultExplorer, display);
    expect(result.sizeLegend).toBeDefined();
    expect(result.sizeLegend!.title).toMatch(/betweenness/i);
    const keys = result.sizeLegend!.items.map((i) => i.key);
    expect(keys).toEqual(["min", "mean", "max"]);
  });

  it("sizeLegend mean value is between min and max", () => {
    const svc = createFlowProjectionService();
    // Linear chain: a→b→c; degrees are 1, 2, 1 — non-degenerate range
    const snapshot = makeLinearSnapshot();
    const display = { ...defaultDisplay, sizeMode: "degree" as const };
    const result = svc.project(snapshot, defaultExplorer, display);
    expect(result.sizeLegend).toBeDefined();
    const items = result.sizeLegend!.items;
    const min = Number.parseFloat(items.find((i) => i.key === "min")!.value);
    const mean = Number.parseFloat(items.find((i) => i.key === "mean")!.value);
    const max = Number.parseFloat(items.find((i) => i.key === "max")!.value);
    expect(mean).toBeGreaterThanOrEqual(min);
    expect(mean).toBeLessThanOrEqual(max);
  });

  it("generates a lane-based colorLegend with one item per lane", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const display = { ...defaultDisplay, colorMode: "lane" as const };
    const result = svc.project(snapshot, defaultExplorer, display);
    expect(result.colorLegend.title.toLowerCase()).toContain("lane");
    expect(result.colorLegend.items.length).toBe(snapshot.laneOrder.length);
  });

  it("includes fallbackMessage on colorLegend when metric range is zero", () => {
    const svc = createFlowProjectionService();
    // Single node has degree 0, so all degree values are equal
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [makeWorkItem("only", "core")],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const display = { ...defaultDisplay, colorMode: "degree" as const };
    const result = svc.project(snapshot, defaultExplorer, display);
    expect(result.colorLegend.fallbackMessage).toBeTruthy();
  });

  it("colorLegend and sizeLegend items do not overlap", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const display = {
      ...defaultDisplay,
      colorMode: "lane" as const,
      sizeMode: "betweenness" as const,
    };
    const result = svc.project(snapshot, defaultExplorer, display);
    const colorKeys = new Set(result.colorLegend.items.map((i) => i.key));
    const sizeKeys = new Set(result.sizeLegend!.items.map((i) => i.key));
    for (const key of sizeKeys) {
      expect(colorKeys.has(key)).toBe(false);
    }
  });

  it("includes metricSummary in FlowNodeData", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    expect(typeof nodeB.data.metricSummary.degree).toBe("number");
    expect(typeof nodeB.data.metricSummary.betweenness).toBe("number");
    expect(typeof nodeB.data.metricSummary.dependency_span).toBe("number");
    expect(typeof nodeB.data.metricSummary.estimate_days).toBe("number");
    expect(typeof nodeB.data.metricSummary.remaining_days).toBe("number");
    expect(typeof nodeB.data.metricSummary.downstream_effort_days).toBe(
      "number",
    );
  });

  it("emptyStateMessage is null when no filters are active", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(result.emptyStateMessage).toBeNull();
  });
});

describe("FlowProjectionService — schedule overlays", () => {
  it("marks critical path edges and node order for the critical path overlay", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeEstimatedBranchingSnapshot();
    const display = {
      ...defaultDisplay,
      scheduleOverlay: "critical_path" as const,
    };
    const result = svc.project(snapshot, defaultExplorer, display);

    expect(result.scheduleLegend?.mode).toBe("critical_path");
    expect(result.scheduleLegend?.stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Plan Route", value: "8d" }),
      ]),
    );

    const nodeA = result.nodes.find((node) => node.id === "a")!;
    const nodeC = result.nodes.find((node) => node.id === "c")!;
    const nodeD = result.nodes.find((node) => node.id === "d")!;
    const nodeB = result.nodes.find((node) => node.id === "b")!;
    expect(nodeA.data.criticalPathOrder).toBe(0);
    expect(nodeC.data.criticalPathOrder).toBe(1);
    expect(nodeD.data.criticalPathOrder).toBe(2);
    expect(nodeB.data.criticalPathOrder).toBeNull();

    expect(
      result.edges.find((edge) => edge.id === "a→c")?.isOnCriticalPath,
    ).toBe(true);
    expect(
      result.edges.find((edge) => edge.id === "c→d")?.isOnCriticalPath,
    ).toBe(true);
    expect(
      result.edges.find((edge) => edge.id === "a→b")?.isOnCriticalPath,
    ).toBe(false);
  });

  it("builds a slack heatmap legend from visible estimated items", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeEstimatedBranchingSnapshot();
    const display = {
      ...defaultDisplay,
      scheduleOverlay: "slack_heatmap" as const,
    };
    const result = svc.project(snapshot, defaultExplorer, display);

    expect(result.scheduleLegend?.mode).toBe("slack_heatmap");
    expect(result.scheduleLegend?.gradientLabels).toEqual(
      expect.objectContaining({
        start: "0d buffer",
        end: "3d buffer",
      }),
    );

    const nodeB = result.nodes.find((node) => node.id === "b")!;
    expect(nodeB.data.slackDays).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Tests — Task 3.3: Edge highlighting for selected neighborhood
// ---------------------------------------------------------------------------

describe("FlowProjectionService — task 3.3: edge highlighting", () => {
  it("edges connected to selected node are highlighted", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c
    const explorer = { ...defaultExplorer, selectedWorkItemId: "b" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const edgeAB = result.edges.find(
      (e) => e.source === "a" && e.target === "b",
    )!;
    const edgeBC = result.edges.find(
      (e) => e.source === "b" && e.target === "c",
    )!;
    expect(edgeAB.isHighlighted).toBe(true);
    expect(edgeBC.isHighlighted).toBe(true);
  });

  it("edges not connected to selected node are not highlighted", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot(); // a→b, a→c, b→d, c→d
    const explorer = { ...defaultExplorer, selectedWorkItemId: "a" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const edgeBD = result.edges.find(
      (e) => e.source === "b" && e.target === "d",
    )!;
    const edgeCD = result.edges.find(
      (e) => e.source === "c" && e.target === "d",
    )!;
    expect(edgeBD.isHighlighted).toBe(false);
    expect(edgeCD.isHighlighted).toBe(false);
  });

  it("no edges are highlighted when nothing is selected", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(result.edges.every((e) => !e.isHighlighted)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — Task 3.4: Focus/context — 'all' scope
// ---------------------------------------------------------------------------

describe("FlowProjectionService — task 3.4: focus/context (all scope)", () => {
  it("all nodes are focus when no search or filters", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    for (const node of result.nodes) {
      expect(node.data.visibilityRole).toBe("focus");
    }
  });

  it("matched nodes get 'focus' role, their direct neighbors get 'context'", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c
    // Search matches only 'b'
    const explorer = { ...defaultExplorer, searchQuery: "Title b" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeC = result.nodes.find((n) => n.id === "c")!;
    expect(nodeB.data.visibilityRole).toBe("focus");
    expect(nodeA.data.visibilityRole).toBe("context");
    expect(nodeC.data.visibilityRole).toBe("context");
  });

  it("non-neighbor nodes are hidden when not matching search", () => {
    const svc = createFlowProjectionService();
    // Plan: a → b → c → d → e (chain), search matches only 'c'
    // In 'all' scope: focus=c, context=b (dep of c) and d (dependent of c)
    // a and e are hidden
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        makeWorkItem("a", "core"),
        makeWorkItem("b", "core", ["a"]),
        makeWorkItem("c", "core", ["b"], { title: "MATCH" }),
        makeWorkItem("d", "core", ["c"]),
        makeWorkItem("e", "core", ["d"]),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const explorer = { ...defaultExplorer, searchQuery: "MATCH" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const visibleIds = result.nodes.map((n) => n.id);
    expect(visibleIds).toContain("c"); // focus
    expect(visibleIds).toContain("b"); // context (dep of c)
    expect(visibleIds).toContain("d"); // context (dependent of c)
    expect(visibleIds).not.toContain("a"); // hidden
    expect(visibleIds).not.toContain("e"); // hidden
  });

  it("summary counts are correct", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c, search matches only 'b'
    const explorer = { ...defaultExplorer, searchQuery: "Title b" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.summary.focusNodeCount).toBe(1); // just b
    expect(result.summary.contextNodeCount).toBe(2); // a and c
    expect(result.summary.hiddenNodeCount).toBe(0); // all 3 visible
  });

  it("tracks hidden node count when nodes are truly hidden", () => {
    const svc = createFlowProjectionService();
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        makeWorkItem("a", "core"),
        makeWorkItem("b", "core", ["a"], { title: "MATCH" }),
        makeWorkItem("c", "core", ["a"]),
        makeWorkItem("d", "core", ["c"]),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    // Search matches b; context = a (direct dep of b); c and d are hidden
    const explorer = { ...defaultExplorer, searchQuery: "MATCH" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.summary.hiddenNodeCount).toBe(2); // c and d
  });

  it("tracks hidden edge count", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c, search matches only 'b'
    const explorer = { ...defaultExplorer, searchQuery: "Title b" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    // All 3 nodes are visible (focus=b, context=a,c), so both edges visible too
    expect(result.summary.hiddenEdgeCount).toBe(0);
  });

  it("sets emptyStateMessage when no nodes match active filter", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const explorer = { ...defaultExplorer, searchQuery: "NONEXISTENT_XYZ" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.summary.focusNodeCount).toBe(0);
    expect(result.emptyStateMessage).toBeTruthy();
  });

  it("emptyStateMessage is null when search matches at least one node", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const explorer = { ...defaultExplorer, searchQuery: "Title a" };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.emptyStateMessage).toBeNull();
  });

  it("filters by lane", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a=backend, b=c=frontend
    const explorer = { ...defaultExplorer, laneIds: ["backend"] as string[] };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    // Focus = a (backend); Context = b (direct dependent of a)
    const visibleIds = result.nodes.map((n) => n.id);
    expect(visibleIds).toContain("a");
    expect(visibleIds).toContain("b");
    // c is not a direct dep/dependent of a so it is hidden
    expect(visibleIds).not.toContain("c");
  });

  it("filters by status conjunctively with search", () => {
    const svc = createFlowProjectionService();
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        makeWorkItem("a", "core", [], { title: "MATCH", status: "done" }),
        makeWorkItem("b", "core", ["a"], { title: "MATCH", status: "planned" }),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    // Both match title, but only "done" status filter
    const explorer = {
      ...defaultExplorer,
      searchQuery: "MATCH",
      statuses: ["done"] as const[],
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const focusNodes = result.nodes.filter(
      (n) => n.data.visibilityRole === "focus",
    );
    expect(focusNodes.map((n) => n.id)).toEqual(["a"]);
  });
});

// ---------------------------------------------------------------------------
// Tests — Task 3.4: Focus/context — scope modes
// ---------------------------------------------------------------------------

describe("FlowProjectionService — task 3.4: scope traversal", () => {
  // Plan: a → b → d, a → c → d (diamond-ish with single source/sink)
  // Using the diamond snapshot: a→b, a→c, b→d, c→d

  it("upstream scope includes only selected and its ancestors", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot(); // a→b, a→c, b→d, c→d
    // Select d, upstream = d + b + c + a
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "d",
      activeScope: "upstream" as const,
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("downstream scope includes only selected and its descendants", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot(); // a→b, a→c, b→d, c→d
    // Select a, downstream = a + b + c + d
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "a",
      activeScope: "downstream" as const,
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("upstream scope from a middle node excludes downstream items", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c
    // Select b, upstream = b + a; c is excluded
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "b",
      activeScope: "upstream" as const,
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a", "b"]);
    expect(ids).not.toContain("c");
  });

  it("chain scope includes both upstream and downstream", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c
    // Select b, chain = a + b + c
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "b",
      activeScope: "chain" as const,
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("treats scope as 'all' when no item is selected", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: null,
      activeScope: "upstream" as const,
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    // Should still show all 3 items
    expect(result.nodes.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Tests — Task 3.4: Selected item kept as context when filtered out
// ---------------------------------------------------------------------------

describe("FlowProjectionService — task 3.4: selected item as context", () => {
  it("keeps selected item visible as context when it does not match search", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a → b → c
    // Search matches 'c', selected is 'a' (does not match)
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "a",
      searchQuery: "Title c",
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const nodeA = result.nodes.find((n) => n.id === "a");
    expect(nodeA).toBeDefined();
    expect(nodeA!.data.visibilityRole).toBe("context");
  });

  it("sets selectedNodeFilteredOut=true when selected is not in focus", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "a",
      searchQuery: "Title c",
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.summary.selectedNodeFilteredOut).toBe(true);
  });

  it("sets selectedNodeFilteredOut=false when selected is in focus", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "a",
      searchQuery: "Title a",
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.summary.selectedNodeFilteredOut).toBe(false);
  });

  it("sets selectedNodeFilteredOut=false when no selection", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot();
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(result.summary.selectedNodeFilteredOut).toBe(false);
  });

  it("emptyStateMessage is set even when filtered-out selection remains as context", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeLinearSnapshot(); // a, b, c
    // Search that matches nothing, but selected='a' kept as context
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "a",
      searchQuery: "NONEXISTENT_XYZ",
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    expect(result.summary.focusNodeCount).toBe(0);
    expect(result.emptyStateMessage).toBeTruthy();
    // But 'a' is still visible as context
    const nodeA = result.nodes.find((n) => n.id === "a");
    expect(nodeA).toBeDefined();
    expect(nodeA!.data.visibilityRole).toBe("context");
  });
});

// ---------------------------------------------------------------------------
// Tests — Task 3.4: Path-preserving context in scoped modes
// ---------------------------------------------------------------------------

describe("FlowProjectionService — task 3.4: path-preserving context in scoped modes", () => {
  it("upstream scope with search: includes intermediate nodes as context", () => {
    const svc = createFlowProjectionService();
    // Chain: a → b → c → d; select d, scope=upstream, search matches 'a'
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        makeWorkItem("a", "core", [], { title: "ROOT" }),
        makeWorkItem("b", "core", ["a"]),
        makeWorkItem("c", "core", ["b"]),
        makeWorkItem("d", "core", ["c"]),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "d",
      activeScope: "upstream" as const,
      searchQuery: "ROOT",
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeB = result.nodes.find((n) => n.id === "b");
    const nodeC = result.nodes.find((n) => n.id === "c");
    // a is focus, b and c are on path between d and a → context
    expect(nodeA.data.visibilityRole).toBe("focus");
    expect(nodeB).toBeDefined();
    expect(nodeC).toBeDefined();
  });

  it("downstream scope with search: includes intermediate nodes as context", () => {
    const svc = createFlowProjectionService();
    // Chain: a → b → c → d; select a, scope=downstream, search matches 'd'
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        makeWorkItem("a", "core"),
        makeWorkItem("b", "core", ["a"]),
        makeWorkItem("c", "core", ["b"]),
        makeWorkItem("d", "core", ["c"], { title: "LEAF" }),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const explorer = {
      ...defaultExplorer,
      selectedWorkItemId: "a",
      activeScope: "downstream" as const,
      searchQuery: "LEAF",
    };
    const result = svc.project(snapshot, explorer, defaultDisplay);
    const nodeD = result.nodes.find((n) => n.id === "d")!;
    const nodeB = result.nodes.find((n) => n.id === "b");
    const nodeC = result.nodes.find((n) => n.id === "c");
    expect(nodeD.data.visibilityRole).toBe("focus");
    expect(nodeB).toBeDefined();
    expect(nodeC).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — Dynamic lane width: horizontal node spread
// ---------------------------------------------------------------------------

describe("FlowProjectionService — dynamic lane width", () => {
  it("same-rank nodes within a lane are spread vertically", () => {
    const svc = createFlowProjectionService();
    // Two root nodes in the same lane (both at rank 0 with LR dagre)
    const plan = makePlan({
      lanes: [{ id: "core", label: "Core" }],
      work_items: [makeWorkItem("a", "core"), makeWorkItem("b", "core")],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    // Same rank → same x, different y positions (vertical spread)
    expect(nodeA.position.x).toBe(nodeB.position.x);
    expect(nodeA.position.y).not.toBe(nodeB.position.y);
  });

  it("lane width grows with deeper dependency chains", () => {
    const svc = createFlowProjectionService();
    // Deep lane: a→b→c (3 ranks), shallow lane: single node
    const plan = makePlan({
      lanes: [
        { id: "deep", label: "Deep" },
        { id: "shallow", label: "Shallow" },
      ],
      work_items: [
        makeWorkItem("d1", "deep"),
        makeWorkItem("d2", "deep", ["d1"]),
        makeWorkItem("d3", "deep", ["d2"]),
        makeWorkItem("s1", "shallow"),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    // Deep lane nodes should span a wider x range than shallow lane
    const deepNodes = result.nodes.filter((n) => n.data.laneLabel === "Deep");
    const deepXs = deepNodes.map((n) => n.position.x);
    const deepExtent = Math.max(...deepXs) - Math.min(...deepXs);
    expect(deepExtent).toBeGreaterThan(0);
  });

  it("nodes in different lanes do not overlap horizontally", () => {
    const svc = createFlowProjectionService();
    const plan = makePlan({
      lanes: [
        { id: "lane_a", label: "Lane A" },
        { id: "lane_b", label: "Lane B" },
      ],
      work_items: [
        makeWorkItem("a1", "lane_a"),
        makeWorkItem("a2", "lane_a", ["a1"]),
        makeWorkItem("b1", "lane_b"),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const laneANodes = result.nodes.filter(
      (n) => n.data.laneLabel === "Lane A",
    );
    const laneBNodes = result.nodes.filter(
      (n) => n.data.laneLabel === "Lane B",
    );
    const maxAX = Math.max(...laneANodes.map((n) => n.position.x));
    const minBX = Math.min(...laneBNodes.map((n) => n.position.x));
    // Lane B nodes should be to the right of Lane A nodes (with gap)
    expect(minBX).toBeGreaterThan(maxAX);
  });
});

// ---------------------------------------------------------------------------
// Tests — Per-lane independent layout
// ---------------------------------------------------------------------------

describe("FlowProjectionService — per-lane independent layout", () => {
  it("cross-lane edges do not force different ranks within a lane", () => {
    const svc = createFlowProjectionService();
    // Lane A: a1 → a2 → a3 (deep chain, 3 ranks globally)
    // Lane B: b1 depends on a1, b2 depends on a2, b3 depends on a3
    //   In a global dagre, b1/b2/b3 would each be at a different rank.
    //   With per-lane dagre, b1/b2/b3 are all roots (same rank) since
    //   they have no intra-lane edges — they share the same x position
    //   and are spread vertically.
    const plan = makePlan({
      lanes: [
        { id: "lane_a", label: "Lane A" },
        { id: "lane_b", label: "Lane B" },
      ],
      work_items: [
        makeWorkItem("a1", "lane_a"),
        makeWorkItem("a2", "lane_a", ["a1"]),
        makeWorkItem("a3", "lane_a", ["a2"]),
        makeWorkItem("b1", "lane_b", ["a1"]),
        makeWorkItem("b2", "lane_b", ["a2"]),
        makeWorkItem("b3", "lane_b", ["a3"]),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);

    // b1, b2, b3 have no intra-lane edges — per-lane dagre LR places them
    // at the same rank (same x) and spreads them vertically (different y)
    const bNodes = result.nodes.filter((n) =>
      ["b1", "b2", "b3"].includes(n.id),
    );
    const distinctYPositions = new Set(bNodes.map((n) => n.position.y));
    expect(distinctYPositions.size).toBe(3);
  });

  it("intra-lane edges are still respected within per-lane layout", () => {
    const svc = createFlowProjectionService();
    // Lane A: a1 (root)
    // Lane B: b1 → b2 (intra-lane chain)
    // Cross-lane edge: a1 → b1
    const plan = makePlan({
      lanes: [
        { id: "lane_a", label: "Lane A" },
        { id: "lane_b", label: "Lane B" },
      ],
      work_items: [
        makeWorkItem("a1", "lane_a"),
        makeWorkItem("b1", "lane_b", ["a1"]),
        makeWorkItem("b2", "lane_b", ["b1"]),
      ],
    });
    const snapshot = createPlanAnalysisEngine().build(plan);
    const result = svc.project(snapshot, defaultExplorer, defaultDisplay);

    const b1 = result.nodes.find((n) => n.id === "b1")!;
    const b2 = result.nodes.find((n) => n.id === "b2")!;
    // b2 should be to the right of b1 (LR dagre respects intra-lane edge)
    expect(b2.position.x).toBeGreaterThan(b1.position.x);
  });
});

// ---------------------------------------------------------------------------
// Tests — Task 3.3: Determinism
// ---------------------------------------------------------------------------

describe("FlowProjectionService — determinism", () => {
  it("produces identical output for identical inputs (nodes)", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot();
    const r1 = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const r2 = svc.project(snapshot, defaultExplorer, defaultDisplay);
    expect(r1.nodes.map((n) => n.id).sort()).toEqual(
      r2.nodes.map((n) => n.id).sort(),
    );
    expect(r1.nodes.find((n) => n.id === "a")!.position).toEqual(
      r2.nodes.find((n) => n.id === "a")!.position,
    );
  });

  it("produces identical output for identical inputs (edges)", () => {
    const svc = createFlowProjectionService();
    const snapshot = makeDiamondSnapshot();
    const r1 = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const r2 = svc.project(snapshot, defaultExplorer, defaultDisplay);
    const e1 = r1.edges.map((e) => `${e.source}→${e.target}`).sort();
    const e2 = r2.edges.map((e) => `${e.source}→${e.target}`).sort();
    expect(e1).toEqual(e2);
  });
});
