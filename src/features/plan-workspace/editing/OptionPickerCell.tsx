import { useCallback, useId } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { FieldShell } from "../ui/FieldShell";
import { Select, type SelectOption } from "../ui/Select";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

export interface OptionPickerCellProps {
  workItemId: string;
  field: "lane" | "status";
  /** Visible kicker label ("Lane", "Status"). */
  label: string;
  /** Accessible name for the picker popup ("Set lane", "Set status"). */
  ariaLabel: string;
  /** Stamped on the picker trigger (lane-picker-chip / status-picker-chip). */
  testId: string;
  options: SelectOption[];
  committedValue: string;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

/**
 * An editable work-item field whose value is one of a small closed set:
 * a labelled cell (FieldShell) around a Select picker, wired to the draft
 * store so choosing an option immediately commits a `work_item.field` patch.
 */
export function OptionPickerCell({
  workItemId,
  field,
  label,
  ariaLabel,
  testId,
  options,
  committedValue,
  baseRevision,
  patchPlan,
}: OptionPickerCellProps) {
  const key = draftKeys.workItemField(workItemId, field);
  const labelId = useId();

  const buildPatch = useCallback(
    (next: string) => patchTargets.workItemField(workItemId, field, next),
    [workItemId, field],
  );

  const { value, isDirty, setDraft, commit } = useFieldDraft<string>({
    key,
    committedValue,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  // Select renders an empty trigger for values it has no option for (e.g. a
  // work item pointing at a deleted lane) — fall back to the first option.
  const knownValue = options.some((option) => option.value === value)
    ? value
    : (options[0]?.value ?? value);

  const handleValueChange = (next: string) => {
    setDraft(next);
    queueMicrotask(() => {
      void commit();
    });
  };

  return (
    <FieldShell
      label={label}
      labelId={labelId}
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <Select
        value={knownValue}
        onValueChange={handleValueChange}
        options={options}
        ariaLabel={ariaLabel}
        labelId={labelId}
        testId={testId}
      />
    </FieldShell>
  );
}
