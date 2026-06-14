import { useCallback, useRef } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type { EstimateUnit } from "../../../lib/plan/task-garden-plan.schema";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

export interface EstimateStepperCellProps {
  workItemId: string;
  committedValue: number | null;
  /** Plan-level estimate unit, shown as the stepper's unit label. */
  estimateUnit: EstimateUnit;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

const STEP = 0.5;

export function EstimateStepperCell({
  workItemId,
  committedValue,
  estimateUnit,
  baseRevision,
  patchPlan,
}: EstimateStepperCellProps) {
  const key = `work_item:${workItemId}:estimate`;
  const committed = committedValue ?? 0;

  const buildPatch = useCallback(
    (next: number) => {
      if (next <= 0) {
        return patchTargets.workItemEstimate(workItemId, null);
      }
      return patchTargets.workItemEstimate(workItemId, next);
    },
    [workItemId],
  );

  const { value, isDirty, setDraft, commit } = useFieldDraft<number>({
    key,
    committedValue: committed,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMinus = () => {
    const next = Math.max(0, Math.round((value - STEP) * 10) / 10);
    setDraft(next);
  };

  const handlePlus = () => {
    const next = Math.round((value + STEP) * 10) / 10;
    setDraft(next);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    void commit();
  };

  const displayValue =
    committedValue === null && !isDirty ? "—" : value.toFixed(1);

  return (
    <div className="flex flex-col gap-1" onBlur={handleBlur} ref={containerRef}>
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Estimate</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="estimate-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div className="flex items-stretch overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
        <button
          type="button"
          aria-label="Decrease estimate"
          onClick={handleMinus}
          disabled={value === 0}
          className="w-9 border-r border-border font-mono text-base font-semibold text-muted-foreground transition-colors hover:bg-surface-muted disabled:cursor-default disabled:opacity-40"
        >
          −
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1 py-2">
          <span
            data-testid="estimate-value"
            className="font-mono text-base font-semibold text-foreground"
          >
            {displayValue}
          </span>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            {estimateUnit}
          </span>
        </div>
        <button
          type="button"
          aria-label="Increase estimate"
          onClick={handlePlus}
          className="w-9 border-l border-border font-mono text-base font-semibold text-muted-foreground transition-colors hover:bg-surface-muted"
        >
          +
        </button>
      </div>
    </div>
  );
}
