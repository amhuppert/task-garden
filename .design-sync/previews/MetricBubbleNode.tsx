import {
  GraphDisplayModeContext,
  GraphMetricRangesContext,
  GraphScheduleOverlayContext,
  MetricBubbleNode,
} from "task-garden";
import { nodeData } from "../preview-fixtures";

// MetricBubbleNode is a graph node whose DIAMETER encodes a chosen metric (sizeMode)
// and whose FILL encodes color (colorMode) — both read from the graph display-mode
// contexts. The contexts are bundle exports so this preview can supply rich, non-
// default values to the bundled node (a source-path import would be a different
// React instance). Each cell shows a small field of bubbles as it appears on canvas.

const metricRanges = {
  value: { min: 0, max: 100 },
  value_per_effort: { min: 0, max: 40 },
  estimate_days: { min: 0, max: 8 },
  remaining_days: { min: 0, max: 16 },
  downstream_effort_days: { min: 0, max: 14 },
  degree: { min: 0, max: 6 },
  betweenness: { min: 0, max: 1 },
  dependency_span: { min: 0, max: 4 },
};

// A complete metricSummary with one axis dialed in (nodeData replaces the whole
// metricSummary when overridden, so spell out every key).
const metrics = (over: Partial<Record<string, number>> = {}) => ({
  value: 60,
  value_per_effort: 15,
  estimate_days: 3,
  remaining_days: 8,
  downstream_effort_days: 6,
  degree: 3,
  betweenness: 0.4,
  dependency_span: 2,
  ...over,
});

type Mode = { colorMode?: string; sizeMode?: string; scheduleOverlay?: string };

function Field({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: 24 }}>
      <GraphDisplayModeContext.Provider
        value={{
          colorMode: mode.colorMode ?? "default",
          sizeMode: mode.sizeMode ?? "uniform",
          scheduleOverlay: mode.scheduleOverlay ?? "none",
        }}
      >
        <GraphMetricRangesContext.Provider value={metricRanges}>
          <GraphScheduleOverlayContext.Provider
            value={{ slackRange: { min: 0, max: 6 } }}
          >
            {children}
          </GraphScheduleOverlayContext.Provider>
        </GraphMetricRangesContext.Provider>
      </GraphDisplayModeContext.Provider>
    </div>
  );
}

// Size encodes downstream unlocked effort; color encodes status.
export function SizedByEffortColoredByStatus() {
  return (
    <Field mode={{ colorMode: "status", sizeMode: "downstream_effort_days" }}>
      <MetricBubbleNode
        data={nodeData({ status: "done", metricSummary: metrics({ downstream_effort_days: 2 }) })}
      />
      <MetricBubbleNode
        data={nodeData({ status: "in_progress", metricSummary: metrics({ downstream_effort_days: 6 }) })}
      />
      <MetricBubbleNode
        data={nodeData({ status: "blocked", metricSummary: metrics({ downstream_effort_days: 11 }) })}
      />
      <MetricBubbleNode
        data={nodeData({ status: "ready", metricSummary: metrics({ downstream_effort_days: 14 }) })}
      />
    </Field>
  );
}

// Size + color both encode value; critical-path overlay adds order badges + rings.
export function CriticalPathOverlay() {
  return (
    <Field mode={{ colorMode: "value", sizeMode: "value", scheduleOverlay: "critical_path" }}>
      <MetricBubbleNode
        data={nodeData({ value: 90, criticalPathOrder: 0, isOnCriticalPath: true, metricSummary: metrics({ value: 90 }) })}
      />
      <MetricBubbleNode
        data={nodeData({ value: 100, criticalPathOrder: 1, isOnCriticalPath: true, metricSummary: metrics({ value: 100 }) })}
      />
      <MetricBubbleNode
        data={nodeData({ value: 60, criticalPathOrder: 2, isOnCriticalPath: true, metricSummary: metrics({ value: 60 }) })}
      />
    </Field>
  );
}

// Focus vs context dimming, with metric-sized bubbles.
export function FocusVsContext() {
  return (
    <Field mode={{ colorMode: "status", sizeMode: "value" }}>
      <MetricBubbleNode
        data={nodeData({ status: "in_progress", visibilityRole: "focus", metricSummary: metrics({ value: 100 }) })}
      />
      <MetricBubbleNode
        data={nodeData({ status: "planned", visibilityRole: "context", metricSummary: metrics({ value: 40 }) })}
      />
    </Field>
  );
}
