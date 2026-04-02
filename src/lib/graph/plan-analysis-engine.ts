import { DirectedGraph } from "graphology";
import { topologicalSort } from "graphology-dag";
import betweennessCentrality from "graphology-metrics/centrality/betweenness";
import type {
  TaskGardenPlan,
  TaskGardenWorkItem,
} from "../plan/task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetricKey =
  | "degree"
  | "in_degree"
  | "out_degree"
  | "betweenness"
  | "dependency_span";

export interface WorkItemAnalysis {
  id: string;
  dependencyIds: readonly string[];
  dependentIds: readonly string[];
  level: number;
  topologicalIndex: number;
  isRoot: boolean;
  isLeaf: boolean;
  metrics: Readonly<Record<MetricKey, number>>;
}

export interface LongestDependencyChain {
  workItemIds: readonly string[];
  length: number;
  label: "longest_dependency_chain";
}

export interface PlanAnalysisSnapshot {
  plan: TaskGardenPlan;
  workItems: Readonly<Record<string, TaskGardenWorkItem>>;
  analysisById: Readonly<Record<string, WorkItemAnalysis>>;
  topologicalOrder: readonly string[];
  roots: readonly string[];
  leaves: readonly string[];
  laneOrder: readonly string[];
  longestDependencyChain: LongestDependencyChain;
  metricRanges: Readonly<Record<MetricKey, { min: number; max: number }>>;
}

