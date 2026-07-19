import {
  type TaskGardenStatus,
  TaskGardenStatusSchema,
} from "./task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Status presentation — single source of truth for how work-item statuses are
// labelled and ordered across the UI (mirrors the STATUS_COLORS
// centralization for status accent colors).
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<TaskGardenStatus, string> = {
  planned: "Planned",
  ready: "Ready",
  blocked: "Blocked",
  in_progress: "In Progress",
  done: "Done",
  future: "Future",
};

export function getStatusLabel(status: TaskGardenStatus): string {
  return STATUS_LABELS[status];
}

/** Every status in schema declaration order — for exhaustive listings (e.g. legends). */
export const ALL_STATUSES: readonly TaskGardenStatus[] =
  TaskGardenStatusSchema.options;

/** Completion-first rollup order used by progress summaries. */
export const STATUS_LIFECYCLE_ORDER = [
  "done",
  "in_progress",
  "ready",
  "planned",
  "blocked",
  "future",
] as const satisfies readonly TaskGardenStatus[];

/** Order status filter chips render in: the path a work item typically takes. */
export const STATUS_FILTER_ORDER = [
  "planned",
  "ready",
  "in_progress",
  "blocked",
  "done",
  "future",
] as const satisfies readonly TaskGardenStatus[];
