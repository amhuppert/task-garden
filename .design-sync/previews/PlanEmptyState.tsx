import { PlanEmptyState } from "task-garden";

// PlanEmptyState is the valid-plan, zero-results state: a quiet botanical mark,
// the projection-supplied reason, a hint line, and an optional clear-filters
// action. Cells sweep with-action vs message-only.

export function FilteredOut() {
  return (
    <div style={{ width: 420, padding: 16 }}>
      <PlanEmptyState
        message="No work items match the active filters."
        onClearFilters={() => {}}
      />
    </div>
  );
}

export function NoSearchResults() {
  return (
    <div style={{ width: 420, padding: 16 }}>
      <PlanEmptyState message={'No work items match "infrastructure".'} />
    </div>
  );
}
