import { FieldSaveIndicator } from "task-garden";

// FieldSaveIndicator is a transient write-status pip that the editor cells place next
// to a field's kicker. It reads its phase from the edit.store keyed by `stateKey` and
// renders a pulsing "Saving" microchip, then a "Saved" microchip that auto-clears
// after ~1.4s, and otherwise renders nothing (the idle state). The store is module-
// internal and NOT a bundle export, so a static preview cannot seed the saving/saved
// phases — these cells show the honest idle render in its real placement: a field
// kicker with an empty indicator slot to its right. See learnings/ed-b.md.

export function IdleBesideTagsField() {
  return (
    <div style={{ width: 340 }}>
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Tags</span>
        <FieldSaveIndicator stateKey="work_item:graph-canvas:tags" />
      </div>
    </div>
  );
}

export function IdleBesideLaneField() {
  return (
    <div style={{ width: 340 }}>
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Label</span>
        <FieldSaveIndicator stateKey="lane:foundation:label" />
      </div>
    </div>
  );
}
