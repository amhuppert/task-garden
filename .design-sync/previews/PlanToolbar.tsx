import { PlanToolbar } from "task-garden";
import { samplePlan } from "../preview-fixtures";

// PlanToolbar is the left explorer rail: new-item action, debounced search,
// dense lane / status / tag filter lists (with per-option item counts), and
// the scope / color / schedule / size dropdown selects (each with a ⓘ info
// modal). The selects read the live display + explorer stores; the
// lane/status/tag sets come in as props.

const availableFilters = {
  lanes: samplePlan.lanes.map((lane, i) => ({ lane, count: i + 2 })),
  statuses: (
    ["ready", "in_progress", "blocked", "done", "planned"] as const
  ).map((status, i) => ({ status, count: i + 1 })),
  tags: ["core", "schema", "graph", "canvas", "editing", "schedule"].map(
    (tag, i) => ({ tag, count: (i % 3) + 1 }),
  ),
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
