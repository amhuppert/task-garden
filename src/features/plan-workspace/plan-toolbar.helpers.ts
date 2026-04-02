import type { ColorEncodingMode, SizeEncodingMode } from "./plan-display.store";
import type { GraphScope } from "./plan-explorer.store";

// ---------------------------------------------------------------------------
// Scope labels
// ---------------------------------------------------------------------------

const SCOPE_LABELS: Record<GraphScope, string> = {
  all: "All items",
  upstream: "Upstream",
  downstream: "Downstream",
  chain: "Full chain",
};

export function getScopeLabel(scope: GraphScope): string {
  return SCOPE_LABELS[scope];
}

// ---------------------------------------------------------------------------
// Encoding labels
// ---------------------------------------------------------------------------

const COLOR_MODE_LABELS: Record<ColorEncodingMode, string> = {
  default: "Default",
  lane: "By Lane",
  status: "By Status",
  priority: "By Priority",
  degree: "By Degree",
  betweenness: "By Betweenness",
  dependency_span: "By Dependency Span",
};

export function getColorModeLabel(mode: ColorEncodingMode): string {
  return COLOR_MODE_LABELS[mode];
}

const SIZE_MODE_LABELS: Record<SizeEncodingMode, string> = {
  uniform: "Uniform",
  degree: "By Degree",
  betweenness: "By Betweenness",
  dependency_span: "By Dependency Span",
};

export function getSizeModeLabel(mode: SizeEncodingMode): string {
  return SIZE_MODE_LABELS[mode];
}

// ---------------------------------------------------------------------------
// Option arrays (re-exported for component use)
// ---------------------------------------------------------------------------

export const SCOPE_OPTIONS: readonly GraphScope[] = [
  "all",
  "upstream",
  "downstream",
  "chain",
];

export const COLOR_MODE_OPTIONS: readonly ColorEncodingMode[] = [
  "default",
  "lane",
  "status",
  "priority",
  "degree",
  "betweenness",
  "dependency_span",
];

export const SIZE_MODE_OPTIONS: readonly SizeEncodingMode[] = [
  "uniform",
  "degree",
  "betweenness",
  "dependency_span",
];

// ---------------------------------------------------------------------------
// Metric descriptions (plain-language, no graph-theory jargon)
// ---------------------------------------------------------------------------

/** Non-uniform size modes that correspond to actual metrics. */
export type MetricSizeMode = Exclude<SizeEncodingMode, "uniform">;

export const METRIC_SIZE_DESCRIPTIONS: Record<
  MetricSizeMode,
  { summary: string; calculation: string }
> = {
  degree: {
    summary:
      "Highlights tasks that are at the center of a lot of activity. Useful for spotting coordination-heavy work that may need extra attention or earlier scheduling.",
    calculation:
      "Count the lines going into and out of a task. A task that depends on 2 others and is depended on by 3 has a degree of 5.",
  },
  betweenness: {
    summary:
      "Highlights bottleneck tasks that connect otherwise separate parts of the plan. If a high-betweenness task slips, many unrelated chains of work may be affected.",
    calculation:
      "For every pair of tasks in the plan, find the shortest dependency path between them. The more of those paths that pass through a given task, the higher its score.",
  },
  dependency_span: {
    summary:
      "Highlights tasks that gate long chains of sequential follow-up work. High-span tasks should be started early because everything below them has to wait.",
    calculation:
      "From a task, follow the dependency arrows downward and count how many layers of work sit below it before you reach a task with nothing after it.",
  },
};
