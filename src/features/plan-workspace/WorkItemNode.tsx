import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { useContext } from "react";
import type { FlowNodeData } from "../../lib/graph/flow-projection-service";
import { formatCompactEstimate } from "./plan-details-panel.helpers";
import type { ColorEncodingMode, SizeEncodingMode } from "./plan-display.store";
import {
  selectColorMode,
  selectScheduleOverlay,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import {
  GraphMetricRangesContext,
  GraphScheduleOverlayContext,
} from "./plan-graph-canvas.context";
import {
  type MetricRanges,
  NODE_RENDER_HEIGHT,
  getCriticalPathAccentColor,
  getMetricAccentColor,
  getPriorityAccentColor,
  getSlackHeatColor,
  getStatusAccentColor,
  normalizeMetric,
} from "./plan-graph-canvas.helpers";

// ---------------------------------------------------------------------------
// Node type declaration
// ---------------------------------------------------------------------------

export type WorkItemNodeType = Node<FlowNodeData, "workItem">;

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<FlowNodeData["status"], string> = {
  planned: "Planned",
  ready: "Ready",
  blocked: "Blocked",
  in_progress: "In Progress",
  done: "Done",
  future: "Future",
};

const PRIORITY_LABELS: Record<FlowNodeData["priority"], string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
  nice_to_have: "NTH",
};

// ---------------------------------------------------------------------------
// Encoding helpers (pure)
// ---------------------------------------------------------------------------

function getAccentColor(
  colorMode: ColorEncodingMode,
  data: FlowNodeData,
  metricRanges: MetricRanges,
): string | null {
  switch (colorMode) {
    case "default":
      return null;
    case "status":
      return getStatusAccentColor(data.status);
    case "priority":
      return getPriorityAccentColor(data.priority);
    case "lane":
      return data.laneColor;
    case "estimate_days":
    case "remaining_days":
    case "downstream_effort_days":
    case "degree":
    case "betweenness":
    case "dependency_span": {
      const range = metricRanges[colorMode];
      if (!range) return null;
      const norm = normalizeMetric(
        data.metricSummary[colorMode],
        range.min,
        range.max,
      );
      return getMetricAccentColor(norm);
    }
    default:
      return null;
  }
}

