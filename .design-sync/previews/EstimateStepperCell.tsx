import { EstimateStepperCell } from "task-garden";

// EstimateStepperCell renders a −/+ stepper around a mono estimate value and a
// plan-level unit label, with an "Estimate" kicker and save indicator.
// committedValue is number | null (null renders an em dash). patchPlan omitted =
// the static read/display state. Sweep magnitudes, the unestimated state, and
// the alternate units; distinct workItemIds keep draft/save state isolated.

export function SmallEstimate() {
  return (
    <div style={{ width: 320 }}>
      <EstimateStepperCell
        workItemId="estimate-overlay"
        committedValue={1.5}
        estimateUnit="days"
        baseRevision={3}
      />
    </div>
  );
}

export function LargeEstimate() {
  return (
    <div style={{ width: 320 }}>
      <EstimateStepperCell
        workItemId="estimate-canvas"
        committedValue={6}
        estimateUnit="days"
        baseRevision={5}
      />
    </div>
  );
}

export function Unestimated() {
  return (
    <div style={{ width: 320 }}>
      <EstimateStepperCell
        workItemId="estimate-polish"
        committedValue={null}
        estimateUnit="days"
        baseRevision={2}
      />
    </div>
  );
}

export function PointsUnit() {
  return (
    <div style={{ width: 320 }}>
      <EstimateStepperCell
        workItemId="estimate-schema"
        committedValue={3}
        estimateUnit="points"
        baseRevision={8}
      />
    </div>
  );
}
