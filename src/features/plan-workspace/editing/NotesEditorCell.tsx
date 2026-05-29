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

export interface NotesEditorCellProps {
  workItemId: string;
  committedValue: string | null;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

export function NotesEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: NotesEditorCellProps) {
  const key = `work_item:${workItemId}:notes`;
  const committedString = committedValue ?? "";

  const buildPatch = useCallback(
    (next: string) =>
      patchTargets.workItemField(
        workItemId,
        "notes",
        next === "" ? null : next,
      ),
    [workItemId],
  );

  const { value, isDirty, setDraft, commit, rollback } = useFieldDraft<string>({
    key,
    committedValue: committedString,
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

  const handleBlur = () => {
    setFocused(false);
    void commit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      rollback();
      const el = ref.current;
      if (el) {
        el.textContent = committedString;
      }
      event.currentTarget.blur();
    }
    // Enter inserts a newline (do not preventDefault, do not commit)
  };

  const focusClasses = focused
    ? "border-moss bg-[color-mix(in_oklab,var(--color-lichen)_12%,transparent)]"
    : "border-border hover:border-[color-mix(in_oklab,var(--color-border-strong)_70%,transparent)] hover:border-dashed";

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Notes</span>
        <span className="rounded-[3px] border border-[color-mix(in_oklab,var(--color-iron)_35%,transparent)] px-1 py-px font-mono text-[0.55rem] tracking-wider text-iron">
          OPTIONAL
        </span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="notes-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div
        ref={ref}
        // biome-ignore lint/a11y/useSemanticElements: contentEditable is required for inline multiline notes editing
        role="textbox"
        tabIndex={0}
        aria-label="Work item notes"
        aria-multiline="true"
        data-testid="editable-notes"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`min-h-[5rem] whitespace-pre-wrap rounded-[var(--radius-md)] border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors ${focusClasses}`}
      >
        {value}
      </div>
    </section>
  );
}
