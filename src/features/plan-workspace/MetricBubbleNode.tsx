import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { useContext, useState } from "react";
import type { FlowNodeData } from "../../lib/graph/flow-projection-service";
import { formatCompactEstimate } from "./plan-details-panel.helpers";
import type { ColorEncodingMode } from "./plan-display.store";
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

export type MetricBubbleNodeType = Node<FlowNodeData, "metricBubble">;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_BUBBLE_SIZE = 28;
const MAX_BUBBLE_SIZE = 72;

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

const METRIC_LABELS: Record<string, string> = {
  estimate_days: "Estimate",
  remaining_days: "Remaining Chain",
  downstream_effort_days: "Unlocked Effort",
  degree: "Degree",
  betweenness: "Betweenness",
  dependency_span: "Dependency Span",
};

// ---------------------------------------------------------------------------
// Color helper
// ---------------------------------------------------------------------------

function getBubbleColor(
  colorMode: ColorEncodingMode,
  sizeMode: string,
  data: FlowNodeData,
  metricRanges: MetricRanges,
): string {
  let accent: string | null = null;

  switch (colorMode) {
    case "default":
      accent = null;
      break;
    case "status":
      accent = getStatusAccentColor(data.status);
      break;
    case "priority":
      accent = getPriorityAccentColor(data.priority);
      break;
    case "lane":
      accent = data.laneColor;
      break;
    case "estimate_days":
    case "remaining_days":
    case "downstream_effort_days":
    case "degree":
    case "betweenness":
    case "dependency_span": {
      const range = metricRanges[colorMode];
      if (range) {
        accent = getMetricAccentColor(
          normalizeMetric(data.metricSummary[colorMode], range.min, range.max),
        );
      }
      break;
    }
    default:
      accent = null;
  }

  if (accent) return accent;

  // Default: use metric gradient derived from the active size mode
  if (sizeMode !== "uniform") {
    const range = metricRanges[sizeMode];
    if (range) {
      const norm = normalizeMetric(
        data.metricSummary[sizeMode],
        range.min,
        range.max,
      );
      return getMetricAccentColor(norm);
    }
  }

  // Fallback: neutral
  return "var(--color-water)";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MetricBubbleNode({ data }: NodeProps<MetricBubbleNodeType>) {
  const colorMode = usePlanDisplayStore(selectColorMode);
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const metricRanges = useContext(GraphMetricRangesContext);
  const { slackRange } = useContext(GraphScheduleOverlayContext);

  const isFocus = data.visibilityRole === "focus";

  // Bubble diameter
  const range = sizeMode !== "uniform" ? metricRanges[sizeMode] : null;
  const norm = range
    ? normalizeMetric(data.metricSummary[sizeMode], range.min, range.max)
    : 0.5;
  const diameter = MIN_BUBBLE_SIZE + norm * (MAX_BUBBLE_SIZE - MIN_BUBBLE_SIZE);

  const bubbleColor = getBubbleColor(colorMode, sizeMode, data, metricRanges);

  // Metric info for tooltip
  const metricLabel = METRIC_LABELS[sizeMode] ?? sizeMode;
  const metricValue =
    sizeMode !== "uniform" ? (data.metricSummary[sizeMode] ?? 0) : 0;
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
  const slackLabel = `${Number.isInteger(data.slackDays) ? data.slackDays : data.slackDays.toFixed(1)}d buffer`;

  // Floating UI tooltip
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { delay: { open: 200, close: 0 } });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
  ]);

  return (
    <div
      style={{
        width: diameter,
        height: diameter,
        opacity: isFocus ? 1 : 0.38,
        transition: "opacity 220ms ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
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

      {/* Bubble circle */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        style={{
          width: diameter,
          height: diameter,
          backgroundColor: bubbleColor,
          borderRadius: "50%",
          border: "1px solid var(--color-node-stroke)",
          boxShadow: "var(--shadow-specimen)",
          flexShrink: 0,
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {showSlackHeatOverlay && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] rounded-full"
            style={{
              border: `1px solid color-mix(in oklab, ${slackColor} 30%, transparent)`,
              background: `radial-gradient(circle at 30% 28%, color-mix(in oklab, ${slackColor} 22%, transparent), transparent 58%)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${slackColor} 10%, transparent), 0 18px 34px color-mix(in oklab, ${slackColor} 10%, transparent)`,
            }}
          />
        )}

        {showCriticalPathOverlay && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] rounded-full"
            style={{
              border: `2px solid color-mix(in oklab, ${criticalPathAccent} 44%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${criticalPathAccent} 14%, transparent), 0 18px 34px color-mix(in oklab, ${criticalPathAccent} 12%, transparent)`,
            }}
          />
        )}
      </div>

      {showCriticalPathOverlay && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border bg-surface px-1.5 font-mono text-[0.55rem] font-semibold leading-none text-foreground"
          style={{
            borderColor: `color-mix(in oklab, ${criticalPathAccent} 44%, transparent)`,
            boxShadow: `0 10px 20px color-mix(in oklab, ${criticalPathAccent} 10%, transparent)`,
          }}
        >
          {data.criticalPathOrder! + 1}
        </span>
      )}

      {/* Tooltip via FloatingPortal */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            {...getFloatingProps()}
            style={{ ...floatingStyles, zIndex: 50, maxWidth: 220 }}
            className="atlas-panel px-3 py-2.5"
          >
            <p className="mb-1 text-sm font-semibold text-foreground">
              {data.title}
            </p>
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: getStatusAccentColor(data.status) }}
              />
              <span className="text-xs text-muted-foreground">
                {STATUS_LABELS[data.status]}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {data.laneLabel}
              </span>
              <span
                className="font-mono text-xs font-bold"
                style={{ color: getPriorityAccentColor(data.priority) }}
              >
                {PRIORITY_LABELS[data.priority]}
              </span>
            </div>
            {(compactEstimate || data.isOnCriticalPath) && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {compactEstimate && (
                  <span className="atlas-microchip text-foreground">
                    {compactEstimate}
                  </span>
                )}
                {showCriticalPathOverlay ? (
                  <span
                    className="atlas-microchip"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--color-pollen) 44%, transparent)",
                      color: "var(--color-pollen)",
                    }}
                  >
                    Path {data.criticalPathOrder! + 1}
                  </span>
                ) : data.isOnCriticalPath ? (
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
                ) : null}
              </div>
            )}
            {showSlackHeatOverlay && slackColor && (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: slackColor }}
                />
                <span className="text-xs text-muted-foreground">
                  Slack: {slackLabel}
                </span>
              </div>
            )}
            {sizeMode !== "uniform" && (
              <div className="mt-1.5 border-t border-border pt-1.5">
                <span className="text-xs text-muted-foreground">
                  {metricLabel}:{" "}
                  {sizeMode === "estimate_days" ||
                  sizeMode === "remaining_days" ||
                  sizeMode === "downstream_effort_days"
                    ? `${Number.isInteger(metricValue) ? metricValue : metricValue.toFixed(1)}d`
                    : metricValue.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
