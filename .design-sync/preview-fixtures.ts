// Shared, realistic Task Garden data for design-sync previews. Imported by the
// panel/node preview .tsx files in ./previews/ so each card renders against the
// same plausible plan instead of duplicating a large object. Not a component —
// the converter's preview discovery only binds <ComponentName>.tsx, so this
// sibling module is ignored by discovery and resolved only as an import.

import type { PlanDisplayStateValue } from "../src/features/plan-workspace/plan-display.store";
import type { PlanExplorerStateValue } from "../src/features/plan-workspace/plan-explorer.store";
import type { FlowNodeData } from "../src/lib/graph/flow-projection-service";
import {
  type EstimateSummary,
  createPlanAnalysisEngine,
} from "../src/lib/graph/plan-analysis-engine";
import type { ReferenceClassification } from "../src/lib/plan/reference-resolver";
import type { TaskGardenPlan } from "../src/lib/plan/task-garden-plan.schema";

type ClassifyResult =
  | { ok: true; value: ReferenceClassification }
  | { ok: false; error: { message: string } };

export const extUrl = (label: string, href: string): ClassifyResult => ({
  ok: true,
  value: { kind: "external_url", label, href },
});

export const docPath = (
  label: string,
  documentPath: string,
): ClassifyResult => ({
  ok: true,
  value: { kind: "document_path", label, documentPath },
});

export const brokenRef = (message: string): ClassifyResult => ({
  ok: false,
  error: { message },
});

/** A small but complete plan: parchment-and-moss software project, mixed statuses. */
export const samplePlan: TaskGardenPlan = {
  version: 1,
  plan_id: "task-garden",
  title: "Task Garden — Dependency Graph",
  last_updated: "2026-06-24",
  summary:
    "A single-user planning tool that loads YAML project plans, validates them as DAGs, and renders an interactive dependency graph in a parchment-and-moss botanical style.",
  estimate_unit: "days",
  references: [
    { label: "Design System", href: "memory-bank/botanical-systems-atlas.md" },
    { label: "GitHub Repo", href: "https://github.com/org/task-garden" },
    { label: "Spec", href: "https://example.com/specs/task-garden" },
  ],
  lanes: [
    {
      id: "foundation",
      label: "Foundation",
      color: "#7c9473",
      description: "Schema, parsing, and DAG validation.",
    },
    {
      id: "graph",
      label: "Graph",
      color: "#c2a35a",
      description: "Layout, projection, and the interactive canvas.",
    },
    {
      id: "editing",
      label: "Editing",
      color: "#b06a52",
      description: "Inline write-through edits to the plan YAML.",
    },
    { id: "polish", label: "Polish" },
  ],
  work_items: [
    {
      id: "plan-schema",
      title: "Plan schema & DAG validation",
      summary: "Zod schema for plans; reject cycles and dangling dependencies.",
      lane: "foundation",
      status: "done",
      value: 90,
      estimate: 3,
      depends_on: [],
      tags: ["core", "schema"],
      deliverables: ["task-garden-plan.schema.ts", "DAG validator"],
      reuse_candidates: [],
      links: [
        { label: "Schema", href: "schemas/task-garden-plan.schema.json" },
      ],
    },
    {
      id: "flow-projection",
      title: "Flow projection service",
      summary: "Project the validated plan into React Flow nodes and edges.",
      lane: "graph",
      status: "done",
      value: 80,
      estimate: 4,
      depends_on: ["plan-schema"],
      tags: ["graph"],
      deliverables: ["flow-projection-service.ts"],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "graph-canvas",
      title: "Interactive graph canvas",
      summary:
        "Pan/zoom canvas with lane bands, focus mode, and metric encodings.",
      lane: "graph",
      status: "in_progress",
      value: 100,
      estimate: 6,
      depends_on: ["flow-projection"],
      tags: ["graph", "canvas"],
      deliverables: ["PlanGraphCanvas.tsx", "WorkItemNode.tsx"],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "inline-editing",
      title: "Inline write-through editing",
      summary:
        "Edit titles, status, estimates, and links straight into the YAML.",
      lane: "editing",
      status: "blocked",
      value: 75,
      estimate: 5,
      depends_on: ["graph-canvas"],
      tags: ["editing"],
      deliverables: ["editing/*.tsx", "edit-api-client.ts"],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "estimate-overlays",
      title: "Estimate & schedule overlays",
      summary: "Critical-path and slack-heatmap overlays driven by estimates.",
      lane: "graph",
      status: "ready",
      value: 60,
      estimate: 3,
      depends_on: ["graph-canvas"],
      tags: ["graph", "schedule"],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "polish-pass",
      title: "Visual polish pass",
      summary: "Tighten spacing, motion, and the botanical accent palette.",
      lane: "polish",
      status: "planned",
      value: 40,
      depends_on: ["inline-editing", "estimate-overlays"],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
};

export const estimateSummary: EstimateSummary = {
  totalWorkItemCount: 6,
  estimatedItemCount: 5,
  totalEstimatedDays: 21,
  averageEstimatedDays: 4.2,
  criticalItemCount: 3,
  parallelismRatio: 1.4,
  estimatedCriticalPath: {
    workItemIds: ["plan-schema", "flow-projection", "graph-canvas"],
    totalDays: 13,
    label: "estimated_critical_path",
  },
};

/** The full analysis snapshot, built by the real engine from samplePlan — drives the
 *  insight/details panels and dependency editor without hand-authoring the derived shape. */
export const snapshot = createPlanAnalysisEngine().build(samplePlan);

/** Default display-store state (encodings + insight mode). */
export const displayState: PlanDisplayStateValue = {
  colorMode: "default",
  sizeMode: "uniform",
  insightMode: "overview",
  scheduleOverlay: "none",
};

/** Explorer-store state with no active selection/filters. */
export const explorerStateAll: PlanExplorerStateValue = {
  selectedWorkItemId: null,
  searchQuery: "",
  activeScope: "all",
  laneIds: [],
  statuses: [],
  tags: [],
};

/** Explorer-store state with a work item selected (for the details panel). */
export const explorerStateSelected: PlanExplorerStateValue = {
  ...explorerStateAll,
  selectedWorkItemId: "graph-canvas",
};

/** A FlowNodeData for the React Flow node previews (WorkItemNode / MetricBubbleNode). */
export const nodeData = (
  overrides: Partial<FlowNodeData> = {},
): FlowNodeData => ({
  id: "graph-canvas",
  title: "Interactive graph canvas",
  laneLabel: "Graph",
  laneColor: "#c2a35a",
  status: "in_progress",
  value: 100,
  summary: "Pan/zoom canvas with lane bands and metric encodings.",
  estimate: 6,
  estimateUnit: "days",
  isOnCriticalPath: true,
  criticalPathOrder: 2,
  slackDays: 1.5,
  metricSummary: {
    value: 100,
    value_per_effort: 16.7,
    estimate_days: 6,
    remaining_days: 9,
    downstream_effort_days: 8,
    degree: 3,
    betweenness: 0.42,
    dependency_span: 2,
  },
  isSelected: false,
  visibilityRole: "focus",
  ...overrides,
});
