import dagre from "@dagrejs/dagre";
import type {
  ColorEncodingMode,
  PlanDisplayStateValue,
  ScheduleOverlayMode,
  SizeEncodingMode,
} from "../../features/plan-workspace/plan-display.store";
import type {
  GraphScope,
  PlanExplorerStateValue,
} from "../../features/plan-workspace/plan-explorer.store";
import { getLanePaletteColor } from "../../features/plan-workspace/plan-graph-canvas.helpers";
import type { TaskGardenWorkItem } from "../plan/task-garden-plan.schema";
import type {
  MetricKey,
  PlanAnalysisSnapshot,
  WorkItemAnalysis,
} from "./plan-analysis-engine";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FlowNodeData {
  id: string;
  title: string;
  laneLabel: string;
  /** Plan-authored lane color, or null when not set. */
  laneColor: string | null;
  status: TaskGardenWorkItem["status"];
  priority: TaskGardenWorkItem["priority"];
  summary: string;
  estimate: TaskGardenWorkItem["estimate"];
  isOnCriticalPath: boolean;
  criticalPathOrder: number | null;
  slackDays: number;
  metricSummary: Readonly<Record<MetricKey, number>>;
  isSelected: boolean;
  visibilityRole: "focus" | "context";
}

export interface FlowNode {
  id: string;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  isHighlighted: boolean;
  isOnCriticalPath: boolean;
}

export interface DisplayLegend {
  title: string;
  items: readonly { key: string; label: string; value: string }[];
  fallbackMessage?: string;
}

export interface ScheduleOverlayLegend {
  mode: Exclude<ScheduleOverlayMode, "none">;
  title: string;
  note: string;
  stats: readonly { key: string; label: string; value: string }[];
  gradientLabels?: {
    start: string;
    end: string;
    neutralNote?: string;
  };
  fallbackMessage?: string;
}

export interface FlowProjection {
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  emptyStateMessage: string | null;
  colorLegend: DisplayLegend;
  sizeLegend: DisplayLegend | null;
  scheduleLegend: ScheduleOverlayLegend | null;
  summary: {
    focusNodeCount: number;
    contextNodeCount: number;
    hiddenNodeCount: number;
    hiddenEdgeCount: number;
    selectedNodeFilteredOut: boolean;
  };
}

export interface FlowProjectionService {
  project(
    snapshot: PlanAnalysisSnapshot,
    explorer: PlanExplorerStateValue,
    display: PlanDisplayStateValue,
  ): FlowProjection;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
/** Gap between adjacent lane columns. */
const LANE_GAP = 60;
/** Internal padding within a lane (left + right margins). */
const LANE_INTERNAL_PADDING = 40;

// ---------------------------------------------------------------------------
// Scope traversal helpers
// ---------------------------------------------------------------------------

function computeUpstream(
  selectedId: string,
  analysisById: Readonly<Record<string, WorkItemAnalysis>>,
): Set<string> {
  const result = new Set<string>([selectedId]);
  const queue = [selectedId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const depId of analysisById[id]?.dependencyIds ?? []) {
      if (!result.has(depId)) {
        result.add(depId);
        queue.push(depId);
      }
    }
  }
  return result;
}

