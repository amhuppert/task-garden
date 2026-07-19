import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import {
  ALL_STATUSES,
  getStatusLabel,
} from "../../../lib/plan/status-presentation";
import type { TaskGardenStatus } from "../../../lib/plan/task-garden-plan.schema";
import { getStatusAccentColor } from "../plan-graph-canvas.helpers";
import type { SelectOption } from "../ui/Select";
import { OptionPickerCell } from "./OptionPickerCell";

export interface StatusPickerCellProps {
  workItemId: string;
  committedValue: TaskGardenStatus;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

const STATUS_OPTIONS: SelectOption[] = ALL_STATUSES.map((status) => ({
  value: status,
  label: getStatusLabel(status),
  swatchColor: getStatusAccentColor(status),
  swatchShape: "dot",
}));

/** Status picker for a work item — an OptionPickerCell over every plan status. */
export function StatusPickerCell(props: StatusPickerCellProps) {
  return (
    <OptionPickerCell
      field="status"
      label="Status"
      ariaLabel="Set status"
      testId="status-picker-chip"
      options={STATUS_OPTIONS}
      {...props}
    />
  );
}
