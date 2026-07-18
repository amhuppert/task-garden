import { useCallback } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import { formatValue } from "../plan-details-panel.helpers";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

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
  const key = `work_item:${workItemId}:value`;

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
    <label className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Value</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="value-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 focus-within:border-moss">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
          V
        </span>
        <input
          type="number"
          min={0}
          step={1}
          aria-label="Value"
          data-testid="value-input"
          value={Number.isInteger(value) ? value : formatValue(value)}
          onChange={handleChange}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-base font-semibold text-foreground outline-none"
        />
      </div>
    </label>
  );
}
