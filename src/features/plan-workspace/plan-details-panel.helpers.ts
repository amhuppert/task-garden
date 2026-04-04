import type {
  TaskGardenEstimate,
  TaskGardenPriority,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

export function getStatusLabel(status: TaskGardenStatus): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "ready":
      return "Ready";
    case "blocked":
      return "Blocked";
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    case "future":
      return "Future";
  }
}

// ---------------------------------------------------------------------------
// Priority labels
// ---------------------------------------------------------------------------

export function getPriorityLabel(priority: TaskGardenPriority): string {
  switch (priority) {
    case "p0":
      return "P0";
    case "p1":
      return "P1";
    case "p2":
      return "P2";
    case "p3":
      return "P3";
    case "nice_to_have":
      return "Nice to Have";
  }
}

// ---------------------------------------------------------------------------
// Estimate formatting
// ---------------------------------------------------------------------------

export function formatEstimate(estimate: {
  value: number;
  unit: string;
}): string {
  const { value, unit } = estimate;
  // Singular: strip trailing 's' from unit
  if (value === 1) {
    return `${value} ${unit.replace(/s$/, "")}`;
  }
  return `${value} ${unit}`;
}

function formatNumeric(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function formatCompactEstimate(
  estimate: TaskGardenEstimate | null | undefined,
): string | null {
  if (!estimate) return null;

  const value = formatNumeric(estimate.value);
  switch (estimate.unit) {
    case "days":
      return `${value}d`;
    case "hours":
      return `${value}h`;
    case "points":
      return `${value}pt`;
  }
}

export function formatDayCount(days: number): string {
  const value = formatNumeric(days);
  return `${value} ${days === 1 ? "day" : "days"}`;
}

export function formatCompactDayCount(days: number): string {
  return `${formatNumeric(days)}d`;
}