function getSizeScale(
  sizeMode: SizeEncodingMode,
  data: FlowNodeData,
  metricRanges: MetricRanges,
): number {
  if (sizeMode === "uniform") return 1;
  const range = metricRanges[sizeMode];
  if (!range) return 1;
  const norm = normalizeMetric(
    data.metricSummary[sizeMode],
    range.min,
    range.max,
  );
  // Scale between 0.85 (smallest) and 1.15 (largest)
  return 0.85 + norm * 0.3;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkItemNode({ data }: NodeProps<WorkItemNodeType>) {
  const colorMode = usePlanDisplayStore(selectColorMode);
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const metricRanges = useContext(GraphMetricRangesContext);
  const { slackRange } = useContext(GraphScheduleOverlayContext);

  const isFocus = data.visibilityRole === "focus";
  const accentColor = getAccentColor(colorMode, data, metricRanges);
  const sizeScale = getSizeScale(sizeMode, data, metricRanges);

  const normalizedSizeMetric =
    sizeMode !== "uniform" && metricRanges[sizeMode]
      ? normalizeMetric(
          data.metricSummary[sizeMode],
          metricRanges[sizeMode].min,
          metricRanges[sizeMode].max,
        )
      : null;
  const compactEstimate = formatCompactEstimate(data.estimate);
  const hasDayEstimate = data.estimate?.unit === "days";
  const criticalPathAccent = getCriticalPathAccentColor();
  const slackNorm =
    hasDayEstimate && slackRange
      ? slackRange.min === slackRange.max
        ? 0.5
        : normalizeMetric(data.slackDays, slackRange.min, slackRange.max)
      : null;
  const slackColor = slackNorm === null ? null : getSlackHeatColor(slackNorm);
  const showCriticalPathOverlay =
    scheduleOverlay === "critical_path" && data.criticalPathOrder !== null;
  const showSlackHeatOverlay =
    scheduleOverlay === "slack_heatmap" &&
    hasDayEstimate &&
    slackColor !== null;
  const slackValue = Number.isInteger(data.slackDays)
    ? data.slackDays
    : data.slackDays.toFixed(1);
  const slackLabel = `${slackValue}d slack`;

  return (
    <div
      style={{
        width: 200,
        minHeight: NODE_RENDER_HEIGHT,
        opacity: isFocus ? 1 : 0.38,
        transform: `scale(${sizeScale})`,
        transformOrigin: "center center",
        transition: "opacity 220ms ease, transform 220ms ease",
        overflow: "hidden",
      }}
      className={`atlas-node relative overflow-hidden rounded-[1.4rem]${data.isSelected ? " atlas-node-selected" : ""}`}
    >
      {/* Invisible connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {showSlackHeatOverlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2px] rounded-[1.22rem]"
          style={{
            border: `1px solid color-mix(in oklab, ${slackColor} 26%, transparent)`,
            background: `radial-gradient(circle at 100% 0%, color-mix(in oklab, ${slackColor} 18%, transparent), transparent 54%), linear-gradient(90deg, color-mix(in oklab, ${slackColor} 14%, transparent), transparent 34%)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${slackColor} 10%, transparent), 0 18px 34px color-mix(in oklab, ${slackColor} 7%, transparent)`,
          }}
        />
      )}

      {showCriticalPathOverlay && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] rounded-[1.22rem]"
            style={{
              border: `1px solid color-mix(in oklab, ${criticalPathAccent} 34%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${criticalPathAccent} 14%, transparent), 0 18px 34px color-mix(in oklab, ${criticalPathAccent} 10%, transparent)`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-5 right-5 top-2.5 h-px rounded-full"
            style={{
              background: `linear-gradient(90deg, color-mix(in oklab, ${criticalPathAccent} 0%, transparent), ${criticalPathAccent}, color-mix(in oklab, ${criticalPathAccent} 0%, transparent))`,
            }}
          />
        </>
      )}

      {/* Left accent stripe for color encoding */}
      {accentColor && (
        <div
          aria-hidden="true"
          style={{ backgroundColor: accentColor }}
          className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full"
        />
      )}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted-foreground">
            {data.laneLabel}
          </p>
          <div
            className="mt-1 line-clamp-2 text-[0.72rem] font-semibold leading-snug text-foreground"
            title={data.title}
          >
            {data.title}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {showCriticalPathOverlay && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border bg-surface px-1.5 font-mono text-[0.55rem] font-semibold leading-none text-foreground"
              style={{
                borderColor: `color-mix(in oklab, ${criticalPathAccent} 44%, transparent)`,
                boxShadow: `0 10px 20px color-mix(in oklab, ${criticalPathAccent} 10%, transparent)`,
              }}
              title={`Critical path step ${data.criticalPathOrder! + 1}`}
            >
              {data.criticalPathOrder! + 1}
            </span>
          )}
          {compactEstimate && (
            <span className="atlas-microchip text-foreground">
              {compactEstimate}
            </span>
          )}
          <span
            style={{ backgroundColor: getPriorityAccentColor(data.priority) }}
            className="inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[0.55rem] font-bold leading-none text-primary-foreground"
          >
            {PRIORITY_LABELS[data.priority]}
          </span>
        </div>
      </div>

      {/* Footer: status, critical-path note, remaining days */}
      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <span
          aria-label={STATUS_LABELS[data.status]}
          style={{ backgroundColor: getStatusAccentColor(data.status) }}
          className="h-1.5 w-1.5 shrink-0 rounded-full"
        />
        <span className="truncate font-sans text-[0.6rem] text-muted-foreground">
          {STATUS_LABELS[data.status]}
        </span>
        {showSlackHeatOverlay && slackColor && (
          <span
            className="atlas-microchip"
            style={{
              borderColor: `color-mix(in oklab, ${slackColor} 42%, transparent)`,
              color: slackColor,
            }}
            title={`Slack: ${slackValue}d buffer`}
          >
            {slackLabel}
          </span>
        )}
        {data.isOnCriticalPath && !showCriticalPathOverlay && (
          <span
            className="atlas-microchip"
            style={{
              borderColor:
                "color-mix(in oklab, var(--color-pollen) 44%, transparent)",
              color: "var(--color-pollen)",
            }}
          >
            Critical
          </span>
        )}
        {data.metricSummary.remaining_days > 0 && (
          <span className="ml-auto shrink-0 font-mono text-[0.58rem] text-muted-foreground">
            {Number.isInteger(data.metricSummary.remaining_days)
              ? data.metricSummary.remaining_days
              : data.metricSummary.remaining_days.toFixed(1)}
            d chain
          </span>
        )}
      </div>

      {/* Metric bar for size encoding (absolute, no layout impact) */}
      {normalizedSizeMetric !== null && (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-4 right-4 h-[2px] overflow-hidden rounded-full bg-border"
        >
          <div
            style={{
              width: `${normalizedSizeMetric * 100}%`,
              backgroundColor: "var(--color-moss)",
            }}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}
