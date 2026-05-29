import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useCallback, useState } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import {
  type TaskGardenStatus,
  TaskGardenStatusSchema,
} from "../../../lib/plan/task-garden-plan.schema";
import { getStatusLabel } from "../plan-details-panel.helpers";
import { getStatusAccentColor } from "../plan-graph-canvas.helpers";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { ChevronGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

export interface StatusPickerCellProps {
  workItemId: string;
  committedValue: TaskGardenStatus;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

const STATUS_OPTIONS = TaskGardenStatusSchema.options;

export function StatusPickerCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: StatusPickerCellProps) {
  const key = `work_item:${workItemId}:status`;

  const buildPatch = useCallback(
    (next: TaskGardenStatus) =>
      patchTargets.workItemField(workItemId, "status", next),
    [workItemId],
  );

  const { value, isDirty, setDraft, commit } = useFieldDraft<TaskGardenStatus>({
    key,
    committedValue,
    buildPatch,
    baseRevision,
    patchPlan,
  });

  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  const handleSelect = (next: TaskGardenStatus) => {
    setDraft(next);
    setOpen(false);
    queueMicrotask(() => {
      void commit();
    });
  };

  const accentColor = getStatusAccentColor(value);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Status</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="status-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <button
        ref={refs.setReference}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="status-picker-chip"
        className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors ${
          open
            ? "border-moss bg-surface"
            : "border-border bg-surface hover:border-border-strong"
        }`}
        {...getReferenceProps()}
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="font-semibold">{getStatusLabel(value)}</span>
        </span>
        <ChevronGlyph size={10} className="text-muted-foreground" />
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              // biome-ignore lint/a11y/useSemanticElements: floating popover requires div + role
              role="listbox"
              tabIndex={-1}
              aria-label="Set status"
              className="atlas-panel z-50 flex flex-col gap-0.5 p-1"
              {...getFloatingProps()}
            >
              {STATUS_OPTIONS.map((option) => {
                const selected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    // biome-ignore lint/a11y/useSemanticElements: listbox option uses button for click+focus
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(option)}
                    className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs transition-colors ${
                      selected
                        ? "bg-[color-mix(in_oklab,var(--color-lichen)_20%,transparent)] font-semibold"
                        : "hover:bg-surface-muted"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: getStatusAccentColor(option) }}
                    />
                    <span className="flex-1">{getStatusLabel(option)}</span>
                    {selected && (
                      <span className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                        current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
