import { EditableTitleCell } from "task-garden";

// EditableTitleCell renders the work item title as an inline contentEditable
// field with a "Title" kicker and a save indicator. patchPlan omitted = the
// static read/display state. Sweep realistic titles of varying length; distinct
// workItemIds keep each cell's draft/save store state isolated.

export function ShortTitle() {
  return (
    <div style={{ width: 320 }}>
      <EditableTitleCell
        workItemId="title-schema"
        committedValue="Plan schema & DAG validation"
        baseRevision={8}
      />
    </div>
  );
}

export function DescriptiveTitle() {
  return (
    <div style={{ width: 320 }}>
      <EditableTitleCell
        workItemId="title-canvas"
        committedValue="Interactive graph canvas with lane bands"
        baseRevision={5}
      />
    </div>
  );
}

export function TerseTitle() {
  return (
    <div style={{ width: 320 }}>
      <EditableTitleCell
        workItemId="title-overlay"
        committedValue="Critical-path overlay"
        baseRevision={3}
      />
    </div>
  );
}

export function WrappingTitle() {
  return (
    <div style={{ width: 320 }}>
      <EditableTitleCell
        workItemId="title-writethrough"
        committedValue="Inline write-through editing for titles, status, and estimates"
        baseRevision={2}
      />
    </div>
  );
}
