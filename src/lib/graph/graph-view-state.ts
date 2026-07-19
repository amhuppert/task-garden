import type { TaskGardenStatus } from "../plan/task-garden-plan.schema";
import type { ColorEncodingMode, SizeEncodingMode } from "./metric-registry";

/**
 * View-state contracts consumed by the graph projection layer. The lib layer
 * owns these shapes so it never depends on feature-layer stores; the Zustand
 * stores in features/plan-workspace own the state and mutations and re-export
 * these types for their consumers.
 */

export type InsightMode = "overview" | "ready" | "ordering" | "metrics";

export type ScheduleOverlayMode = "none" | "critical_path" | "slack_heatmap";

export interface PlanDisplayStateValue {
  colorMode: ColorEncodingMode;
  sizeMode: SizeEncodingMode;
  insightMode: InsightMode;
  scheduleOverlay: ScheduleOverlayMode;
}

export type GraphScope = "all" | "upstream" | "downstream" | "chain";

export interface PlanExplorerStateValue {
  selectedWorkItemId: string | null;
  searchQuery: string;
  activeScope: GraphScope;
  laneIds: readonly string[];
  statuses: readonly TaskGardenStatus[];
  tags: readonly string[];
}
