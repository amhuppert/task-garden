import { useCallback, useId } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type {
  TaskGardenLink,
  TaskGardenPlan,
} from "../../../lib/plan/task-garden-plan.schema";
import { FieldShell } from "../ui/FieldShell";
import { RowListEditor } from "../ui/RowListEditor";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { CloseGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

export interface PlanOverviewEditorProps {
  plan: TaskGardenPlan;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

type DraftLink = { label: string; href: string };

function PlanScalarField({
  fieldKey,
  label,
  field,
  committedValue,
  baseRevision,
  patchPlan,
  multiline,
  testId,
  type,
}: {
  fieldKey: string;
  label: string;
  field: "title" | "summary" | "last_updated";
  committedValue: string;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
  multiline?: boolean;
  testId: string;
  type?: string;
}) {
  const key = draftKeys.plan(fieldKey);
  const inputId = useId();
  const buildPatch = useCallback(
    (next: string) => patchTargets.planField(field, next),
    [field],
  );

  const { value, isDirty, setDraft, commit } = useFieldDraft<string>({
    key,
    committedValue,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDraft(event.target.value);
  };

  const handleBlur = () => {
    queueMicrotask(() => {
      void commit();
    });
  };

  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      {multiline ? (
        <textarea
          id={inputId}
          data-testid={testId}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={3}
          className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
        />
      ) : (
        <input
          id={inputId}
          data-testid={testId}
          type={type ?? "text"}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
        />
      )}
    </FieldShell>
  );
}

function PlanReferencesField({
  committedValue,
  baseRevision,
  patchPlan,
}: {
  committedValue: readonly TaskGardenLink[];
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}) {
  const key = "plan:references";
  const labelId = useId();

  const buildPatch = useCallback(
    (next: readonly DraftLink[]) =>
      patchTargets.planReferences(
        next
          .map((r) => ({ label: r.label.trim(), href: r.href.trim() }))
          .filter((r) => r.label.length > 0 && r.href.length > 0),
      ),
    [],
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
      label="Plan References"
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
        addLabel="Add reference"
        labelId={labelId}
        testIdPrefix="plan-ref-"
        renderRow={(row, index, api) => (
          <>
            <input
              data-testid={`plan-ref-label-${index}`}
              aria-label={`Reference label ${index + 1}`}
              placeholder="Label"
              value={row.label}
              onChange={(event) =>
                api.update({ ...row, label: event.target.value })
              }
              className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <input
              data-testid={`plan-ref-href-${index}`}
              aria-label={`Reference href ${index + 1}`}
              placeholder="https://... or file path"
              value={row.href}
              onChange={(event) =>
                api.update({ ...row, href: event.target.value })
              }
              className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <button
              type="button"
              aria-label={`Remove reference ${row.label || index + 1}`}
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

export function PlanOverviewEditor({
  plan,
  baseRevision,
  patchPlan,
}: PlanOverviewEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <PlanScalarField
        fieldKey="title"
        label="Title"
        field="title"
        committedValue={plan.title}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
        testId="plan-title-input"
      />
      <PlanScalarField
        fieldKey="summary"
        label="Summary"
        field="summary"
        committedValue={plan.summary}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
        multiline
        testId="plan-summary-input"
      />
      <PlanScalarField
        fieldKey="last_updated"
        label="Last updated"
        field="last_updated"
        committedValue={plan.last_updated}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
        testId="plan-last-updated-input"
      />
      <PlanReferencesField
        committedValue={plan.references}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
      />
    </div>
  );
}
