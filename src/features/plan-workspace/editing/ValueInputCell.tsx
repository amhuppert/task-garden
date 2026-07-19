import { useCallback, useId } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { FieldShell } from "../ui/FieldShell";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

export interface ValueInputCellProps {
  workItemId: string;
  committedValue: number;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

export function ValueInputCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: ValueInputCellProps) {
  const key = draftKeys.workItemField(workItemId, "value");
  const inputId = useId();

  const buildPatch = useCallback(
    (next: number) => patchTargets.workItemValue(workItemId, next),
    [workItemId],
  );

  const { value, isDirty, setDraft, commit, rollback } = useFieldDraft<number>({
    key,
    committedValue,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    setDraft(Math.max(0, next));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      rollback();
      event.currentTarget.blur();
    }
  };

  return (
    <FieldShell
      label="Value"
      htmlFor={inputId}
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 focus-within:border-moss">
        <span
          aria-hidden="true"
          className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground"
        >
          V
        </span>
        <input
          id={inputId}
          type="number"
          min={0}
          step={1}
          data-testid="value-input"
          value={value}
          onChange={handleChange}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-base font-semibold text-foreground outline-none"
        />
      </div>
    </FieldShell>
  );
}
