import { useCallback, useId } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import { FieldShell } from "../ui/FieldShell";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

export interface LaneInlineEditorProps {
  laneId: string;
  committedLane: TaskGardenLane;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

function LaneScalarField({
  laneId,
  field,
  label,
  committedValue,
  baseRevision,
  patchPlan,
  optional,
  testId,
  placeholder,
}: {
  laneId: string;
  field: "label" | "description" | "color";
  label: string;
  committedValue: string;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
  optional: boolean;
  testId: string;
  placeholder?: string;
}) {
  const key = `lane:${laneId}:${field}`;
  const inputId = useId();

  const buildPatch = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const value = optional && trimmed === "" ? null : trimmed;
      return patchTargets.laneField(laneId, field, value);
    },
    [laneId, field, optional],
  );

  const { value, isDirty, setDraft, commit } = useFieldDraft<string>({
    key,
    committedValue,
    buildPatch,
    baseRevision,
    patchPlan,
  });

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
      <input
        id={inputId}
        data-testid={testId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
      />
    </FieldShell>
  );
}

export function LaneInlineEditor({
  laneId,
  committedLane,
  baseRevision,
  patchPlan,
}: LaneInlineEditorProps) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <LaneScalarField
        laneId={laneId}
        field="label"
        label="Label"
        committedValue={committedLane.label}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
        optional={false}
        testId="lane-label-input"
      />
      <LaneScalarField
        laneId={laneId}
        field="description"
        label="Description"
        committedValue={committedLane.description ?? ""}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
        optional
        testId="lane-description-input"
        placeholder="Optional description"
      />
      <LaneScalarField
        laneId={laneId}
        field="color"
        label="Color"
        committedValue={committedLane.color ?? ""}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
        optional
        testId="lane-color-input"
        placeholder="#aabbcc"
      />
    </div>
  );
}
