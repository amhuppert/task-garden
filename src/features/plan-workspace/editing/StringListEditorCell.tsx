import { useCallback, useRef } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { CloseGlyph, PlusGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

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
  const key = `work_item:${workItemId}:string_list:${field}`;

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

  const newRowIndexRef = useRef<number | null>(null);

  const updateRow = (index: number, next: string) => {
    const arr = [...value];
    arr[index] = next;
    setDraft(arr);
  };

  const handleAdd = () => {
    const arr = [...value, ""];
    setDraft(arr);
    newRowIndexRef.current = arr.length - 1;
  };

  const handleRemove = (index: number) => {
    const arr = value.filter((_, i) => i !== index);
    setDraft(arr);
    queueMicrotask(() => {
      void commit();
    });
  };

  const handleBlur = () => {
    queueMicrotask(() => {
      void commit();
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">{LABELS[field]}</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="string-list-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div className="flex flex-col gap-1.5">
        {value.map((row, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable identity
            key={index}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-2 py-1"
          >
            <input
              data-testid={`string-list-item-${index}`}
              aria-label={`Item ${index + 1}`}
              value={row}
              // biome-ignore lint/a11y/noAutofocus: focus newly-added row so user can type immediately
              autoFocus={newRowIndexRef.current === index}
              onChange={(event) => updateRow(index, event.target.value)}
              onBlur={handleBlur}
              className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <button
              type="button"
              aria-label={`Remove item ${row || index + 1}`}
              onClick={() => handleRemove(index)}
              className="inline-flex items-center rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={9} />
            </button>
          </div>
        ))}
        <button
          type="button"
          data-testid="string-list-add"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          <PlusGlyph size={9} />
          Add
        </button>
      </div>
    </div>
  );
}
