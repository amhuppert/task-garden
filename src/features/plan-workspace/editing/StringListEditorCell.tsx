import { useCallback, useId } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { FieldShell } from "../ui/FieldShell";
import { RowListEditor } from "../ui/RowListEditor";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { CloseGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

export type StringListField = "deliverables" | "reuse_candidates";

export interface StringListEditorCellProps {
  workItemId: string;
  committedValue: readonly string[];
  baseRevision: number;
  field: StringListField;
  patchPlan?: PatchPlanFn;
}

const LABELS: Record<StringListField, string> = {
  deliverables: "Deliverables",
  reuse_candidates: "Reuse candidates",
};

function sanitize(rows: readonly string[]): string[] {
  return rows.map((r) => r.trim()).filter((r) => r.length > 0);
}

export function StringListEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  field,
  patchPlan,
}: StringListEditorCellProps) {
  const key = draftKeys.workItemField(workItemId, `string_list:${field}`);
  const labelId = useId();

  const buildPatch = useCallback(
    (next: readonly string[]) =>
      patchTargets.workItemStringList(workItemId, field, sanitize(next)),
    [workItemId, field],
  );

  const { value, isDirty, setDraft, commit } = useFieldDraft<readonly string[]>(
    {
      key,
      committedValue,
      buildPatch,
      baseRevision,
      patchPlan,
    },
  );

  return (
    <FieldShell
      label={LABELS[field]}
      labelId={labelId}
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <RowListEditor<string>
        rows={value}
        onRowsChange={setDraft}
        onCommit={() => {
          void commit();
        }}
        commitOn="field-blur"
        makeEmptyRow={() => ""}
        addLabel="Add"
        labelId={labelId}
        testIdPrefix="string-list-"
        renderRow={(row, index, api) => (
          <>
            <input
              data-testid={`string-list-item-${index}`}
              aria-label={`Item ${index + 1}`}
              value={row}
              onChange={(event) => api.update(event.target.value)}
              className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <button
              type="button"
              aria-label={`Remove item ${row || index + 1}`}
              onClick={api.remove}
              className="inline-flex items-center rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={9} />
            </button>
          </>
        )}
      />
    </FieldShell>
  );
}
