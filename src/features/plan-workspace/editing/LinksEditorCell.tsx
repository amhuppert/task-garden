import { useCallback } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type { TaskGardenLink } from "../../../lib/plan/task-garden-plan.schema";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { CloseGlyph, PlusGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

type DraftLink = { label: string; href: string };

export interface LinksEditorCellProps {
  workItemId: string;
  committedValue: readonly TaskGardenLink[];
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

function sanitize(rows: readonly DraftLink[]): TaskGardenLink[] {
  return rows
    .map((r) => ({ label: r.label.trim(), href: r.href.trim() }))
    .filter((r) => r.label.length > 0 && r.href.length > 0);
}

export function LinksEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: LinksEditorCellProps) {
  const key = `work_item:${workItemId}:links`;

  const buildPatch = useCallback(
    (next: readonly DraftLink[]) =>
      patchTargets.workItemLinks(workItemId, sanitize(next)),
    [workItemId],
  );

  const initial: readonly DraftLink[] = committedValue.map((l) => ({
    label: l.label,
    href: l.href,
  }));

  const { value, isDirty, setDraft, commit } = useFieldDraft<
    readonly DraftLink[]
  >({
    key,
    committedValue: initial,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  const updateRow = (index: number, patch: Partial<DraftLink>) => {
    const arr = value.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    setDraft(arr);
  };

  const handleAdd = () => {
    setDraft([...value, { label: "", href: "" }]);
  };

  const handleRemove = (index: number) => {
    const arr = value.filter((_, i) => i !== index);
    setDraft(arr);
    queueMicrotask(() => {
      void commit();
    });
  };

  // Commit only when focus leaves the row entirely. React's onBlur on the row
  // container fires for each child blur; we check relatedTarget to detect
  // whether the next focus is still within the same row.
  const handleRowBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    queueMicrotask(() => {
      void commit();
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Links</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="links-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div className="flex flex-col gap-1.5">
        {value.map((row, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows lack stable identity
            key={index}
            onBlur={handleRowBlur}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-2 py-1"
          >
            <input
              data-testid={`link-label-${index}`}
              aria-label={`Link label ${index + 1}`}
              placeholder="Label"
              value={row.label}
              onChange={(event) =>
                updateRow(index, { label: event.target.value })
              }
              className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <input
              data-testid={`link-href-${index}`}
              aria-label={`Link href ${index + 1}`}
              placeholder="https://... or file path"
              value={row.href}
              onChange={(event) =>
                updateRow(index, { href: event.target.value })
              }
              className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <button
              type="button"
              aria-label={`Remove link ${row.label || index + 1}`}
              onClick={() => handleRemove(index)}
              className="inline-flex items-center rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={9} />
            </button>
          </div>
        ))}
        <button
          type="button"
          data-testid="link-add"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          <PlusGlyph size={9} />
          Add link
        </button>
      </div>
    </div>
  );
}