function computeDownstream(
  selectedId: string,
  analysisById: Readonly<Record<string, WorkItemAnalysis>>,
): Set<string> {
  const result = new Set<string>([selectedId]);
  const queue = [selectedId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const depId of analysisById[id]?.dependentIds ?? []) {
      if (!result.has(depId)) {
        result.add(depId);
        queue.push(depId);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Filter matching
// ---------------------------------------------------------------------------

function matchesFilters(
  item: TaskGardenWorkItem,
  explorer: PlanExplorerStateValue,
): boolean {
  if (explorer.searchQuery !== "") {
    const q = explorer.searchQuery.toLowerCase();
    const matched =
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      item.lane.toLowerCase().includes(q);
    if (!matched) return false;
  }
  if (explorer.laneIds.length > 0 && !explorer.laneIds.includes(item.lane)) {
    return false;
  }
  if (
    explorer.statuses.length > 0 &&
    !explorer.statuses.includes(item.status)
  ) {
    return false;
  }
  if (
    explorer.priorities.length > 0 &&
    !explorer.priorities.includes(item.priority)
  ) {
    return false;
  }
  if (
    explorer.tags.length > 0 &&
    !explorer.tags.some((t) => item.tags.includes(t))
  ) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Context computation
// ---------------------------------------------------------------------------

/**
 * 'all' scope context: direct dependencies and dependents of focus nodes.
 * Excludes nodes already in focusIds.
 */
function computeContextAll(
  focusIds: Set<string>,
  analysisById: Readonly<Record<string, WorkItemAnalysis>>,
): Set<string> {
  const context = new Set<string>();
  for (const fId of focusIds) {
    const analysis = analysisById[fId];
    if (!analysis) continue;
    for (const depId of analysis.dependencyIds) {
      if (!focusIds.has(depId)) context.add(depId);
    }
    for (const depId of analysis.dependentIds) {
      if (!focusIds.has(depId)) context.add(depId);
    }
  }
  return context;
}

/**
 * Scoped context: nodes that preserve paths between the selected item and
 * focus matches within the candidate set.
 *
 * For 'upstream' mode: from each focus node, BFS outward via dependentIds
 * (toward the selected item end) within candidateSet to find intermediate
 * nodes on paths from selected → focus.
 *
 * For 'downstream' mode: from each focus node, BFS outward via dependencyIds
 * (toward the selected item end) within candidateSet.
 *
 * 'chain' applies both directions.
 */
function computeContextScoped(
  focusIds: Set<string>,
  candidateSet: Set<string>,
  scope: "upstream" | "downstream" | "chain",
  analysisById: Readonly<Record<string, WorkItemAnalysis>>,
): Set<string> {
  const context = new Set<string>();

  if (scope === "upstream" || scope === "chain") {
    // upstream path: selected depends on focus; to find intermediate nodes,
    // BFS from focus nodes toward the selected end using dependentIds
    for (const fId of focusIds) {
      const queue = [fId];
      const visited = new Set<string>([fId]);
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        for (const depId of analysisById[nodeId]?.dependentIds ?? []) {
          if (candidateSet.has(depId) && !visited.has(depId)) {
            visited.add(depId);
            queue.push(depId);
            if (!focusIds.has(depId)) context.add(depId);
          }
        }
      }
    }
  }

  if (scope === "downstream" || scope === "chain") {
    // downstream path: selected is depended upon by focus; BFS from focus
    // nodes toward the selected end using dependencyIds
    for (const fId of focusIds) {
      const queue = [fId];
      const visited = new Set<string>([fId]);
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        for (const depId of analysisById[nodeId]?.dependencyIds ?? []) {
          if (candidateSet.has(depId) && !visited.has(depId)) {
            visited.add(depId);
            queue.push(depId);
            if (!focusIds.has(depId)) context.add(depId);
          }
        }
      }
    }
  }

  return context;
}

// ---------------------------------------------------------------------------
// Layout — Per-lane independent Dagre
// ---------------------------------------------------------------------------

type PositionMap = Map<string, { x: number; y: number }>;
type LayoutCache = Map<string, PositionMap>;

function computeLayoutSignature(
  visibleNodeIds: readonly string[],
  visibleEdges: readonly { source: string; target: string }[],
): string {
  const nodes = [...visibleNodeIds].sort().join(",");
  const edges = visibleEdges
    .map((e) => `${e.source}→${e.target}`)
    .sort()
    .join(",");
  return `${nodes}|${edges}`;
}

/**
 * Compute layout positions by running Dagre independently per lane.
 *
 * Strategy:
 * a. Group visible nodes by lane.
 * b. For each lane, build a dagre graph with only intra-lane edges.
 * c. Dagre assigns both x and y positions within each lane independently.
 * d. Shift each lane's x positions so lanes sit side by side with a gap.
 */
function computeLayout(
  visibleNodeIds: readonly string[],
  visibleEdges: readonly { source: string; target: string }[],
  snapshot: PlanAnalysisSnapshot,
): PositionMap {
  const visibleSet = new Set(visibleNodeIds);

  // Group nodes by lane
  const laneNodes = new Map<string, string[]>();
  for (const nodeId of visibleNodeIds) {
    const item = snapshot.workItems[nodeId];
    if (!item) continue;
    if (!laneNodes.has(item.lane)) laneNodes.set(item.lane, []);
    laneNodes.get(item.lane)!.push(nodeId);
  }

  // Identify intra-lane edges (both endpoints in the same lane and visible)
  const intraLaneEdges = new Map<
    string,
    Array<{ source: string; target: string }>
  >();
  for (const edge of visibleEdges) {
    const srcItem = snapshot.workItems[edge.source];
    const tgtItem = snapshot.workItems[edge.target];
    if (!srcItem || !tgtItem) continue;
    if (
      srcItem.lane === tgtItem.lane &&
      visibleSet.has(edge.source) &&
      visibleSet.has(edge.target)
    ) {
      if (!intraLaneEdges.has(srcItem.lane))
        intraLaneEdges.set(srcItem.lane, []);
      intraLaneEdges.get(srcItem.lane)!.push(edge);
    }
  }

  // Run dagre independently per lane and collect per-lane positions (local coords)
  const laneLocalPositions = new Map<
    string,
    Map<string, { x: number; y: number }>
  >();
  const laneWidths = new Map<string, number>();

  for (const laneId of snapshot.laneOrder) {
    const nodeIds = laneNodes.get(laneId);
    if (!nodeIds || nodeIds.length === 0) continue;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const nodeId of nodeIds) {
      g.setNode(nodeId, { width: NODE_WIDTH + 40, height: NODE_HEIGHT + 30 });
    }
    for (const edge of intraLaneEdges.get(laneId) ?? []) {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    }

    dagre.layout(g);

    const localPos = new Map<string, { x: number; y: number }>();
    let maxX = 0;
    for (const nodeId of nodeIds) {
      const dagreNode = g.node(nodeId);
      const x = dagreNode?.x ?? 0;
      const y = dagreNode?.y ?? 0;
      localPos.set(nodeId, { x, y });
      maxX = Math.max(maxX, x + NODE_WIDTH / 2);
    }

    laneLocalPositions.set(laneId, localPos);
    laneWidths.set(laneId, maxX + LANE_INTERNAL_PADDING / 2);
  }

  // Accumulate lane x offsets so lanes sit side by side
  const laneXOffset = new Map<string, number>();
  let xCursor = LANE_INTERNAL_PADDING / 2;
  for (const laneId of snapshot.laneOrder) {
    if (!laneLocalPositions.has(laneId)) continue;
    laneXOffset.set(laneId, xCursor);
    xCursor += (laneWidths.get(laneId) ?? NODE_WIDTH) + LANE_GAP;
  }

  // Build final positions: shift each lane's local coords by its x offset,
  // centering nodes (dagre x is center-based, we want top-left)
  const positions: PositionMap = new Map();

  for (const nodeId of visibleNodeIds) {
    const item = snapshot.workItems[nodeId];
    if (!item) {
      positions.set(nodeId, { x: 0, y: 0 });
      continue;
    }

    const localPos = laneLocalPositions.get(item.lane)?.get(nodeId);
    if (!localPos) {
      positions.set(nodeId, { x: 0, y: 0 });
      continue;
    }

    const offsetX = laneXOffset.get(item.lane) ?? 0;
    positions.set(nodeId, {
      x: offsetX + localPos.x - NODE_WIDTH / 2,
      y: localPos.y - NODE_HEIGHT / 2,
    });
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Legend builders
// ---------------------------------------------------------------------------

function buildColorLegend(
  snapshot: PlanAnalysisSnapshot,
  colorMode: ColorEncodingMode,
): DisplayLegend {
  const formatMetricValue = (metric: MetricKey, value: number): string => {
    if (
      metric === "estimate_days" ||
      metric === "remaining_days" ||
      metric === "downstream_effort_days"
    ) {
      return `${Number.isInteger(value) ? value : value.toFixed(1)}d`;
    }
    return value.toFixed(2);
  };

  switch (colorMode) {
    case "default":
      return {
        title: "Color",
        items: [
          { key: "default", label: "Default", value: "Default color scheme" },
        ],
      };

    case "lane": {
      const items = snapshot.laneOrder.map((laneId, index) => {
        const lane = snapshot.plan.lanes.find((l) => l.id === laneId);
        return {
          key: laneId,
          label: lane?.label ?? laneId,
          value: lane?.color ?? getLanePaletteColor(index),
        };
      });
      return { title: "Lane", items };
    }

    case "status": {
      const statuses: TaskGardenWorkItem["status"][] = [
        "planned",
        "ready",
        "blocked",
        "in_progress",
        "done",
        "future",
      ];
      return {
        title: "Status",
        items: statuses.map((s) => ({
          key: s,
          label: s.replace(/_/g, " "),
          value: s,
        })),
      };
    }

    case "priority": {
      const priorities: TaskGardenWorkItem["priority"][] = [
        "p0",
        "p1",
        "p2",
        "p3",
        "nice_to_have",
      ];
      return {
        title: "Priority",
        items: priorities.map((p) => ({
          key: p,
          label: p.replace(/_/g, " "),
          value: p,
        })),
      };
    }

    case "estimate_days":
    case "remaining_days":
    case "downstream_effort_days":
    case "degree":
    case "betweenness":
    case "dependency_span": {
      const range = snapshot.metricRanges[colorMode];
      if (range.min === range.max) {
        return {
          title: colorMode.replace(/_/g, " "),
          items: [],
          fallbackMessage: `All nodes have the same ${colorMode.replace(/_/g, " ")} value; color encoding is not meaningful.`,
        };
      }
      return {
        title: colorMode.replace(/_/g, " "),
        items: [
          {
            key: "low",
            label: "Low",
            value: formatMetricValue(colorMode, range.min),
          },
          {
            key: "high",
            label: "High",
            value: formatMetricValue(colorMode, range.max),
          },
        ],
      };
    }
  }
}

function buildSizeLegend(
  snapshot: PlanAnalysisSnapshot,
  sizeMode: SizeEncodingMode,
): DisplayLegend | null {
  if (sizeMode === "uniform") return null;
  const formatMetricValue = (
    metric: SizeEncodingMode,
    value: number,
  ): string => {
    if (
      metric === "estimate_days" ||
      metric === "remaining_days" ||
      metric === "downstream_effort_days"
    ) {
      return `${Number.isInteger(value) ? value : value.toFixed(1)}d`;
    }
    return value.toFixed(2);
  };
  const range = snapshot.metricRanges[sizeMode];
  if (range.min === range.max) {
    return {
      title: `Size: ${sizeMode.replace(/_/g, " ")}`,
      items: [],
      fallbackMessage: `All nodes have the same ${sizeMode.replace(/_/g, " ")} value; size encoding is not meaningful.`,
    };
  }
  // Compute mean across all work items
  const analyses = Object.values(snapshot.analysisById);
  const sum = analyses.reduce((acc, a) => acc + a.metrics[sizeMode], 0);
  const mean =
    analyses.length > 0 ? sum / analyses.length : (range.min + range.max) / 2;
  return {
    title: `Size: ${sizeMode.replace(/_/g, " ")}`,
    items: [
      {
        key: "min",
        label: formatMetricValue(sizeMode, range.min),
        value: formatMetricValue(sizeMode, range.min),
      },
      {
        key: "mean",
        label: formatMetricValue(sizeMode, mean),
        value: formatMetricValue(sizeMode, mean),
      },
      {
        key: "max",
        label: formatMetricValue(sizeMode, range.max),
        value: formatMetricValue(sizeMode, range.max),
      },
    ],
  };
}

function buildLegends(
  snapshot: PlanAnalysisSnapshot,
  display: PlanDisplayStateValue,
): { colorLegend: DisplayLegend; sizeLegend: DisplayLegend | null } {
  return {
    colorLegend: buildColorLegend(snapshot, display.colorMode),
    sizeLegend: buildSizeLegend(snapshot, display.sizeMode),
  };
}

function formatDayValue(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}d`;
}

function buildScheduleLegend(
  snapshot: PlanAnalysisSnapshot,
  scheduleOverlay: ScheduleOverlayMode,
  visibleIds: ReadonlySet<string>,
): ScheduleOverlayLegend | null {
  if (scheduleOverlay === "none") return null;

  if (snapshot.estimateSummary.estimatedItemCount === 0) {
    return {
      mode: scheduleOverlay,
      title:
        scheduleOverlay === "critical_path"
          ? "Schedule Overlay — Critical Path"
          : "Schedule Overlay — Slack Heatmap",
      note: "Schedule overlays need authored day estimates.",
      stats: [],
      fallbackMessage:
        "Add day estimates to the plan to activate schedule overlays.",
    };
  }

  if (scheduleOverlay === "critical_path") {
    const pathIds = snapshot.estimateSummary.estimatedCriticalPath.workItemIds;
    const visiblePathCount = pathIds.filter((id) => visibleIds.has(id)).length;
    return {
      mode: "critical_path",
      title: "Schedule Overlay — Critical Path",
      note: "The gold trace marks the no-buffer route created by the longest estimated dependency chain.",
      stats: [
        {
          key: "route",
          label: "Plan Route",
          value: formatDayValue(
            snapshot.estimateSummary.estimatedCriticalPath.totalDays,
          ),
        },
        {
          key: "visible",
          label: "Visible",
          value: `${visiblePathCount}/${pathIds.length} items`,
        },
      ],
    };
  }

  const visibleEstimatedIds = [...visibleIds].filter(
    (id) => snapshot.workItems[id]?.estimate?.unit === "days",
  );
  if (visibleEstimatedIds.length === 0) {
    return {
      mode: "slack_heatmap",
      title: "Schedule Overlay — Slack Heatmap",
      note: "Slack heat needs estimated items in the current view.",
      stats: [],
      fallbackMessage:
        "No estimated items are visible in the current scope or filter set.",
    };
  }

  const slackValues = visibleEstimatedIds.map(
    (id) => snapshot.analysisById[id]!.schedule.slackDays,
  );
  const minSlack = Math.min(...slackValues);
  const maxSlack = Math.max(...slackValues);

  return {
    mode: "slack_heatmap",
    title: "Schedule Overlay — Slack Heatmap",
    note: "Warm specimens have less schedule buffer. Cooler specimens can slip more safely.",
    stats: [
      {
        key: "estimated",
        label: "Estimated",
        value: `${visibleEstimatedIds.length}/${visibleIds.size} visible`,
      },
      {
        key: "peak",
        label: "Most Buffer",
        value: formatDayValue(maxSlack),
      },
    ],
    gradientLabels: {
      start: `${formatDayValue(minSlack)} buffer`,
      end: `${formatDayValue(maxSlack)} buffer`,
      neutralNote:
        visibleEstimatedIds.length < visibleIds.size
          ? "Unestimated items stay neutral."
          : undefined,
    },
    fallbackMessage:
      minSlack === maxSlack
        ? "All visible estimated items currently have the same slack."
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFlowProjectionService(): FlowProjectionService {
  const layoutCache: LayoutCache = new Map();

  return {
    project(snapshot, explorer, display): FlowProjection {
      const { analysisById, workItems } = snapshot;
      const allItemIds = Object.keys(workItems);
      const criticalPathIds =
        snapshot.estimateSummary.estimatedCriticalPath.workItemIds;
      const criticalPathOrderById = new Map<string, number>();
      const criticalPathEdgeIds = new Set<string>();
      for (let index = 0; index < criticalPathIds.length; index++) {
        criticalPathOrderById.set(criticalPathIds[index], index);
        if (index > 0) {
          criticalPathEdgeIds.add(
            `${criticalPathIds[index - 1]}→${criticalPathIds[index]}`,
          );
        }
      }

      // ── 1. Effective scope ────────────────────────────────────────────────
      const effectiveScope: GraphScope =
        explorer.selectedWorkItemId !== null ? explorer.activeScope : "all";

      // ── 2. Base candidate set ─────────────────────────────────────────────
      let candidateSet: Set<string>;
      if (effectiveScope === "all" || explorer.selectedWorkItemId === null) {
        candidateSet = new Set(allItemIds);
      } else if (effectiveScope === "upstream") {
        candidateSet = computeUpstream(
          explorer.selectedWorkItemId,
          analysisById,
        );
      } else if (effectiveScope === "downstream") {
        candidateSet = computeDownstream(
          explorer.selectedWorkItemId,
          analysisById,
        );
      } else {
        // 'chain'
        const up = computeUpstream(explorer.selectedWorkItemId, analysisById);
        const down = computeDownstream(
          explorer.selectedWorkItemId,
          analysisById,
        );
        candidateSet = new Set([...up, ...down]);
      }

      // ── 3. Focus set: search + structured filters applied conjunctively ───
      const focusIds = new Set<string>();
      for (const candidateId of candidateSet) {
        const item = workItems[candidateId];
        if (item && matchesFilters(item, explorer)) {
          focusIds.add(candidateId);
        }
      }

      // ── 4. Context set ────────────────────────────────────────────────────
      let contextIds: Set<string>;
      if (effectiveScope === "all") {
        contextIds = computeContextAll(focusIds, analysisById);
      } else {
        contextIds = computeContextScoped(
          focusIds,
          candidateSet,
          effectiveScope as "upstream" | "downstream" | "chain",
          analysisById,
        );
      }

      // Always keep selected item visible as context when it falls outside
      // active search/filters
      if (
        explorer.selectedWorkItemId !== null &&
        !focusIds.has(explorer.selectedWorkItemId) &&
        candidateSet.has(explorer.selectedWorkItemId)
      ) {
        contextIds.add(explorer.selectedWorkItemId);
      }

      // ── 5. Visibility roles ───────────────────────────────────────────────
      const visibilityRoles = new Map<string, "focus" | "context">();
      for (const id of focusIds) visibilityRoles.set(id, "focus");
      for (const id of contextIds) {
        if (!focusIds.has(id)) visibilityRoles.set(id, "context");
      }

      const visibleIds = new Set([...focusIds, ...contextIds]);

      // ── 6. All edges (dependency → dependent direction) ───────────────────
      const allEdges: Array<{ id: string; source: string; target: string }> =
        [];
      for (const itemId of allItemIds) {
        const analysis = analysisById[itemId];
        if (!analysis) continue;
        for (const depId of analysis.dependencyIds) {
          // depId → itemId: depId is the prerequisite (source), itemId is the dependent (target)
          allEdges.push({
            id: `${depId}→${itemId}`,
            source: depId,
            target: itemId,
          });
        }
      }

      // ── 7. Visible edges ──────────────────────────────────────────────────
      const visibleEdges = allEdges.filter(
        (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
      );

      // ── 8. Layout (cached by topology signature) ──────────────────────────
      const visibleNodeIdsSorted = [...visibleIds].sort();
      const layoutSig = computeLayoutSignature(
        visibleNodeIdsSorted,
        visibleEdges,
      );

      let positions: PositionMap;
      if (layoutCache.has(layoutSig)) {
        positions = layoutCache.get(layoutSig)!;
      } else {
        positions = computeLayout(visibleNodeIdsSorted, visibleEdges, snapshot);
        layoutCache.set(layoutSig, positions);
      }

      // ── 9. Build FlowNodes ────────────────────────────────────────────────
      const nodes: FlowNode[] = visibleNodeIdsSorted.map((nodeId) => {
        const item = workItems[nodeId]!;
        const analysis = analysisById[nodeId]!;
        const lane = snapshot.plan.lanes.find((l) => l.id === item.lane);
        const laneIndex = snapshot.laneOrder.indexOf(item.lane);
        return {
          id: nodeId,
          position: positions.get(nodeId) ?? { x: 0, y: 0 },
          data: {
            id: nodeId,
            title: item.title,
            laneLabel: lane?.label ?? item.lane,
            laneColor: lane?.color ?? getLanePaletteColor(laneIndex),
            status: item.status,
            priority: item.priority,
            summary: item.summary,
            estimate: item.estimate,
            isOnCriticalPath: analysis.schedule.isOnCriticalPath,
            criticalPathOrder: criticalPathOrderById.get(nodeId) ?? null,
            slackDays: analysis.schedule.slackDays,
            metricSummary: analysis.metrics,
            isSelected: nodeId === explorer.selectedWorkItemId,
            visibilityRole: visibilityRoles.get(nodeId) ?? "focus",
          },
        };
      });

      // ── 10. Build FlowEdges ───────────────────────────────────────────────
      const edges: FlowEdge[] = visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        isHighlighted:
          explorer.selectedWorkItemId !== null &&
          (e.source === explorer.selectedWorkItemId ||
            e.target === explorer.selectedWorkItemId),
        isOnCriticalPath: criticalPathEdgeIds.has(e.id),
      }));

      // ── 11. Summary ───────────────────────────────────────────────────────
      const hiddenNodeCount = allItemIds.length - visibleIds.size;
      const hiddenEdgeCount = allEdges.length - visibleEdges.length;
      const selectedNodeFilteredOut =
        explorer.selectedWorkItemId !== null &&
        !focusIds.has(explorer.selectedWorkItemId);

      // ── 12. Empty state message ───────────────────────────────────────────
      const hasActiveFilters =
        explorer.searchQuery !== "" ||
        explorer.laneIds.length > 0 ||
        explorer.statuses.length > 0 ||
        explorer.priorities.length > 0 ||
        explorer.tags.length > 0;

      const emptyStateMessage =
        focusIds.size === 0 && hasActiveFilters
          ? "No work items match the active search or filters."
          : null;

      // ── 13. Legend ────────────────────────────────────────────────────────
      const { colorLegend, sizeLegend } = buildLegends(snapshot, display);
      const scheduleLegend = buildScheduleLegend(
        snapshot,
        display.scheduleOverlay,
        visibleIds,
      );

      return {
        nodes,
        edges,
        emptyStateMessage,
        colorLegend,
        sizeLegend,
        scheduleLegend,
        summary: {
          focusNodeCount: focusIds.size,
          contextNodeCount: contextIds.size,
          hiddenNodeCount,
          hiddenEdgeCount,
          selectedNodeFilteredOut,
        },
      };
    },
  };
}

export const flowProjectionService: FlowProjectionService =
  createFlowProjectionService();
