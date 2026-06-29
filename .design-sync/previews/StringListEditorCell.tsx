import { StringListEditorCell } from "task-garden";

// StringListEditorCell edits a work item's free-text list (deliverables or
// reuse_candidates): each row is an editable parchment chip with a remove ×, plus
// a dashed "Add" row. The `field` prop drives the kicker label. patchPlan omitted =
// the static read/display state. Sweep filled vs empty and both fields; distinct
// workItemIds keep each cell's draft state isolated.

export function Deliverables() {
  return (
    <div style={{ width: 340 }}>
      <StringListEditorCell
        workItemId="list-graph-canvas"
        field="deliverables"
        committedValue={[
          "PlanGraphCanvas.tsx",
          "WorkItemNode.tsx",
          "plan-graph-canvas.helpers.ts",
        ]}
        baseRevision={6}
      />
    </div>
  );
}

export function ReuseCandidates() {
  return (
    <div style={{ width: 340 }}>
      <StringListEditorCell
        workItemId="list-flow-projection"
        field="reuse_candidates"
        committedValue={[
          "flow-projection-service.ts",
          "graphology layout adapter",
        ]}
        baseRevision={4}
      />
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ width: 340 }}>
      <StringListEditorCell
        workItemId="list-estimate-overlays"
        field="deliverables"
        committedValue={[]}
        baseRevision={3}
      />
    </div>
  );
}
