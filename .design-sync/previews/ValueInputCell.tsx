import { ValueInputCell } from "task-garden";

// ValueInputCell renders the work item value as a mono numeric input on a
// parchment surface, prefixed with a "V" glyph and a "Value" kicker. patchPlan
// omitted = the static read/display state. Sweep representative value weights;
// distinct workItemIds keep each cell's draft/save store state isolated.

export function HighValue() {
  return (
    <div style={{ width: 320 }}>
      <ValueInputCell
        workItemId="value-canvas"
        committedValue={100}
        baseRevision={5}
      />
    </div>
  );
}

export function MidValue() {
  return (
    <div style={{ width: 320 }}>
      <ValueInputCell
        workItemId="value-overlay"
        committedValue={60}
        baseRevision={3}
      />
    </div>
  );
}

export function LowValue() {
  return (
    <div style={{ width: 320 }}>
      <ValueInputCell
        workItemId="value-polish"
        committedValue={25}
        baseRevision={2}
      />
    </div>
  );
}
