import type {
  EstimateUnit,
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
// Numeric formatting
// ---------------------------------------------------------------------------

function formatNumeric(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function formatValue(value: number): string {
  return formatNumeric(value);
}

export function formatValueDensity(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

const COMPACT_UNIT_SUFFIX: Record<EstimateUnit, string> = {
  hours: "h",
  days: "d",
  points: "pt",
};

const UNIT_SINGULAR: Record<EstimateUnit, string> = {
  hours: "hour",
  days: "day",
  points: "point",
};

/** Compact unit suffix used after a numeric value, e.g. "d", "h", "pt". */
export function compactUnitSuffix(unit: EstimateUnit): string {
  return COMPACT_UNIT_SUFFIX[unit];
}

/** Compact value + unit suffix for an estimate or derived metric, e.g. "8d", "5pt". */
export function formatCompactUnitValue(
  value: number,
  unit: EstimateUnit,
): string {
  return `${formatNumeric(value)}${COMPACT_UNIT_SUFFIX[unit]}`;
}

/** Spelled-out value + unit, singularised at 1, e.g. "1 day", "5 points". */
export function formatUnitCount(value: number, unit: EstimateUnit): string {
  const word = value === 1 ? UNIT_SINGULAR[unit] : unit;
  return `${formatNumeric(value)} ${word}`;
}
