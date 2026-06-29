import { DependencyEditorCell } from "task-garden";
import { samplePlan, snapshot } from "../preview-fixtures";

// DependencyEditorCell edits a work item's edges. In "upstream" mode it lists the
// committed dependencies as id+title chips (each removable) above a dashed
// "Link dependency…" button that opens a typeahead picker (closed in static capture).
// In "dependents" mode it shows the derived downstream items read-only, marked with a
// "Derived" badge and a "Branch new dependent…" affordance. allWorkItems + snapshot
// come from the shared sample plan. patchPlan omitted = the static read/display state.

export function UpstreamDependency() {
  return (
    <div style={{ width: 340 }}>
      <DependencyEditorCell
        workItemId="graph-canvas"
        committedValue={["flow-projection"]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={samplePlan.work_items}
        snapshot={snapshot}
      />
    </div>
  );
}

export function UpstreamMultiple() {
  return (
    <div style={{ width: 340 }}>
      <DependencyEditorCell
        workItemId="polish-pass"
        committedValue={["inline-editing", "estimate-overlays"]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={samplePlan.work_items}
        snapshot={snapshot}
      />
    </div>
  );
}

export function DependentsDerived() {
  return (
    <div style={{ width: 340 }}>
      <DependencyEditorCell
        workItemId="graph-canvas"
        committedValue={["inline-editing", "estimate-overlays"]}
        baseRevision={1}
        mode="dependents"
        allWorkItems={samplePlan.work_items}
        snapshot={snapshot}
      />
    </div>
  );
}
