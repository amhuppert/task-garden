import { STATUS_LIFECYCLE_ORDER } from "../plan/status-presentation";
import type {
  TaskGardenStatus,
  TaskGardenWorkItem,
} from "../plan/task-garden-plan.schema";
import type {
  PlanAnalysisSnapshot,
  WorkItemAnalysis,
} from "./plan-analysis-engine";

// ---------------------------------------------------------------------------
// Ready-work candidates
// ---------------------------------------------------------------------------

export interface ReadyCandidate {
  item: TaskGardenWorkItem;
  effort: number | null;
  valueDensity: number | null;
}

/**
 * A work item is ready when it is explicitly marked ready, or when it is
 * planned and every dependency is done. In-progress items are excluded: they
 * are already picked up, not waiting in the queue.
 */
export function isReadyToWork(
  item: TaskGardenWorkItem,
  snapshot: PlanAnalysisSnapshot,
): boolean {
  if (
    item.status === "blocked" ||
    item.status === "done" ||
    item.status === "future" ||
    item.status === "in_progress"
  ) {
    return false;
  }
  if (item.status === "ready") return true;
  return item.depends_on.every(
    (depId) => snapshot.workItems[depId]?.status === "done",
  );
}

export function buildReadyCandidates(
  snapshot: PlanAnalysisSnapshot,
): ReadyCandidate[] {
  return Object.values(snapshot.workItems)
    .filter((item) => isReadyToWork(item, snapshot))
    .map((item) => {
      const effort = item.estimate ?? null;
      return {
        item,
        effort,
        valueDensity:
          effort !== null && effort > 0 ? item.value / effort : null,
      };
    });
}

// Float tolerance so effectively-equal scores fall through to the tiebreaker.
const SCORE_EPSILON = 1e-9;

function compareByValue(a: ReadyCandidate, b: ReadyCandidate): number {
  const valueDiff = b.item.value - a.item.value;
  if (Math.abs(valueDiff) > SCORE_EPSILON) return valueDiff;
  return a.item.title.localeCompare(b.item.title);
}

function compareByValueDensity(a: ReadyCandidate, b: ReadyCandidate): number {
  const aDensity = a.valueDensity ?? Number.NEGATIVE_INFINITY;
  const bDensity = b.valueDensity ?? Number.NEGATIVE_INFINITY;
  const densityDiff = bDensity - aDensity;
  if (Math.abs(densityDiff) > SCORE_EPSILON) return densityDiff;
  return compareByValue(a, b);
}

/** Highest authored value first; ties break alphabetically by title. */
export function rankReadyByValue(
  candidates: readonly ReadyCandidate[],
): ReadyCandidate[] {
  return [...candidates].sort(compareByValue);
}

/**
 * Highest value-per-effort first; candidates without an estimate sort last
 * (they have no density), then fall back to the value ranking.
 */
export function rankReadyByValueDensity(
  candidates: readonly ReadyCandidate[],
): ReadyCandidate[] {
  return [...candidates].sort(compareByValueDensity);
}

// ---------------------------------------------------------------------------
// Overview rollups
// ---------------------------------------------------------------------------

export interface StatusSegment {
  status: TaskGardenStatus;
  count: number;
}

export interface OverviewRollups {
  totalItems: number;
  laneCount: number;
  /** Non-empty statuses in canonical lifecycle order. */
  statusSegments: StatusSegment[];
  doneCount: number;
  donePercent: number;
  doneEffort: number;
  estimatedTotalEffort: number;
  /** Null when the plan has no estimated effort to measure against. */
  effortPercent: number | null;
}

export function buildOverviewRollups(
  snapshot: PlanAnalysisSnapshot,
): OverviewRollups {
  const items = Object.values(snapshot.workItems);
  const totalItems = items.length;

  const statusSegments = STATUS_LIFECYCLE_ORDER.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  })).filter((segment) => segment.count > 0);

  const doneCount = items.filter((item) => item.status === "done").length;
  const estimatedTotalEffort = items.reduce(
    (sum, item) => sum + (item.estimate ?? 0),
    0,
  );
  const doneEffort = items
    .filter((item) => item.status === "done")
    .reduce((sum, item) => sum + (item.estimate ?? 0), 0);

  return {
    totalItems,
    laneCount: snapshot.plan.lanes.length,
    statusSegments,
    doneCount,
    donePercent: totalItems > 0 ? (doneCount / totalItems) * 100 : 0,
    doneEffort,
    estimatedTotalEffort,
    effortPercent:
      estimatedTotalEffort > 0
        ? (doneEffort / estimatedTotalEffort) * 100
        : null,
  };
}

// ---------------------------------------------------------------------------
// Metric rankings
// ---------------------------------------------------------------------------

export interface RankedWorkItem {
  item: TaskGardenWorkItem;
  analysis: WorkItemAnalysis;
}

function pairWithAnalysis(snapshot: PlanAnalysisSnapshot): RankedWorkItem[] {
  const pairs: RankedWorkItem[] = [];
  for (const item of Object.values(snapshot.workItems)) {
    const analysis = snapshot.analysisById[item.id];
    if (analysis) pairs.push({ item, analysis });
  }
  return pairs;
}

/** Top structural bridges: betweenness descending, degree as tiebreaker. */
export function rankHighImportance(
  snapshot: PlanAnalysisSnapshot,
  limit: number,
): RankedWorkItem[] {
  return pairWithAnalysis(snapshot)
    .sort((a, b) => {
      const betweennessDiff =
        b.analysis.metrics.betweenness - a.analysis.metrics.betweenness;
      if (Math.abs(betweennessDiff) > SCORE_EPSILON) return betweennessDiff;
      return b.analysis.metrics.degree - a.analysis.metrics.degree;
    })
    .slice(0, limit);
}

/** Items gating the most downstream estimated effort; zero-effort gates excluded. */
export function rankUnlockedEffortLeaders(
  snapshot: PlanAnalysisSnapshot,
  limit: number,
): RankedWorkItem[] {
  return pairWithAnalysis(snapshot)
    .filter((pair) => pair.analysis.metrics.downstream_effort_days > 0)
    .sort(
      (a, b) =>
        b.analysis.metrics.downstream_effort_days -
        a.analysis.metrics.downstream_effort_days,
    )
    .slice(0, limit);
}

/** Most-connected items; ties keep topological order (stable sort). */
export function rankTopByDegree(
  snapshot: PlanAnalysisSnapshot,
  limit: number,
): RankedWorkItem[] {
  return snapshot.topologicalOrder
    .flatMap((id) => {
      const item = snapshot.workItems[id];
      const analysis = snapshot.analysisById[id];
      return item && analysis ? [{ item, analysis }] : [];
    })
    .sort((a, b) => b.analysis.metrics.degree - a.analysis.metrics.degree)
    .slice(0, limit);
}
