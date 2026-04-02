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
import type { ColorEncodingMode } from "./plan-display.store";
import {
  selectColorMode,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import { GraphMetricRangesContext } from "./plan-graph-canvas.context";
import {
  type MetricRanges,
  getMetricAccentColor,
  getPriorityAccentColor,
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
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const metricRanges = useContext(GraphMetricRangesContext);

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
        }}
      />

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
            {sizeMode !== "uniform" && (
              <div className="mt-1.5 border-t border-border pt-1.5">
                <span className="text-xs text-muted-foreground">
                  {metricLabel}: {metricValue.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
