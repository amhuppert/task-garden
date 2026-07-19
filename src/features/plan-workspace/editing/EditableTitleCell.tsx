import { useCallback } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { FieldShell } from "../ui/FieldShell";
import { InlineTextEditor } from "../ui/InlineTextEditor";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

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
  const key = draftKeys.workItemField(workItemId, "title");

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

  return (
    <FieldShell
      label="Title"
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <InlineTextEditor
        value={value}
        onInput={setDraft}
        onCommit={() => void commit()}
        onCancel={rollback}
        ariaLabel="Work item title"
        testId="editable-title"
        className="atlas-title text-xl leading-tight text-foreground rounded-[var(--radius-sm)] border-transparent px-1 py-0.5 -mx-1"
      />
    </FieldShell>
  );
}
