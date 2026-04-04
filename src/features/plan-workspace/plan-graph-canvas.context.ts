import { createContext } from "react";
import type { MetricRanges } from "./plan-graph-canvas.helpers";

/** Provides visible-node metric min/max ranges to WorkItemNode for encoding normalization. */
export const GraphMetricRangesContext = createContext<MetricRanges>({});

export interface GraphScheduleOverlayContextValue {
  slackRange: { min: number; max: number } | null;
}

/** Provides visible-node slack range to graph nodes for schedule overlay styling. */
export const GraphScheduleOverlayContext =
  createContext<GraphScheduleOverlayContextValue>({
    slackRange: null,
  });
