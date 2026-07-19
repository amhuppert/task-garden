import { useCallback, useId, useRef } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { EstimateUnit } from "../../../lib/plan/task-garden-plan.schema";
import { FieldShell } from "../ui/FieldShell";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

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
  const key = draftKeys.workItemField(workItemId, "estimate");
  // Draft space encodes "no estimate" as 0; buildPatch maps it back to null.
  const committed = committedValue ?? 0;
  const inputId = useId();

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

  const stepBy = (delta: number) => {
    setDraft(Math.max(0, Math.round((value + delta) * 10) / 10));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === "") {
      setDraft(0);
      return;
    }
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    setDraft(Math.max(0, next));
  };

  // preventDefault suppresses the browser's own spin so arrows step exactly
  // like the +/- buttons (same rounding and 0-clamp, defined behavior from the
  // empty/null state) instead of double-stepping.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      stepBy(STEP);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      stepBy(-STEP);
    }
  };

  // Commit only when focus leaves the whole stepper chrome, so moving between
  // the input and the +/- buttons never triggers a write.
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    void commit();
  };

  const displayValue = committedValue === null && !isDirty ? "" : value;

  return (
    <FieldShell
      label="Estimate"
      htmlFor={inputId}
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <div
        ref={containerRef}
        onBlur={handleBlur}
        className="flex items-stretch overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface focus-within:border-moss"
      >
        <button
          type="button"
          aria-label="Decrease estimate"
          // APG spinbutton: the input is the only tab stop (arrow keys step
          // there); the buttons stay pointer/programmatic targets.
          tabIndex={-1}
          // aria-disabled + click guard instead of native disabled: disabling
          // the focused button mid-interaction would drop focus to <body>.
          aria-disabled={value === 0}
          onClick={() => {
            if (value === 0) return;
            stepBy(-STEP);
          }}
          className="w-9 border-r border-border font-mono text-base font-semibold text-muted-foreground transition-colors hover:bg-surface-muted aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent"
        >
          −
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1 py-2">
          <input
            id={inputId}
            type="number"
            min={0}
            step={STEP}
            placeholder="—"
            data-testid="estimate-value"
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-14 [appearance:textfield] bg-transparent text-right font-mono text-base font-semibold text-foreground outline-none placeholder:text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            {estimateUnit}
          </span>
        </div>
        <button
          type="button"
          aria-label="Increase estimate"
          tabIndex={-1}
          onClick={() => stepBy(STEP)}
          className="w-9 border-l border-border font-mono text-base font-semibold text-muted-foreground transition-colors hover:bg-surface-muted"
        >
          +
        </button>
      </div>
    </FieldShell>
  );
}
