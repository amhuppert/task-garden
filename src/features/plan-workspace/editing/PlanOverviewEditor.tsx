import { useCallback } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type {
  TaskGardenLink,
  TaskGardenPlan,
} from "../../../lib/plan/task-garden-plan.schema";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { CloseGlyph, PlusGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

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
  const key = `plan:${fieldKey}`;
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">{label}</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      {multiline ? (
        <textarea
          data-testid={testId}
          aria-label={label}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={3}
          className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
        />
      ) : (
        <input
          data-testid={testId}
          aria-label={label}
          type={type ?? "text"}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
        />
      )}
    </div>
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

  // Commit only when focus leaves the row entirely (not when moving between
  // the row's own label/href inputs).
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
        <span className="atlas-kicker">Plan References</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
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
              data-testid={`plan-ref-label-${index}`}
              aria-label={`Reference label ${index + 1}`}
              placeholder="Label"
              value={row.label}
              onChange={(event) =>
                updateRow(index, { label: event.target.value })
              }
              className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <input
              data-testid={`plan-ref-href-${index}`}
              aria-label={`Reference href ${index + 1}`}
              placeholder="https://... or file path"
              value={row.href}
              onChange={(event) =>
                updateRow(index, { href: event.target.value })
              }
              className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:border-moss"
            />
            <button
              type="button"
              aria-label={`Remove reference ${row.label || index + 1}`}
              onClick={() => handleRemove(index)}
              className="inline-flex items-center rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={9} />
            </button>
          </div>
        ))}
        <button
          type="button"
          data-testid="plan-ref-add"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          <PlusGlyph size={9} />
          Add reference
        </button>
      </div>
    </div>
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
