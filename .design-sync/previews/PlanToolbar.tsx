import { PlanToolbar } from "task-garden";
import { samplePlan } from "../preview-fixtures";

// PlanToolbar is the left explorer rail: new-item action, debounced search, lane
// / status / tag filter chips, scope selector, and the color / schedule / size
// encoding controls (each with a ⓘ info modal). The encoding/scope chips read
// the live display + explorer stores; the lane/status/tag sets come in as props.

const availableFilters = {
  lanes: samplePlan.lanes,
  statuses: ["ready", "in_progress", "blocked", "done", "planned"] as const,
  tags: ["core", "schema", "graph", "canvas", "editing", "schedule"],
};

export function Default() {
  return (
    <div style={{ width: 300 }}>
      <PlanToolbar
        availableFilters={availableFilters}
        projectionSummary={{
          hiddenNodeCount: 0,
          selectedNodeFilteredOut: false,
        }}
        baseRevision={7}
        onNewItem={() => {}}
      />
    </div>
  );
}

export function WithHiddenItems() {
  return (
    <div style={{ width: 300 }}>
      <PlanToolbar
        availableFilters={availableFilters}
        projectionSummary={{
          hiddenNodeCount: 3,
          selectedNodeFilteredOut: true,
        }}
        baseRevision={7}
        onNewItem={() => {}}
      />
    </div>
  );
}
