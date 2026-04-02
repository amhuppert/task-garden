import { createContext } from "react";
import type { MetricRanges } from "./plan-graph-canvas.helpers";

/** Provides visible-node metric min/max ranges to WorkItemNode for encoding normalization. */
export const GraphMetricRangesContext = createContext<MetricRanges>({});
