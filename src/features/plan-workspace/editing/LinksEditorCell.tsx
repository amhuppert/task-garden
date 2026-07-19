import { useCallback, useId } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { TaskGardenLink } from "../../../lib/plan/task-garden-plan.schema";
import { FieldShell } from "../ui/FieldShell";
import { RowListEditor } from "../ui/RowListEditor";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { CloseGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

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

// Enter commits immediately (via blur) so "Open link" and other actions never
// race a pending draft that only blur would have flushed.
function blurOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.currentTarget.blur();
}

export function LinksEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: LinksEditorCellProps) {
  const key = draftKeys.workItemField(workItemId, "links");
  const labelId = useId();

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

  return (
    <FieldShell
      label="Links"
      labelId={labelId}
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <RowListEditor<DraftLink>
        rows={value}
        onRowsChange={setDraft}
        onCommit={() => {
          void commit();
        }}
        commitOn="row-blur"
        makeEmptyRow={() => ({ label: "", href: "" })}
        addLabel="Add link"
        labelId={labelId}
        testIdPrefix="link-"
        renderRow={(row, index, api) => (
          <>
            <input
              data-testid={`link-label-${index}`}
              aria-label={`Link label ${index + 1}`}
              placeholder="Label"
              value={row.label}
              onChange={(event) =>
                api.update({ ...row, label: event.target.value })
              }
              onKeyDown={blurOnEnter}
              className="w-24 shrink-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <input
              data-testid={`link-href-${index}`}
              aria-label={`Link href ${index + 1}`}
              placeholder="https://... or file path"
              value={row.href}
              onChange={(event) =>
                api.update({ ...row, href: event.target.value })
              }
              onKeyDown={blurOnEnter}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <button
              type="button"
              aria-label={`Remove link ${row.label || index + 1}`}
              onClick={api.remove}
              className="inline-flex shrink-0 items-center rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={9} />
            </button>
          </>
        )}
      />
    </FieldShell>
  );
}
