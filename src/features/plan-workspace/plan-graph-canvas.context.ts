import { createContext } from "react";
import type {
  ColorEncodingMode,
  ScheduleOverlayMode,
  SizeEncodingMode,
} from "./plan-display.store";
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

export interface GraphDisplayModeContextValue {
  colorMode: ColorEncodingMode;
  sizeMode: SizeEncodingMode;
  scheduleOverlay: ScheduleOverlayMode;
}

/**
 * Provides the current display-encoding modes to graph nodes.
 *
 * Lifts the per-node Zustand subscriptions into a single parent subscription so
 * nodes can be memoized: store updates re-render the canvas wrapper which
 * propagates new context, and nodes that wrap themselves in React.memo only
 * re-render when their own data changes or the context value changes.
 */
export const GraphDisplayModeContext =
  createContext<GraphDisplayModeContextValue>({
    colorMode: "default",
    sizeMode: "uniform",
    scheduleOverlay: "none",
  });
