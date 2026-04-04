import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type NodeProps,
  type NodeTypes,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { FlowProjection } from "../../lib/graph/flow-projection-service";
import {
  MetricBubbleNode,
  type MetricBubbleNodeType,
} from "./MetricBubbleNode";
import { PlanEmptyState } from "./PlanEmptyState";
import { WorkItemNode, type WorkItemNodeType } from "./WorkItemNode";
import {
  selectColorMode,
  selectScheduleOverlay,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import { usePlanExplorerStore } from "./plan-explorer.store";
import {
  GraphMetricRangesContext,
  GraphScheduleOverlayContext,
} from "./plan-graph-canvas.context";
import {
  computeLaneBands,
  computeMetricRanges,
  getCriticalPathAccentColor,
  normalizeMetric,
  resolveLegendItemColor,
} from "./plan-graph-canvas.helpers";
import { getColorModeLabel, getSizeModeLabel } from "./plan-toolbar.helpers";

// ---------------------------------------------------------------------------
// Lane band node (renders behind work items to visually group lanes)
// ---------------------------------------------------------------------------

interface LaneBandNodeData {
  laneLabel: string;
  /** Plan-authored lane color, or null. Used to tint the band background subtly. */
  laneColor: string | null;
  width: number;
  height: number;
}

type LaneBandNodeType = Node<LaneBandNodeData, "laneBand">;

function LaneBandNode({ data }: NodeProps<LaneBandNodeType>) {
  const bg = data.laneColor
    ? `color-mix(in oklab, ${data.laneColor} 11%, var(--color-lane-fill))`
    : "var(--color-lane-fill)";
  const borderColor = data.laneColor
    ? `color-mix(in oklab, ${data.laneColor} 22%, var(--color-lane-stroke))`
    : "var(--color-lane-stroke)";

  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-lg)",
        pointerEvents: "none",
      }}
    >
      <span className="atlas-kicker block px-4 pt-3">{data.laneLabel}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NodeTypes registry
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  workItem: WorkItemNode as ComponentType<NodeProps>,
  metricBubble: MetricBubbleNode as ComponentType<NodeProps>,
  laneBand: LaneBandNode as ComponentType<NodeProps>,
};

// ---------------------------------------------------------------------------
// Size legend — proportional circles for min / mean / max
// ---------------------------------------------------------------------------

/** Legend circle diameter range (px). Compact but proportional to the actual
 *  graph bubble range (28–72 px). */
const SIZE_LEGEND_MIN_D = 8;
const SIZE_LEGEND_MAX_D = 20;

