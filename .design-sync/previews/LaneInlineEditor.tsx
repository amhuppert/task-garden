import { LaneInlineEditor } from "task-garden";
import { samplePlan } from "../preview-fixtures";

// LaneInlineEditor edits a single lane's scalar fields — label (required),
// description (optional), and color (optional, hex) — as a stacked set of kicker-
// labelled inputs on parchment surfaces, each with its own save indicator. The lane
// comes from the shared sample plan. patchPlan omitted = the static read/display state.
// Sweep a fully-populated lane against a sparse one that surfaces the placeholders.

const lane = (id: string) =>
  samplePlan.lanes.find((l) => l.id === id) ?? samplePlan.lanes[0];

export function FoundationLane() {
  return (
    <div style={{ width: 340 }}>
      <LaneInlineEditor
        laneId="foundation"
        committedLane={lane("foundation")}
        baseRevision={8}
      />
    </div>
  );
}

export function EditingLane() {
  return (
    <div style={{ width: 340 }}>
      <LaneInlineEditor
        laneId="editing"
        committedLane={lane("editing")}
        baseRevision={5}
      />
    </div>
  );
}

export function SparseLane() {
  return (
    <div style={{ width: 340 }}>
      <LaneInlineEditor
        laneId="polish"
        committedLane={lane("polish")}
        baseRevision={2}
      />
    </div>
  );
}
