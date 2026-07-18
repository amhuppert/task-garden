import { type EdgeMarker, MarkerType } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { FlowNode } from "../../lib/graph/flow-projection-service";
import type { TaskGardenStatus } from "../../lib/plan/task-garden-plan.schema";
import type {
  ColorEncodingMode,
  ScheduleOverlayMode,
} from "./plan-display.store";

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
// Ghost lane-add geometry
// ---------------------------------------------------------------------------

export interface GhostLaneAddRect {
  laneLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GhostLaneAddOptions {
  width?: number;
  height?: number;
  gap?: number;
}

/**
 * Computes the ghost "+ Add to lane" rectangle for a single lane, positioned
 * directly beneath the lane's own deepest visible work item — never the
 * shared/global band bottom — so it cannot overlap the last node in the
 * deepest lane.
 */
export function computeGhostLaneAddRect(
  laneLabel: string,
  nodes: readonly FlowNode[],
  options: GhostLaneAddOptions = {},
): GhostLaneAddRect | null {
  const { width = 180, height = 56, gap = 12 } = options;
  const laneNodes = nodes.filter((n) => n.data.laneLabel === laneLabel);
  if (laneNodes.length === 0) return null;

  let laneMaxY = Number.NEGATIVE_INFINITY;
  let centerXSum = 0;
  for (const node of laneNodes) {
    if (node.position.y > laneMaxY) laneMaxY = node.position.y;
    centerXSum += node.position.x + NODE_RENDER_WIDTH / 2;
  }
  const centerX = centerXSum / laneNodes.length;
  const x = centerX - width / 2;
  const y = laneMaxY + NODE_RENDER_HEIGHT + gap;
  return { laneLabel, x, y, width, height };
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

/** Maps a normalized metric value [0,1] to a severity accent color (green → yellow → red). */
export function getMetricAccentColor(normalizedValue: number): string {
  if (normalizedValue < 0.33) return "var(--color-moss)";
  if (normalizedValue < 0.66) return "var(--color-pollen)";
  return "var(--color-petal)";
}

/**
 * Metric color modes where a *higher* value is desirable. The base gradient runs
 * green → yellow → red as the normalized value rises (the right direction for
 * cost/severity metrics like effort or chain length). For these "benefit" modes
 * we invert the input so green means high value / high value-per-effort.
 */
const HIGHER_IS_BETTER_COLOR_MODES = new Set<ColorEncodingMode>([
  "value",
  "value_per_effort",
]);

/**
 * Maps a normalized metric value [0,1] to an accent color, orienting the
 * gradient so that "good" is always green for the given color mode.
 */
export function getMetricAccentColorForMode(
  colorMode: ColorEncodingMode,
  normalizedValue: number,
): string {
  const oriented = HIGHER_IS_BETTER_COLOR_MODES.has(colorMode)
    ? 1 - normalizedValue
    : normalizedValue;
  return getMetricAccentColor(oriented);
}

export function getCriticalPathAccentColor(): string {
  return "var(--color-petal)";
}

export function getSlackHeatColor(normalizedValue: number): string {
  if (normalizedValue < 0.34) {
    return "color-mix(in oklab, var(--color-petal) 78%, var(--color-pollen) 22%)";
  }
  if (normalizedValue < 0.67) {
    return "color-mix(in oklab, var(--color-pollen) 78%, var(--color-lichen) 22%)";
  }
  return "color-mix(in oklab, var(--color-water) 72%, var(--color-lichen) 28%)";
}

// ---------------------------------------------------------------------------
// Edge style factory (memoized by key tuple)
// ---------------------------------------------------------------------------

export interface EdgeStyleKey {
  scheduleOverlay: ScheduleOverlayMode;
  isHighlighted: boolean;
  isContextEdge: boolean;
  isOnCriticalPath: boolean;
}

export interface EdgeStylePieces {
  style: CSSProperties;
  markerEnd: EdgeMarker;
  className: string | undefined;
}

/**
 * Builds a memoized factory that maps the small key-space of edge style inputs
 * onto a single shared `style` + `markerEnd` object per combination. Reusing
 * references across edges and across renders lets React Flow's diff skip work
 * on edges whose visual state hasn't changed.
 */
export function createEdgeStyleFactory(): (
  key: EdgeStyleKey,
) => EdgeStylePieces {
  const cache = new Map<string, EdgeStylePieces>();
  const criticalPathAccent = getCriticalPathAccentColor();

  return ({
    scheduleOverlay,
    isHighlighted,
    isContextEdge,
    isOnCriticalPath,
  }) => {
    const cacheKey = `${scheduleOverlay}|${isHighlighted ? 1 : 0}|${isContextEdge ? 1 : 0}|${isOnCriticalPath ? 1 : 0}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const shouldEmphasizeCriticalPath =
      scheduleOverlay === "critical_path" && isOnCriticalPath;
    const strokeColor = shouldEmphasizeCriticalPath
      ? criticalPathAccent
      : isHighlighted
        ? "var(--color-edge-strong)"
        : "var(--color-edge)";
    const strokeWidth = shouldEmphasizeCriticalPath
      ? 3.2
      : isHighlighted
        ? 2
        : 1;
    const opacity =
      scheduleOverlay === "critical_path"
        ? shouldEmphasizeCriticalPath
          ? 0.98
          : isContextEdge
            ? 0.08
            : isHighlighted
              ? 0.28
              : 0.16
        : isContextEdge
          ? 0.38
          : 1;

    const pieces: EdgeStylePieces = {
      style: {
        stroke: strokeColor,
        strokeWidth,
        opacity,
        filter: shouldEmphasizeCriticalPath
          ? `drop-shadow(0 0 10px color-mix(in oklab, ${criticalPathAccent} 18%, transparent))`
          : undefined,
        transition:
          "opacity 220ms ease, stroke-width 120ms ease, filter 220ms ease",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: shouldEmphasizeCriticalPath ? 12 : 10,
        height: shouldEmphasizeCriticalPath ? 12 : 10,
      },
      className: shouldEmphasizeCriticalPath ? "critical-path-edge" : undefined,
    };
    cache.set(cacheKey, pieces);
    return pieces;
  };
}

/**
 * Resolves the CSS color for a legend item dot based on the active color mode.
 * Returns null for items where no specific color applies (e.g., 'default' mode).
 */
export function resolveLegendItemColor(
  colorMode: ColorEncodingMode,
  item: { key: string; label: string; value: string },
): string | null {
  switch (colorMode) {
    case "status":
      return STATUS_COLORS[item.key as TaskGardenStatus] ?? null;
    case "lane":
      // value is always a resolved CSS color (plan-authored or palette-based)
      return item.value;
    case "default":
      return null;
    default: {
      // Metric modes: low and high ends of the mode-oriented gradient.
      if (item.key === "low") return getMetricAccentColorForMode(colorMode, 0);
      if (item.key === "high") return getMetricAccentColorForMode(colorMode, 1);
      return null;
    }
  }
}