export interface PlanAnalysisEngineService {
  build(plan: TaskGardenPlan): PlanAnalysisSnapshot;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const METRIC_KEYS: MetricKey[] = [
  "degree",
  "in_degree",
  "out_degree",
  "betweenness",
  "dependency_span",
];

export function createPlanAnalysisEngine(): PlanAnalysisEngineService {
  return {
    build(plan: TaskGardenPlan): PlanAnalysisSnapshot {
      // ------------------------------------------------------------------
      // 1. Work-item lookup map
      // ------------------------------------------------------------------
      const workItems: Record<string, TaskGardenWorkItem> = {};
      for (const item of plan.work_items) {
        workItems[item.id] = item;
      }

      // ------------------------------------------------------------------
      // 2. Build DirectedGraph
      //    Edge direction: dependency → dependent
      //    If X depends_on Y, add edge Y → X so that:
      //    - inDegree(X) = X.depends_on.length (direct dependencies)
      //    - outDegree(X) = number of items that depend on X (direct dependents)
      // ------------------------------------------------------------------
      const graph = new DirectedGraph();
      for (const item of plan.work_items) {
        graph.addNode(item.id);
      }
      for (const item of plan.work_items) {
        for (const dep of item.depends_on) {
          graph.addEdge(dep, item.id);
        }
      }

      // ------------------------------------------------------------------
      // 3. Lane order — preserve plan-authored ordering
      // ------------------------------------------------------------------
      const laneOrder = plan.lanes.map((l) => l.id);

      // ------------------------------------------------------------------
      // 4. Topological sort (graphology-dag requires DAG — validated upstream)
      // ------------------------------------------------------------------
      const topologicalOrder = topologicalSort(graph);

      // Build index map to avoid O(n) indexOf per item later
      const topoIndex: Record<string, number> = {};
      for (let i = 0; i < topologicalOrder.length; i++) {
        topoIndex[topologicalOrder[i]] = i;
      }

      // ------------------------------------------------------------------
      // 5. Compute levels (topological depth = longest path from any root)
      //    Process in topological order so predecessors are always resolved.
      // ------------------------------------------------------------------
      const levels: Record<string, number> = {};
      // bestPredecessor tracks which predecessor gave the maximum level,
      // enabling longest-chain tracing later.
      const bestPredecessor: Record<string, string | null> = {};

      for (const nodeId of topologicalOrder) {
        const preds = graph.inNeighbors(nodeId);
        if (preds.length === 0) {
          levels[nodeId] = 0;
          bestPredecessor[nodeId] = null;
        } else {
          let maxLevel = -1;
          let best: string | null = null;
          for (const pred of preds) {
            if (levels[pred] > maxLevel) {
              maxLevel = levels[pred];
              best = pred;
            }
          }
          levels[nodeId] = maxLevel + 1;
          bestPredecessor[nodeId] = best;
        }
      }

      // ------------------------------------------------------------------
      // 6. Roots and leaves
      // ------------------------------------------------------------------
      const roots: string[] = [];
      const leaves: string[] = [];
      for (const item of plan.work_items) {
        if (graph.inDegree(item.id) === 0) roots.push(item.id);
        if (graph.outDegree(item.id) === 0) leaves.push(item.id);
      }

      // ------------------------------------------------------------------
      // 7. Betweenness centrality (normalized, unweighted)
      // ------------------------------------------------------------------
      const betweenness = betweennessCentrality(graph, {
        normalized: true,
        getEdgeWeight: null,
      });

      // ------------------------------------------------------------------
      // 8. Max downstream depth per node — needed for dependency_span
      //    Process in reverse topological order so successors are resolved first.
      //    maxDownstreamDepth[n] = maximum level reachable from n (inclusive of n).
      //    dependency_span = maxDownstreamDepth[n] - level[n]
      // ------------------------------------------------------------------
      const maxDownstreamDepth: Record<string, number> = {};
      for (let i = topologicalOrder.length - 1; i >= 0; i--) {
        const nodeId = topologicalOrder[i];
        const succs = graph.outNeighbors(nodeId);
        if (succs.length === 0) {
          maxDownstreamDepth[nodeId] = levels[nodeId];
        } else {
          let max = -1;
          for (const s of succs) {
            if (maxDownstreamDepth[s] > max) max = maxDownstreamDepth[s];
          }
          maxDownstreamDepth[nodeId] = max;
        }
      }

      // ------------------------------------------------------------------
      // 9. Build WorkItemAnalysis for each item
      // ------------------------------------------------------------------
      const analysisById: Record<string, WorkItemAnalysis> = {};
      for (const item of plan.work_items) {
        const id = item.id;
        const level = levels[id];
        analysisById[id] = {
          id,
          dependencyIds: item.depends_on,
          dependentIds: graph.outNeighbors(id),
          level,
          topologicalIndex: topoIndex[id],
          isRoot: graph.inDegree(id) === 0,
          isLeaf: graph.outDegree(id) === 0,
          metrics: {
            degree: graph.degree(id),
            in_degree: graph.inDegree(id),
            out_degree: graph.outDegree(id),
            betweenness: betweenness[id] ?? 0,
            dependency_span: maxDownstreamDepth[id] - level,
          },
        };
      }

      // ------------------------------------------------------------------
      // 10. Metric ranges (min/max per MetricKey for normalization)
      // ------------------------------------------------------------------
      const metricRanges = {} as Record<
        MetricKey,
        { min: number; max: number }
      >;
      for (const key of METRIC_KEYS) {
        metricRanges[key] = {
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
        };
      }

      for (const analysis of Object.values(analysisById)) {
        for (const key of METRIC_KEYS) {
          const v = analysis.metrics[key];
          if (v < metricRanges[key].min) metricRanges[key].min = v;
          if (v > metricRanges[key].max) metricRanges[key].max = v;
        }
      }

      // Clamp Infinity for plans where all items share the same value
      for (const key of METRIC_KEYS) {
        if (!Number.isFinite(metricRanges[key].min)) {
          metricRanges[key] = { min: 0, max: 0 };
        }
      }

      // ------------------------------------------------------------------
      // 11. Longest dependency chain
      //     Find the node with the maximum level, then trace back through
      //     bestPredecessor pointers to reconstruct the full chain.
      // ------------------------------------------------------------------
      let maxLevelNode: string | null = null;
      let maxLevelValue = -1;
      for (const item of plan.work_items) {
        if (levels[item.id] > maxLevelValue) {
          maxLevelValue = levels[item.id];
          maxLevelNode = item.id;
        }
      }

      const chainIds: string[] = [];
      let current: string | null = maxLevelNode;
      while (current !== null) {
        chainIds.unshift(current);
        current = bestPredecessor[current];
      }

      const longestDependencyChain: LongestDependencyChain = {
        workItemIds: chainIds,
        length: chainIds.length,
        label: "longest_dependency_chain",
      };

      return {
        plan,
        workItems,
        analysisById,
        topologicalOrder,
        roots,
        leaves,
        laneOrder,
        longestDependencyChain,
        metricRanges,
      };
    },
  };
}

/** Singleton backed by the full Graphology implementation. */
export const planAnalysisEngine: PlanAnalysisEngineService =
  createPlanAnalysisEngine();
