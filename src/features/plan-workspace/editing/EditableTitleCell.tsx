import { useCallback, useEffect, useRef, useState } from "react";
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

export interface EditableTitleCellProps {
  workItemId: string;
  committedValue: string;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

export function EditableTitleCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: EditableTitleCellProps) {
  const key = `work_item:${workItemId}:title`;

  const buildPatch = useCallback(
    (next: string) => patchTargets.workItemField(workItemId, "title", next),
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

  useEffect(() => {
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

  const handleFocus = () => setFocused(true);

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

  const stateClasses = focused
    ? "border-moss bg-[color-mix(in_oklab,var(--color-lichen)_12%,transparent)]"
    : "border-transparent hover:border-[color-mix(in_oklab,var(--color-border-strong)_70%,transparent)] hover:border-dashed";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Title</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="title-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div
        ref={ref}
        // biome-ignore lint/a11y/useSemanticElements: contentEditable is required for inline title editing
        role="textbox"
        tabIndex={0}
        aria-label="Work item title"
        aria-multiline="false"
        data-testid="editable-title"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`atlas-title text-xl leading-tight text-foreground rounded-[var(--radius-sm)] border px-1 py-0.5 -mx-1 outline-none transition-colors ${stateClasses}`}
      >
        {value}
      </div>
    </div>
  );
}
