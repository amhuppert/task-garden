import { LanePickerCell } from "task-garden";
import { samplePlan } from "../preview-fixtures";

// LanePickerCell renders the current lane as a parchment chip with the lane's
// color swatch, label, and a chevron opening a popover picker (closed in static
// capture). committedValue is a lane id resolved against the plan's lanes.
// patchPlan omitted = the static read/display state. Sweep the lane axis;
// distinct workItemIds keep each cell's draft/save state isolated.

export function FoundationLane() {
  return (
    <div style={{ width: 320 }}>
      <LanePickerCell
        workItemId="lane-schema"
        committedValue="foundation"
        baseRevision={8}
        lanes={samplePlan.lanes}
      />
    </div>
  );
}

export function GraphLane() {
  return (
    <div style={{ width: 320 }}>
      <LanePickerCell
        workItemId="lane-canvas"
        committedValue="graph"
        baseRevision={5}
        lanes={samplePlan.lanes}
      />
    </div>
  );
}

export function EditingLane() {
  return (
    <div style={{ width: 320 }}>
      <LanePickerCell
        workItemId="lane-writethrough"
        committedValue="editing"
        baseRevision={3}
        lanes={samplePlan.lanes}
      />
    </div>
  );
}

export function PolishLane() {
  return (
    <div style={{ width: 320 }}>
      <LanePickerCell
        workItemId="lane-polish"
        committedValue="polish"
        baseRevision={2}
        lanes={samplePlan.lanes}
      />
    </div>
  );
}
