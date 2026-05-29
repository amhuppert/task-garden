import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

export interface SummaryEditorCellProps {
  workItemId: string;
  committedValue: string;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

export function SummaryEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: SummaryEditorCellProps) {
  const key = `work_item:${workItemId}:summary`;

  const buildPatch = useCallback(
    (next: string) => patchTargets.workItemField(workItemId, "summary", next),
    [workItemId],
  );

  const { value, isDirty, setDraft, commit, rollback } = useFieldDraft<string>({
    key,
    committedValue,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Imperatively sync DOM textContent rather than rendering {value} as JSX
  // children. If we kept {value} in the children, React would reconcile the
  // text node on every keystroke (because setDraft updates the store, which
  // re-renders this component with a new draft value), nuking the user's
  // selection and snapping the caret back to position 0. useLayoutEffect
  // covers both initial mount and external committed-value changes when not
  // focused; while focused we leave the DOM alone so the user can type.
  useLayoutEffect(() => {
    if (focused) return;
    const el = ref.current;
    if (!el) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
  }, [value, focused]);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    setDraft(event.currentTarget.textContent ?? "");
  };

  const handleBlur = () => {
    setFocused(false);
    void commit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      rollback();
      const el = ref.current;
      if (el) {
        el.textContent = committedValue;
      }
      event.currentTarget.blur();
    }
  };

  const focusClasses = focused
    ? "border-moss bg-[color-mix(in_oklab,var(--color-lichen)_12%,transparent)]"
    : "border-border hover:border-[color-mix(in_oklab,var(--color-border-strong)_70%,transparent)] hover:border-dashed";

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Summary</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="summary-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div
        ref={ref}
        // biome-ignore lint/a11y/useSemanticElements: contentEditable is required for inline summary editing
        role="textbox"
        tabIndex={0}
        aria-label="Work item summary"
        aria-multiline="false"
        data-testid="editable-summary"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`min-h-[3rem] rounded-[var(--radius-md)] border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors ${focusClasses}`}
      />
    </section>
  );
}
