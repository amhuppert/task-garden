import { WorkItemNode } from "task-garden";
import { nodeData } from "../preview-fixtures";

// WorkItemNode is the flagship graph card: lane kicker, title, status dot +
// label, and a stack of micro-chips (critical-path step, estimate, value,
// remaining-chain). Color/size/overlay encodings are canvas-context-driven, so
// these static cells sweep the data-driven axis: status, criticality, selection,
// and the presence of an estimate. Each node is wrapped per the node convention.

const wrap = { width: 240, padding: 12 } as const;

const metric = (remaining_days: number) => ({
  value: 0,
  value_per_effort: 0,
  estimate_days: 0,
  remaining_days,
  downstream_effort_days: 0,
  degree: 0,
  betweenness: 0,
  dependency_span: 0,
});

export function CriticalInProgress() {
  return (
    <div style={wrap}>
      <WorkItemNode
        data={nodeData({
          title: "Interactive graph canvas",
          laneLabel: "Graph",
          laneColor: "#c2a35a",
          status: "in_progress",
          value: 100,
          estimate: 6,
          isOnCriticalPath: true,
          isSelected: true,
          metricSummary: metric(9),
        })}
      />
    </div>
  );
}

export function ReadyWithEstimate() {
  return (
    <div style={wrap}>
      <WorkItemNode
        data={nodeData({
          id: "estimate-overlays",
          title: "Estimate & schedule overlays",
          laneLabel: "Graph",
          laneColor: "#c2a35a",
          status: "ready",
          value: 60,
          estimate: 3,
          isOnCriticalPath: false,
          criticalPathOrder: null,
          isSelected: false,
          metricSummary: metric(3),
        })}
      />
    </div>
  );
}

export function BlockedNoEstimate() {
  return (
    <div style={wrap}>
      <WorkItemNode
        data={nodeData({
          id: "inline-editing",
          title: "Inline write-through editing",
          laneLabel: "Editing",
          laneColor: "#b06a52",
          status: "blocked",
          value: 75,
          estimate: null,
          isOnCriticalPath: false,
          criticalPathOrder: null,
          isSelected: false,
          metricSummary: metric(0),
        })}
      />
    </div>
  );
}

export function DoneFoundation() {
  return (
    <div style={wrap}>
      <WorkItemNode
        data={nodeData({
          id: "plan-schema",
          title: "Plan schema & DAG validation",
          laneLabel: "Foundation",
          laneColor: "#7c9473",
          status: "done",
          value: 90,
          estimate: 3,
          isOnCriticalPath: false,
          criticalPathOrder: null,
          isSelected: false,
          metricSummary: metric(0),
        })}
      />
    </div>
  );
}