function SizeLegendItems({
  items,
}: { items: readonly { key: string; label: string; value: string }[] }) {
  const minItem = items.find((i) => i.key === "min");
  const meanItem = items.find((i) => i.key === "mean");
  const maxItem = items.find((i) => i.key === "max");
  if (!minItem || !meanItem || !maxItem) return null;

  const minVal = Number.parseFloat(minItem.value);
  const maxVal = Number.parseFloat(maxItem.value);
  const meanVal = Number.parseFloat(meanItem.value);
  const meanNorm =
    maxVal > minVal ? normalizeMetric(meanVal, minVal, maxVal) : 0.5;

  const entries: { label: string; norm: number }[] = [
    { label: minItem.label, norm: 0 },
    { label: meanItem.label, norm: meanNorm },
    { label: maxItem.label, norm: 1 },
  ];

  return (
    <ul className="flex items-end gap-3 pt-1">
      {entries.map((entry) => {
        const d =
          SIZE_LEGEND_MIN_D +
          entry.norm * (SIZE_LEGEND_MAX_D - SIZE_LEGEND_MIN_D);
        return (
          <li key={entry.label} className="flex flex-col items-center gap-1">
            <span
              aria-hidden="true"
              className="rounded-full border border-node-stroke bg-surface-muted"
              style={{ width: d, height: d }}
            />
            <span className="text-[0.6rem] text-muted-foreground">
              {entry.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ScheduleOverlayCard({
  legend,
}: {
  legend: FlowProjection["scheduleLegend"];
}) {
  if (!legend) return null;

  const criticalPathAccent = getCriticalPathAccentColor();

  return (
    <div
      aria-label="Schedule overlay legend"
      className="atlas-panel atlas-noise pointer-events-none absolute right-4 top-4 max-w-[264px] px-4 py-3.5"
      style={{ zIndex: 20 }}
    >
      <p className="atlas-kicker mb-2">{legend.title}</p>

      {legend.mode === "critical_path" ? (
        <div className="mb-2 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-[3px] flex-1 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${criticalPathAccent}, color-mix(in oklab, ${criticalPathAccent} 58%, var(--color-moss) 42%))`,
              boxShadow: `0 0 14px color-mix(in oklab, ${criticalPathAccent} 18%, transparent)`,
            }}
          />
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border bg-surface text-[0.58rem] font-mono font-semibold text-foreground"
            style={{
              borderColor: `color-mix(in oklab, ${criticalPathAccent} 44%, transparent)`,
              boxShadow: `0 10px 24px color-mix(in oklab, ${criticalPathAccent} 12%, transparent)`,
            }}
          >
            1
          </span>
        </div>
      ) : legend.gradientLabels ? (
        <div className="mb-2 flex flex-col gap-1.5">
          <div
            aria-hidden="true"
            className="h-2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--color-petal) 78%, var(--color-pollen) 22%), color-mix(in oklab, var(--color-pollen) 78%, var(--color-lichen) 22%), color-mix(in oklab, var(--color-water) 72%, var(--color-lichen) 28%))",
            }}
          />
          <div className="flex items-center justify-between gap-2 text-[0.6rem] text-muted-foreground">
            <span>{legend.gradientLabels?.start}</span>
            <span>{legend.gradientLabels?.end}</span>
          </div>
        </div>
      ) : null}

      {legend.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {legend.stats.map((stat) => (
            <div
              key={stat.key}
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-2"
            >
              <span className="atlas-kicker text-[0.55rem]">{stat.label}</span>
              <span className="mt-1 block font-mono text-sm text-foreground">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-[0.66rem] leading-relaxed text-muted-foreground">
        {legend.note}
      </p>

      {legend.gradientLabels?.neutralNote && (
        <p className="mt-1 text-[0.62rem] italic text-muted-foreground">
          {legend.gradientLabels.neutralNote}
        </p>
      )}

      {legend.fallbackMessage && (
        <p className="mt-1 text-[0.62rem] italic text-muted-foreground">
          {legend.fallbackMessage}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanGraphCanvasProps {
  projection: FlowProjection;
  selectedWorkItemId: string | null;
  /** Called when a graph node is clicked. */
  onSelectWorkItem: (id: string) => void;
  /** Called when the graph background is clicked (deselect). */
  onClearSelection: () => void;
}

// ---------------------------------------------------------------------------
// ViewportController — must be rendered inside <ReactFlow> to use useReactFlow
// ---------------------------------------------------------------------------

function ViewportController({
  selectedWorkItemId,
  nodes,
  skipAutoPanRef,
}: {
  selectedWorkItemId: string | null;
  nodes: Node[];
  skipAutoPanRef: React.RefObject<boolean>;
}) {
  const { setCenter, getZoom, fitView } = useReactFlow();

  // Auto-pan: when selection comes from outside the graph (panel clicks, etc.)
  useEffect(() => {
    if (!selectedWorkItemId) return;
    if (skipAutoPanRef.current) {
      skipAutoPanRef.current = false;
      return;
    }
    const node = nodes.find((n) => n.id === selectedWorkItemId);
    if (!node) return;
    const x = node.position.x + (node.width ?? 200) / 2;
    const y = node.position.y + (node.height ?? 80) / 2;
    setCenter(x, y, { duration: 400, zoom: getZoom() });
  }, [selectedWorkItemId, nodes, setCenter, getZoom, skipAutoPanRef]);

  // Zoom-to-fit: when the set of visible node IDs changes (filter changes)
  const topologySignature = useMemo(
    () =>
      nodes
        .filter((n) => n.type !== "laneBand")
        .map((n) => n.id)
        .sort()
        .join(","),
    [nodes],
  );

  const prevSignatureRef = useRef(topologySignature);
  const isInitialRenderRef = useRef(true);

  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      prevSignatureRef.current = topologySignature;
      return;
    }
    if (topologySignature !== prevSignatureRef.current) {
      prevSignatureRef.current = topologySignature;
      const timer = setTimeout(() => {
        fitView({ padding: 0.12, duration: 400 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [topologySignature, fitView]);

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanGraphCanvas({
  projection,
  selectedWorkItemId,
  onSelectWorkItem,
  onClearSelection,
}: PlanGraphCanvasProps) {
  const skipAutoPanRef = useRef(false);
  const clearFilters = usePlanExplorerStore((s) => s.clearFilters);
  const colorMode = usePlanDisplayStore(selectColorMode);
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const sizeMode = usePlanDisplayStore(selectSizeMode);

  // Metric ranges for WorkItemNode normalization
  const metricRanges = useMemo(
    () => computeMetricRanges(projection.nodes),
    [projection.nodes],
  );
  const slackRange = useMemo(() => {
    const values = projection.nodes
      .filter((node) => node.data.estimate?.unit === "days")
      .map((node) => node.data.slackDays);
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [projection.nodes]);

  // Visibility role map for edge opacity
  const visibilityRoleMap = useMemo(() => {
    const map = new Map<string, "focus" | "context">();
    for (const node of projection.nodes) {
      map.set(node.id, node.data.visibilityRole);
    }
    return map;
  }, [projection.nodes]);

  // Lane band nodes (z-index 0, behind work items)
  const laneBandNodes = useMemo((): LaneBandNodeType[] => {
    const bands = computeLaneBands(projection.nodes);
    return bands.map((band) => ({
      id: `lane-band::${band.laneLabel}`,
      type: "laneBand" as const,
      position: { x: band.x, y: band.minY },
      data: {
        laneLabel: band.laneLabel,
        laneColor: band.laneColor,
        width: band.width,
        height: band.height,
      },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      width: band.width,
      height: band.height,
    }));
  }, [projection.nodes]);

  // Work item nodes (z-index 1) — card or bubble depending on sizeMode
  const workItemNodes = useMemo((): Array<
    WorkItemNodeType | MetricBubbleNodeType
  > => {
    const isBubbleMode = sizeMode !== "uniform";
    return projection.nodes.map((node) => {
      if (isBubbleMode) {
        const range = metricRanges[sizeMode];
        const norm = range
          ? normalizeMetric(
              node.data.metricSummary[sizeMode],
              range.min,
              range.max,
            )
          : 0.5;
        const diameter = 28 + norm * 44;
        return {
          id: node.id,
          type: "metricBubble" as const,
          position: node.position,
          data: node.data,
          draggable: false,
          selectable: true,
          zIndex: 1,
          width: diameter,
          height: diameter,
        } satisfies MetricBubbleNodeType;
      }
      return {
        id: node.id,
        type: "workItem" as const,
        position: node.position,
        data: node.data,
        draggable: false,
        selectable: true,
        zIndex: 1,
        width: 200,
        height: 80,
      } satisfies WorkItemNodeType;
    });
  }, [projection.nodes, sizeMode, metricRanges]);

  const rfNodes: Node[] = useMemo(
    () => [...(laneBandNodes as Node[]), ...(workItemNodes as Node[])],
    [laneBandNodes, workItemNodes],
  );

  // Styled edges with botanical tokens + focus/context opacity
  const rfEdges: Edge[] = useMemo(() => {
    const criticalPathAccent = getCriticalPathAccentColor();
    return projection.edges.map((e) => {
      const sourceRole = visibilityRoleMap.get(e.source);
      const targetRole = visibilityRoleMap.get(e.target);
      const isContextEdge =
        sourceRole === "context" || targetRole === "context";
      const shouldEmphasizeCriticalPath =
        scheduleOverlay === "critical_path" && e.isOnCriticalPath;
      const strokeColor = shouldEmphasizeCriticalPath
        ? criticalPathAccent
        : e.isHighlighted
          ? "var(--color-edge-strong)"
          : "var(--color-edge)";
      const strokeWidth = shouldEmphasizeCriticalPath
        ? 3.2
        : e.isHighlighted
          ? 2
          : 1;
      const opacity =
        scheduleOverlay === "critical_path"
          ? shouldEmphasizeCriticalPath
            ? 0.98
            : isContextEdge
              ? 0.08
              : e.isHighlighted
                ? 0.28
                : 0.16
          : isContextEdge
            ? 0.38
            : 1;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: shouldEmphasizeCriticalPath ? 12 : 10,
          height: shouldEmphasizeCriticalPath ? 12 : 10,
        },
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
      };
    });
  }, [projection.edges, scheduleOverlay, visibilityRoleMap]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      skipAutoPanRef.current = true;
      onSelectWorkItem(node.id);
    },
    [onSelectWorkItem],
  );

  const onPaneClick = useCallback(() => {
    onClearSelection();
  }, [onClearSelection]);

  // Empty state when all items are filtered out
  if (projection.emptyStateMessage) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <PlanEmptyState
          message={projection.emptyStateMessage}
          onClearFilters={clearFilters}
        />
      </div>
    );
  }

  return (
    <GraphMetricRangesContext.Provider value={metricRanges}>
      <GraphScheduleOverlayContext.Provider value={{ slackRange }}>
        <div className="relative h-full w-full">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.15}
            maxZoom={3}
            proOptions={{ hideAttribution: true }}
            style={{ background: "transparent" }}
          >
            {/* Atlas-style dot grid background */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={32}
              size={1}
              color="var(--color-grid)"
            />

            <ViewportController
              selectedWorkItemId={selectedWorkItemId}
              nodes={rfNodes}
              skipAutoPanRef={skipAutoPanRef}
            />

            {/* Viewport controls: zoom in/out + fit-view */}
            <Controls
              showInteractive={false}
              style={{
                boxShadow: "var(--shadow-specimen)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-panel)",
                overflow: "hidden",
              }}
            />

            {/* Minimap for large graphs */}
            {/* Note: nodeColor/nodeStrokeColor/maskColor use hardcoded oklch values
                because CSS variables resolve to near-white in both themes, making
                the minimap invisible. These values are minimap-specific overrides
                tuned for visibility in light and dark themes. */}
            <MiniMap
              pannable={true}
              zoomable={true}
              nodeColor={(node) => {
                if (node.type === "laneBand")
                  return "oklch(0.82 0.03 95 / 0.35)";
                const d = node.data as {
                  isSelected?: boolean;
                  visibilityRole?: string;
                };
                if (d.isSelected) return "var(--color-moss)";
                if (d.visibilityRole === "context")
                  return "oklch(0.72 0.03 142)";
                return "oklch(0.62 0.04 142)";
              }}
              nodeStrokeColor="oklch(0.50 0.04 142)"
              maskColor="oklch(0.96 0.01 95 / 0.25)"
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-panel)",
                cursor: "grab",
              }}
            />
          </ReactFlow>

          <ScheduleOverlayCard legend={projection.scheduleLegend} />

          {/* Legend overlay (bottom-right of canvas, pointer-events:none) */}
          {(projection.colorLegend.items.length > 0 ||
            projection.colorLegend.fallbackMessage ||
            projection.sizeLegend) && (
            <div
              aria-label="Graph legend"
              className="atlas-panel pointer-events-none absolute bottom-[210px] right-4 max-w-[210px] px-4 py-3"
              style={{ zIndex: 20 }}
            >
              {/* Color section */}
              <p className="atlas-kicker mb-1.5">{`Color \u2014 ${getColorModeLabel(colorMode)}`}</p>
              {projection.colorLegend.fallbackMessage ? (
                <p className="text-[0.65rem] italic text-muted-foreground">
                  {projection.colorLegend.fallbackMessage}
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {projection.colorLegend.items.map((item) => {
                    const dotColor = resolveLegendItemColor(
                      projection.colorLegend.title,
                      item,
                    );
                    return (
                      <li key={item.key} className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full${dotColor ? "" : " bg-foreground opacity-50"}`}
                          style={
                            dotColor ? { backgroundColor: dotColor } : undefined
                          }
                        />
                        <span className="truncate text-[0.65rem] text-foreground">
                          {item.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Size section */}
              {projection.sizeLegend && (
                <>
                  <div className="my-2 border-t border-border" />
                  <p className="atlas-kicker mb-1.5">{`Node Size \u2014 ${getSizeModeLabel(sizeMode)}`}</p>
                  {projection.sizeLegend.fallbackMessage ? (
                    <p className="text-[0.65rem] italic text-muted-foreground">
                      {projection.sizeLegend.fallbackMessage}
                    </p>
                  ) : (
                    <SizeLegendItems items={projection.sizeLegend.items} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </GraphScheduleOverlayContext.Provider>
    </GraphMetricRangesContext.Provider>
  );
}
