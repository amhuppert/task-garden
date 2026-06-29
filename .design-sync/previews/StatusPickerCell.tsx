import { StatusPickerCell } from "task-garden";

// StatusPickerCell renders a labelled status chip with a botanical accent dot and
// a popover picker (closed in static capture). Sweep the status axis — distinct
// workItemIds keep each cell's draft/save state isolated.

export function Planned() {
  return (
    <div style={{ width: 300 }}>
      <StatusPickerCell
        workItemId="design-tokens-planned"
        committedValue="planned"
        baseRevision={3}
      />
    </div>
  );
}

export function Ready() {
  return (
    <div style={{ width: 300 }}>
      <StatusPickerCell
        workItemId="auth-api-ready"
        committedValue="ready"
        baseRevision={3}
      />
    </div>
  );
}

export function InProgress() {
  return (
    <div style={{ width: 300 }}>
      <StatusPickerCell
        workItemId="graph-canvas-inprogress"
        committedValue="in_progress"
        baseRevision={5}
      />
    </div>
  );
}

export function Blocked() {
  return (
    <div style={{ width: 300 }}>
      <StatusPickerCell
        workItemId="export-blocked"
        committedValue="blocked"
        baseRevision={2}
      />
    </div>
  );
}

export function Done() {
  return (
    <div style={{ width: 300 }}>
      <StatusPickerCell
        workItemId="schema-validation-done"
        committedValue="done"
        baseRevision={8}
      />
    </div>
  );
}
