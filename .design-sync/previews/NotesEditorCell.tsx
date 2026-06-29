import { NotesEditorCell } from "task-garden";

// NotesEditorCell renders optional multi-line notes in a parchment-surface
// contentEditable box with a "Notes" kicker, an OPTIONAL badge, and a save
// indicator. committedValue is string | null (null = the empty optional state).
// patchPlan omitted = the static read/display state. Distinct workItemIds keep
// each cell's draft/save store state isolated.

export function ContextNotes() {
  return (
    <div style={{ width: 320 }}>
      <NotesEditorCell
        workItemId="notes-canvas"
        committedValue={
          "Wait on flow-projection before wiring focus mode.\nLane bands must read from the same palette as the legend."
        }
        baseRevision={5}
      />
    </div>
  );
}

export function DecisionLog() {
  return (
    <div style={{ width: 320 }}>
      <NotesEditorCell
        workItemId="notes-schema"
        committedValue={
          "Chose Zod over a hand-rolled validator for clearer cycle errors."
        }
        baseRevision={8}
      />
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ width: 320 }}>
      <NotesEditorCell
        workItemId="notes-overlay"
        committedValue={null}
        baseRevision={3}
      />
    </div>
  );
}
