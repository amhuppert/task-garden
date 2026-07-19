import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import type { SelectOption } from "../ui/Select";
import { OptionPickerCell } from "./OptionPickerCell";

export interface LanePickerCellProps {
  workItemId: string;
  committedValue: string;
  baseRevision: number;
  lanes: readonly TaskGardenLane[];
  patchPlan?: PatchPlanFn;
}

/** Lane picker for a work item — an OptionPickerCell over the plan's lanes. */
export function LanePickerCell({ lanes, ...rest }: LanePickerCellProps) {
  const options: SelectOption[] = lanes.map((lane) => ({
    value: lane.id,
    label: lane.label,
    swatchColor: lane.color ?? "var(--color-iron)",
    swatchShape: "bar",
  }));

  return (
    <OptionPickerCell
      field="lane"
      label="Lane"
      ariaLabel="Set lane"
      testId="lane-picker-chip"
      options={options}
      {...rest}
    />
  );
}
