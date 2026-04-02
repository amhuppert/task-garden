import type { FlowNode } from "../../lib/graph/flow-projection-service";
import type {
  TaskGardenPriority,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Layout constants — must match FlowProjectionService values
// ---------------------------------------------------------------------------

export const NODE_RENDER_WIDTH = 200;
export const NODE_RENDER_HEIGHT = 80;
export const LANE_BAND_PADDING = 24;
/** Minimum height for a lane band row; ensures bands are visible even for sparse lanes. */
export const LANE_BAND_HEIGHT = 120;

// ---------------------------------------------------------------------------
// Lane band geometry
// ---------------------------------------------------------------------------

export interface LaneBandData {
  laneLabel: string;
  /** Plan-authored lane color, or null. Applied subtly to the band background. */
  laneColor: string | null;
  x: number;
  minY: number;
  height: number;
  width: number;
}

/**
 * Derives lane band rectangles from visible nodes.
 * In TB layout, lanes are vertical columns: each band has its own X position
 * and all bands share the same Y extent (global min/max across all lanes).
 * Band width is computed dynamically from the horizontal spread of nodes
 * within each lane.
 */
export function computeLaneBands(nodes: readonly FlowNode[]): LaneBandData[] {
  // Group nodes by lane, collecting all X and Y positions
  const laneMap = new Map<
    string,
    { xs: number[]; ys: number[]; color: string | null }
  >();

  for (const node of nodes) {
    const { laneLabel, laneColor } = node.data;
    const existing = laneMap.get(laneLabel);
    if (existing) {
      existing.xs.push(node.position.x);
      existing.ys.push(node.position.y);
    } else {
      laneMap.set(laneLabel, {
        xs: [node.position.x],
        ys: [node.position.y],
        color: laneColor,
      });
    }
  }

  if (laneMap.size === 0) return [];

  // Compute global Y extent across ALL lanes for uniform band height
  let globalMinY = Number.POSITIVE_INFINITY;
  let globalMaxY = Number.NEGATIVE_INFINITY;
  for (const { ys } of laneMap.values()) {
    for (const y of ys) {
      globalMinY = Math.min(globalMinY, y);
      globalMaxY = Math.max(globalMaxY, y);
    }
  }

  // All bands share the same Y start and height (tops aligned, same height)
  const bandMinY = globalMinY - LANE_BAND_PADDING * 2;
  const bandHeight = Math.max(
    LANE_BAND_HEIGHT,
    globalMaxY - globalMinY + NODE_RENDER_HEIGHT + LANE_BAND_PADDING * 4,
  );

  // Each lane gets a vertical column band; width is dynamic based on node spread
  const bands: LaneBandData[] = [];
  for (const [laneLabel, { xs, color }] of laneMap.entries()) {
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    bands.push({
      laneLabel,
      laneColor: color,
      x: minX - LANE_BAND_PADDING,
      minY: bandMinY,
      height: bandHeight,
      width: maxX - minX + NODE_RENDER_WIDTH + LANE_BAND_PADDING * 2,
    });
  }
  return bands;
}

// ---------------------------------------------------------------------------
// Metric helpers
// ---------------------------------------------------------------------------

export interface MetricRanges {
  [key: string]: { min: number; max: number };
}

/** Normalizes a metric value to [0, 1]. Returns 0 when range is degenerate. */
export function normalizeMetric(
  value: number,
  min: number,
  max: number,
): number {
  if (min === max) return 0;
  return (value - min) / (max - min);
}

/** Derives min/max ranges for all metrics across visible nodes. */
export function computeMetricRanges(nodes: readonly FlowNode[]): MetricRanges {
  const ranges: MetricRanges = {};
  for (const node of nodes) {
    for (const [key, value] of Object.entries(node.data.metricSummary)) {
      if (!(key in ranges)) {
        ranges[key] = { min: value, max: value };
      } else {
        ranges[key].min = Math.min(ranges[key].min, value);
        ranges[key].max = Math.max(ranges[key].max, value);
      }
    }
  }
  return ranges;
}

// ---------------------------------------------------------------------------
// Color encoding helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<TaskGardenStatus, string> = {
  planned: "var(--color-status-planned)",
  ready: "var(--color-status-ready)",
  blocked: "var(--color-status-blocked)",
  in_progress: "var(--color-status-in-progress)",
  done: "var(--color-status-done)",
  future: "var(--color-status-future)",
};

export function getStatusAccentColor(status: TaskGardenStatus): string {
  return STATUS_COLORS[status];
}

const PRIORITY_COLORS: Record<TaskGardenPriority, string> = {
  p0: "var(--color-petal)",
  p1: "var(--color-pollen)",
  p2: "var(--color-moss)",
  p3: "var(--color-water)",
  nice_to_have: "var(--color-iron)",
};

export function getPriorityAccentColor(priority: TaskGardenPriority): string {
  return PRIORITY_COLORS[priority];
}

/** Cycling palette of botanical tones for lane color encoding. */
const LANE_COLOR_PALETTE = [
  "var(--color-water)",
  "var(--color-moss)",
  "var(--color-pollen)",
  "var(--color-petal)",
  "var(--color-lichen)",
  "var(--color-sage)",
  "var(--color-bark)",
  "var(--color-iron)",
];

/** Returns a palette color for a lane by its index in the lane order. */
export function getLanePaletteColor(laneIndex: number): string {
  return LANE_COLOR_PALETTE[laneIndex % LANE_COLOR_PALETTE.length];
}

/** Maps a normalized metric value [0,1] to a botanical accent color. */
export function getMetricAccentColor(normalizedValue: number): string {
  if (normalizedValue < 0.33) return "var(--color-water)";
  if (normalizedValue < 0.66) return "var(--color-pollen)";
  return "var(--color-moss)";
}

/**
 * Resolves the CSS color for a legend item dot based on the active encoding mode.
 * Returns null for items where no specific color applies (e.g., 'default' mode).
 */
export function resolveLegendItemColor(
  legendTitle: string,
  item: { key: string; label: string; value: string },
): string | null {
  switch (legendTitle) {
    case "Status":
      return STATUS_COLORS[item.key as TaskGardenStatus] ?? null;
    case "Priority":
      return PRIORITY_COLORS[item.key as TaskGardenPriority] ?? null;
    case "Lane": {
      // value is always a resolved CSS color (plan-authored or palette-based)
      return item.value;
    }
    default: {
      // Metric modes: low end and high end of the gradient
      if (item.key === "low") return getMetricAccentColor(0);
      if (item.key === "high") return getMetricAccentColor(1);
      return null;
    }
  }
}
