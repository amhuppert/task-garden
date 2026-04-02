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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type ComponentType, useCallback, useMemo } from "react";
import type { FlowProjection } from "../../lib/graph/flow-projection-service";
import {
  MetricBubbleNode,
  type MetricBubbleNodeType,
} from "./MetricBubbleNode";
import { PlanEmptyState } from "./PlanEmptyState";
import { WorkItemNode, type WorkItemNodeType } from "./WorkItemNode";
import {
  selectColorMode,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import { usePlanExplorerStore } from "./plan-explorer.store";
import { GraphMetricRangesContext } from "./plan-graph-canvas.context";
import {
  computeLaneBands,
  computeMetricRanges,
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanGraphCanvasProps {
  projection: FlowProjection;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanGraphCanvas({ projection }: PlanGraphCanvasProps) {
  const selectWorkItem = usePlanExplorerStore((s) => s.selectWorkItem);
  const clearSelection = usePlanExplorerStore((s) => s.clearSelection);
  const clearFilters = usePlanExplorerStore((s) => s.clearFilters);
  const colorMode = usePlanDisplayStore(selectColorMode);
  const sizeMode = usePlanDisplayStore(selectSizeMode);

  // Metric ranges for WorkItemNode normalization
  const metricRanges = useMemo(
    () => computeMetricRanges(projection.nodes),
    [projection.nodes],
  );

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
    return projection.edges.map((e) => {
      const sourceRole = visibilityRoleMap.get(e.source);
      const targetRole = visibilityRoleMap.get(e.target);
      const isContextEdge =
        sourceRole === "context" || targetRole === "context";
      const strokeColor = e.isHighlighted
        ? "var(--color-edge-strong)"
        : "var(--color-edge)";

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 10,
          height: 10,
        },
        style: {
          stroke: strokeColor,
          strokeWidth: e.isHighlighted ? 2 : 1,
          opacity: isContextEdge ? 0.38 : 1,
          transition: "opacity 220ms ease, stroke-width 120ms ease",
        },
      };
    });
  }, [projection.edges, visibilityRoleMap]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      selectWorkItem(node.id);
    },
    [selectWorkItem],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

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
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "laneBand") return "transparent";
              const d = node.data as {
                isSelected?: boolean;
                visibilityRole?: string;
              };
              if (d.isSelected) return "var(--color-moss)";
              if (d.visibilityRole === "context")
                return "var(--color-surface-muted)";
              return "var(--color-node-default)";
            }}
            nodeStrokeColor="var(--color-node-stroke)"
            maskColor="oklch(0.97 0.018 95 / 0.6)"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-panel)",
            }}
          />
        </ReactFlow>

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
    </GraphMetricRangesContext.Provider>
  );
}
