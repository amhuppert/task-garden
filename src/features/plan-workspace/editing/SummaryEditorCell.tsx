import { useCallback } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { FieldShell } from "../ui/FieldShell";
import { InlineTextEditor } from "../ui/InlineTextEditor";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

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
  const key = draftKeys.workItemField(workItemId, "summary");

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

  return (
    <FieldShell
      label="Summary"
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      {/* Single-line semantics by design: Enter commits, matching prior behavior. */}
      <InlineTextEditor
        value={value}
        onInput={setDraft}
        onCommit={() => void commit()}
        onCancel={rollback}
        ariaLabel="Work item summary"
        testId="editable-summary"
        className="min-h-[3rem] rounded-[var(--radius-md)] border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground"
      />
    </FieldShell>
  );
}
