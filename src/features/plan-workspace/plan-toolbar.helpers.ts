import type {
  ColorEncodingMode,
  ScheduleOverlayMode,
  SizeEncodingMode,
} from "./plan-display.store";
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
  estimate_days: "By Estimate",
  remaining_days: "By Remaining Chain",
  downstream_effort_days: "By Unlocked Effort",
  degree: "By Degree",
  betweenness: "By Betweenness",
  dependency_span: "By Dependency Span",
};

export function getColorModeLabel(mode: ColorEncodingMode): string {
  return COLOR_MODE_LABELS[mode];
}

export const COLOR_MODE_DESCRIPTIONS: Record<
  ColorEncodingMode,
  { summary: string; calculation: string }
> = {
  default: {
    summary: "Keeps the graph neutral so shape and labels do most of the work.",
    calculation:
      "No plan metric is used. Every node starts from the same base style.",
  },
  lane: {
    summary:
      "Shows which authored lane each task belongs to. Useful for spotting work by stream or area.",
    calculation:
      "Use the lane saved on each task and assign that lane its color.",
  },
  status: {
    summary:
      "Shows current task state. Useful for separating blocked, ready, active, and done work at a glance.",
    calculation:
      "Use the authored status on each task and assign the matching status color.",
  },
  priority: {
    summary:
      "Shows urgency. Useful for seeing where the highest-priority work sits in the graph.",
    calculation:
      "Use the authored priority on each task and assign the matching priority color.",
  },
  estimate_days: {
    summary:
      "Shows the size of each individual task. Useful for spotting the biggest estimated items.",
    calculation:
      "Use the authored day estimate on each task. Higher day counts get stronger color.",
  },
  remaining_days: {
    summary:
      "Shows how much estimated sequential work still sits below a task. Useful for finding long runways to completion.",
    calculation:
      "From each task, follow dependencies to the furthest leaf and add the day estimates along the longest path.",
  },
  downstream_effort_days: {
    summary:
      "Shows how much estimated work a task unlocks. Useful for finding tasks that release a lot of follow-on work.",
    calculation:
      "Collect every unique dependent reachable below the task and add their day estimates.",
  },
  degree: {
    summary:
      "Shows how many direct connections a task has. Useful for spotting coordination-heavy work.",
    calculation:
      "Add the number of direct dependencies and direct dependents for each task.",
  },
  betweenness: {
    summary:
      "Shows tasks that act like bridges between different parts of the plan. Useful for spotting likely bottlenecks.",
    calculation:
      "Find many shortest dependency routes between tasks and count how often each task sits on those routes.",
  },
  dependency_span: {
    summary:
      "Shows how deep the follow-on work goes below a task. Useful for finding items that start long chains.",
    calculation:
      "Count how many dependency levels sit below each task before the work reaches an endpoint.",
  },
};

export function getColorModeDescription(mode: ColorEncodingMode): {
  summary: string;
  calculation: string;
} {
  return COLOR_MODE_DESCRIPTIONS[mode];
}

const SIZE_MODE_LABELS: Record<SizeEncodingMode, string> = {
  uniform: "Uniform",
  estimate_days: "By Estimate",
  remaining_days: "By Remaining Chain",
  downstream_effort_days: "By Unlocked Effort",
  degree: "By Degree",
  betweenness: "By Betweenness",
  dependency_span: "By Dependency Span",
};

export function getSizeModeLabel(mode: SizeEncodingMode): string {
  return SIZE_MODE_LABELS[mode];
}

const SCHEDULE_OVERLAY_LABELS: Record<ScheduleOverlayMode, string> = {
  none: "Off",
  critical_path: "Critical Path",
  slack_heatmap: "Slack Heatmap",
};

export function getScheduleOverlayLabel(mode: ScheduleOverlayMode): string {
  return SCHEDULE_OVERLAY_LABELS[mode];
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
  "estimate_days",
  "remaining_days",
  "downstream_effort_days",
  "degree",
  "betweenness",
  "dependency_span",
];

export const SIZE_MODE_OPTIONS: readonly SizeEncodingMode[] = [
  "uniform",
  "estimate_days",
  "remaining_days",
  "downstream_effort_days",
  "degree",
  "betweenness",
  "dependency_span",
];

export const SCHEDULE_OVERLAY_OPTIONS: readonly ScheduleOverlayMode[] = [
  "none",
  "critical_path",
  "slack_heatmap",
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
  estimate_days: {
    summary:
      "Highlights the largest individual tasks. Useful when you want the graph to communicate task size rather than just topology.",
    calculation:
      "Use the authored day estimate directly. A task estimated at 3 days is larger than a task estimated at 1 day.",
  },
  remaining_days: {
    summary:
      "Highlights tasks that still sit above a long estimated delivery runway. High values indicate work that anchors a long sequential chain to completion.",
    calculation:
      "Starting from a task, follow the dependency graph toward the furthest leaf and add up the day estimates along the longest chain, including the current task.",
  },
  downstream_effort_days: {
    summary:
      "Highlights tasks that unlock a large amount of downstream effort. High values indicate that a lot of estimated work sits behind that task.",
    calculation:
      "Collect the task and every unique dependent reachable below it, then sum their authored day estimates.",
  },
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

export const SCHEDULE_OVERLAY_DESCRIPTIONS: Record<
  ScheduleOverlayMode,
  { summary: string; calculation: string }
> = {
  none: {
    summary:
      "Keeps the graph in its normal specimen view with no extra schedule layer.",
    calculation:
      "No schedule overlay is applied on top of the current color and size encodings.",
  },
  critical_path: {
    summary:
      "Traces the route that most strongly sets the minimum delivery time. Useful for spotting the sequence where slips matter most.",
    calculation:
      "Follow dependency routes, add the day estimates along each route, and highlight the route with the largest total. Only estimated items can be part of it.",
  },
  slack_heatmap: {
    summary:
      "Shows how much schedule buffer each estimated item has. Useful for seeing which tasks can slip a little and which cannot.",
    calculation:
      "For each estimated item, compare the earliest finish and latest safe finish. The gap is slack. Low slack is warm, higher slack is cooler.",
  },
};
