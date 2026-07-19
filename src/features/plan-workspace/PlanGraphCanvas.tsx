import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
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
  useState,
} from "react";
import type { FlowProjection } from "../../lib/graph/flow-projection-service";
import type { TaskGardenLane } from "../../lib/plan/task-garden-plan.schema";
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
  GraphDisplayModeContext,
  type GraphDisplayModeContextValue,
  GraphMetricRangesContext,
  GraphScheduleOverlayContext,
} from "./plan-graph-canvas.context";
import {
  computeGhostLaneAddRect,
  computeLaneBands,
  computeMetricRanges,
  createEdgeStyleFactory,
  getCriticalPathAccentColor,
  normalizeMetric,
  resolveLegendItemColor,
} from "./plan-graph-canvas.helpers";
import { getColorModeLabel, getSizeModeLabel } from "./plan-toolbar.helpers";
import { LiveRegion } from "./ui/LiveRegion";

// ---------------------------------------------------------------------------
// Lane band node (renders behind work items to visually group lanes)
// ---------------------------------------------------------------------------

interface LaneBandNodeData {
  laneLabel: string;
  /** Plan-authored lane color, or null. Used to tint the band background subtly. */
  laneColor: string | null;
  width: number;
  height: number;
  [key: string]: unknown;
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
// Ghost lane-add node — "+ Add to {lane}" affordance positioned beneath each
// lane's last work item. Selecting it opens the new-item form prefilled with
// the lane.
// ---------------------------------------------------------------------------

interface GhostLaneAddNodeData {
  laneId: string;
  laneLabel: string;
  onAdd: (laneId: string) => void;
  [key: string]: unknown;
}

type GhostLaneAddNodeType = Node<GhostLaneAddNodeData, "ghostLaneAdd">;

function GhostLaneAddNode({ data }: NodeProps<GhostLaneAddNodeType>) {
  return (
    <button
      type="button"
      data-testid={`ghost-lane-add-${data.laneId}`}
      onClick={(e) => {
        e.stopPropagation();
        data.onAdd(data.laneId);
      }}
      className="flex h-full w-full items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-surface/40 text-xs font-medium text-muted-foreground transition-colors hover:border-moss hover:bg-surface hover:text-foreground"
      style={{ minHeight: 56 }}
      aria-label={`Add work item to ${data.laneLabel}`}
    >
      + Add to {data.laneLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NodeTypes registry
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  workItem: WorkItemNode as unknown as ComponentType<NodeProps>,
  metricBubble: MetricBubbleNode as unknown as ComponentType<NodeProps>,
  laneBand: LaneBandNode as ComponentType<NodeProps>,
  ghostLaneAdd: GhostLaneAddNode as ComponentType<NodeProps>,
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
              backgroundImage: `repeating-linear-gradient(90deg, ${criticalPathAccent} 0 8px, transparent 8px 12px)`,
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
  /** All lanes in the plan — used to render a ghost-add affordance per lane. */
  lanes: readonly TaskGardenLane[];
  /** Called when a lane's ghost-add affordance is clicked. */
  onAddInLane: (laneId: string) => void;
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

  // Effect re-fires whenever `nodes` changes — including hover-driven ghost-add
  // nodes — so we track which selection we last auto-panned to and bail when
  // it hasn't changed. Without this, hovering a lane after a task is selected
  // would re-center the viewport on every hover.
  const lastAutoPannedSelectionRef = useRef<string | null>(null);

  // Auto-pan: when selection comes from outside the graph (panel clicks, etc.)
  useEffect(() => {
    if (lastAutoPannedSelectionRef.current === selectedWorkItemId) return;
    if (!selectedWorkItemId) {
      lastAutoPannedSelectionRef.current = null;
      return;
    }
    if (skipAutoPanRef.current) {
      skipAutoPanRef.current = false;
      lastAutoPannedSelectionRef.current = selectedWorkItemId;
      return;
    }
    const node = nodes.find((n) => n.id === selectedWorkItemId);
    if (!node) return;
    lastAutoPannedSelectionRef.current = selectedWorkItemId;
    const x = node.position.x + (node.width ?? 200) / 2;
    const y = node.position.y + (node.height ?? 80) / 2;
    setCenter(x, y, { duration: 400, zoom: getZoom() });
  }, [selectedWorkItemId, nodes, setCenter, getZoom, skipAutoPanRef]);

  // Zoom-to-fit: when the set of visible node IDs changes (filter changes).
  // Decorative nodes (lane bands, hover-driven ghost-add affordances) are
  // excluded so transient hover state doesn't trigger a fitView.
  const topologySignature = useMemo(
    () =>
      nodes
        .filter((n) => n.type !== "laneBand" && n.type !== "ghostLaneAdd")
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
  lanes,
  onAddInLane,
}: PlanGraphCanvasProps) {
  const skipAutoPanRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const clearFilters = usePlanExplorerStore((s) => s.clearFilters);
  const colorMode = usePlanDisplayStore(selectColorMode);
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const displayMode = useMemo<GraphDisplayModeContextValue>(
    () => ({ colorMode, sizeMode, scheduleOverlay }),
    [colorMode, sizeMode, scheduleOverlay],
  );

  // Metric ranges for WorkItemNode normalization
  const metricRanges = useMemo(
    () => computeMetricRanges(projection.nodes),
    [projection.nodes],
  );
  const slackRange = useMemo(() => {
    const values = projection.nodes
      .filter((node) => node.data.estimate != null)
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
        const rawNorm = range
          ? normalizeMetric(
              node.data.metricSummary[sizeMode],
              range.min,
              range.max,
            )
          : 0.5;
        const norm = Number.isNaN(rawNorm) ? 0 : rawNorm;
        const diameter = 28 + norm * 44;
        return {
          id: node.id,
          type: "metricBubble" as const,
          position: node.position,
          ariaLabel: node.ariaLabel,
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
        ariaLabel: node.ariaLabel,
        data: node.data,
        draggable: false,
        selectable: true,
        zIndex: 1,
        width: 200,
        height: 80,
      } satisfies WorkItemNodeType;
    });
  }, [projection.nodes, sizeMode, metricRanges]);

  // Hover state — ghost-add affordances only render for the lane currently
  // under the pointer, so they remain discoverable without crowding the graph
  // when lanes are dense.
  const [hoveredLaneLabel, setHoveredLaneLabel] = useState<string | null>(null);

  // Ghost lane-add node — positioned directly beneath the hovered lane's own
  // last visible work item (never the shared/global band bottom), so it can't
  // overlap the deepest lane's last item.
  const ghostLaneAddNodes = useMemo((): GhostLaneAddNodeType[] => {
    if (lanes.length === 0 || hoveredLaneLabel === null) return [];
    const labelToId = new Map(lanes.map((l) => [l.label, l.id] as const));
    const laneId = labelToId.get(hoveredLaneLabel);
    if (!laneId) return [];
    const rect = computeGhostLaneAddRect(hoveredLaneLabel, projection.nodes);
    if (!rect) return [];
    return [
      {
        id: `ghost-lane-add::${laneId}`,
        type: "ghostLaneAdd" as const,
        position: { x: rect.x, y: rect.y },
        data: {
          laneId,
          laneLabel: hoveredLaneLabel,
          onAdd: onAddInLane,
        },
        draggable: false,
        selectable: false,
        focusable: false,
        width: rect.width,
        height: rect.height,
        zIndex: 2,
      },
    ];
  }, [lanes, hoveredLaneLabel, projection.nodes, onAddInLane]);

  const rfNodes: Node[] = useMemo(
    () => [
      ...(laneBandNodes as Node[]),
      ...(workItemNodes as Node[]),
      ...(ghostLaneAddNodes as Node[]),
    ],
    [laneBandNodes, workItemNodes, ghostLaneAddNodes],
  );

  // Styled edges with botanical tokens + focus/context opacity. Style objects
  // are shared across edges via a small factory keyed by the visual-state
  // tuple, so identical edges produce identical references.
  const edgeStyleFactory = useMemo(() => createEdgeStyleFactory(), []);
  const rfEdges: Edge[] = useMemo(() => {
    return projection.edges.map((e) => {
      const sourceRole = visibilityRoleMap.get(e.source);
      const targetRole = visibilityRoleMap.get(e.target);
      const isContextEdge =
        sourceRole === "context" || targetRole === "context";
      const { style, markerEnd, className } = edgeStyleFactory({
        scheduleOverlay,
        isHighlighted: e.isHighlighted,
        isContextEdge,
        isOnCriticalPath: e.isOnCriticalPath,
      });
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        className,
        markerEnd,
        style,
      };
    });
  }, [projection.edges, scheduleOverlay, visibilityRoleMap, edgeStyleFactory]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.type === "ghostLaneAdd" || node.type === "laneBand") return;
      skipAutoPanRef.current = true;
      onSelectWorkItem(node.id);
    },
    [onSelectWorkItem],
  );

  const onPaneClick = useCallback(() => {
    onClearSelection();
  }, [onClearSelection]);

  // Ghost-add affordance is anchored to the lane itself, not individual tasks.
  // Hovering a task does not reveal it (would be disruptive and unrelated to
  // the task under the pointer).
  const onNodeMouseEnter = useCallback((_: unknown, node: Node) => {
    if (node.type !== "laneBand") return;
    const laneLabel = (node.data as { laneLabel?: unknown })?.laneLabel;
    if (typeof laneLabel === "string") setHoveredLaneLabel(laneLabel);
  }, []);

  const onCanvasMouseLeave = useCallback(() => {
    setHoveredLaneLabel(null);
  }, []);

  // Empty state when all items are filtered out. The status region occupies
  // the same tree position (fragment index 0) in both branches so React keeps
  // one persistent element across the graph↔empty transition — a live region
  // inserted into the DOM with content already present is never announced.
  if (projection.emptyStateMessage) {
    return (
      <>
        <LiveRegion kind="status" className="sr-only">
          {projection.emptyStateMessage}
        </LiveRegion>
        <div className="flex h-full w-full items-center justify-center">
          <PlanEmptyState
            message={projection.emptyStateMessage}
            onClearFilters={clearFilters}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <LiveRegion kind="status" className="sr-only">
        {null}
      </LiveRegion>
      <GraphMetricRangesContext.Provider value={metricRanges}>
        <GraphScheduleOverlayContext.Provider value={{ slackRange }}>
          <GraphDisplayModeContext.Provider value={displayMode}>
            <div
              ref={canvasRef}
              className="relative h-full w-full"
              onMouseLeave={onCanvasMouseLeave}
            >
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onNodeMouseEnter={onNodeMouseEnter}
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
                          colorMode,
                          item,
                        );
                        return (
                          <li
                            key={item.key}
                            className="flex items-center gap-2"
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full${dotColor ? "" : " bg-foreground opacity-50"}`}
                              style={
                                dotColor
                                  ? { backgroundColor: dotColor }
                                  : undefined
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
          </GraphDisplayModeContext.Provider>
        </GraphScheduleOverlayContext.Provider>
      </GraphMetricRangesContext.Provider>
    </>
  );
}
