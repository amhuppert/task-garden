import { useCallback } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

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
      <input
        data-testid={testId}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
      />
    </div>
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
