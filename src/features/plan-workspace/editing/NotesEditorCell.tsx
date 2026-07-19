import { useCallback } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { FieldShell } from "../ui/FieldShell";
import { InlineTextEditor } from "../ui/InlineTextEditor";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

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
  const key = draftKeys.workItemField(workItemId, "notes");
  const committedString = committedValue ?? "";

  const buildPatch = useCallback(
    // Empty text clears the optional field (null), never writes "".
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

  return (
    <FieldShell
      label="Notes"
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
      trailing={
        <span className="rounded-[3px] border border-[color-mix(in_oklab,var(--color-iron)_35%,transparent)] px-1 py-px font-mono text-[0.55rem] tracking-wider text-iron">
          OPTIONAL
        </span>
      }
    >
      <InlineTextEditor
        value={value}
        onInput={setDraft}
        onCommit={() => void commit()}
        onCancel={rollback}
        multiline
        ariaLabel="Work item notes"
        testId="editable-notes"
        className="min-h-[5rem] whitespace-pre-wrap rounded-[var(--radius-md)] border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground"
      />
    </FieldShell>
  );
}
