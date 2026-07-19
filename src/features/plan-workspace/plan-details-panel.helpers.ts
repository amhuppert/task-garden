import { compactUnitSuffix } from "../../lib/graph/metric-registry";
import { getStatusLabel } from "../../lib/plan/status-presentation";
import type { EstimateUnit } from "../../lib/plan/task-garden-plan.schema";

// Canonical definitions live in lib; re-exported for panel consumers.
export { compactUnitSuffix, getStatusLabel };

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

const UNIT_SINGULAR: Record<EstimateUnit, string> = {
  hours: "hour",
  days: "day",
  points: "point",
};

/** Compact value + unit suffix for an estimate or derived metric, e.g. "8d", "5pt". */
export function formatCompactUnitValue(
  value: number,
  unit: EstimateUnit,
): string {
  return `${formatNumeric(value)}${compactUnitSuffix(unit)}`;
}

/** Spelled-out value + unit, singularised at 1, e.g. "1 day", "5 points". */
export function formatUnitCount(value: number, unit: EstimateUnit): string {
  const word = value === 1 ? UNIT_SINGULAR[unit] : unit;
  return `${formatNumeric(value)} ${word}`;
}
