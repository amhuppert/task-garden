import { TagEditorCell } from "task-garden";

// TagEditorCell renders the work item's tags as removable "#tag" microchips with
// a "Tags" kicker, an inline "add tag…" input, and a save indicator. committedValue
// is the readonly tag array. patchPlan omitted = the static read/display state.
// Sweep the tag-count axis; distinct workItemIds keep each cell's draft state isolated.

export function ManyTags() {
  return (
    <div style={{ width: 340 }}>
      <TagEditorCell
        workItemId="tags-graph-canvas"
        committedValue={["graph", "canvas", "performance", "layout"]}
        baseRevision={5}
      />
    </div>
  );
}

export function SingleTag() {
  return (
    <div style={{ width: 340 }}>
      <TagEditorCell
        workItemId="tags-plan-schema"
        committedValue={["schema"]}
        baseRevision={8}
      />
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ width: 340 }}>
      <TagEditorCell
        workItemId="tags-polish-pass"
        committedValue={[]}
        baseRevision={2}
      />
    </div>
  );
}
