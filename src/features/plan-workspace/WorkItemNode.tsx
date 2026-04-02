import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { useContext } from "react";
import type { FlowNodeData } from "../../lib/graph/flow-projection-service";
import type { ColorEncodingMode, SizeEncodingMode } from "./plan-display.store";
import {
  selectColorMode,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import { GraphMetricRangesContext } from "./plan-graph-canvas.context";
import {
  type MetricRanges,
  NODE_RENDER_HEIGHT,
  getMetricAccentColor,
  getPriorityAccentColor,
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
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const metricRanges = useContext(GraphMetricRangesContext);

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

      {/* Left accent stripe for color encoding */}
      {accentColor && (
        <div
          aria-hidden="true"
          style={{ backgroundColor: accentColor }}
          className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full"
        />
      )}

      {/* Priority badge — absolutely positioned top-right */}
      <span
        style={{ backgroundColor: getPriorityAccentColor(data.priority) }}
        className="absolute right-2 top-2 inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[0.55rem] font-bold leading-none text-primary-foreground"
      >
        {PRIORITY_LABELS[data.priority]}
      </span>

      {/* Title */}
      <div
        className="line-clamp-2 pr-10 text-[0.72rem] font-semibold leading-snug text-foreground"
        title={data.title}
      >
        {data.title}
      </div>

      {/* Footer: status dot + lane label + status label */}
      <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
        <span
          aria-label={STATUS_LABELS[data.status]}
          style={{ backgroundColor: getStatusAccentColor(data.status) }}
          className="h-1.5 w-1.5 shrink-0 rounded-full"
        />
        <span className="truncate font-sans text-[0.6rem] text-muted-foreground">
          {data.laneLabel}
        </span>
        <span className="ml-auto shrink-0 truncate font-sans text-[0.6rem] text-muted-foreground">
          {STATUS_LABELS[data.status]}
        </span>
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
