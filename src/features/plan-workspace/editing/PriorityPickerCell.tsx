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
  type TaskGardenPriority,
  TaskGardenPrioritySchema,
} from "../../../lib/plan/task-garden-plan.schema";
import { getPriorityLabel } from "../plan-details-panel.helpers";
import { getPriorityAccentColor } from "../plan-graph-canvas.helpers";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { ChevronGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

export interface PriorityPickerCellProps {
  workItemId: string;
  committedValue: TaskGardenPriority;
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

const PRIORITY_OPTIONS = TaskGardenPrioritySchema.options;

const PRIORITY_NOTES: Record<TaskGardenPriority, string> = {
  p0: "must",
  p1: "should",
  p2: "could",
  p3: "won't yet",
  nice_to_have: "—",
};

export function PriorityPickerCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: PriorityPickerCellProps) {
  const key = `work_item:${workItemId}:priority`;

  const buildPatch = useCallback(
    (next: TaskGardenPriority) =>
      patchTargets.workItemField(workItemId, "priority", next),
    [workItemId],
  );

  const { value, isDirty, setDraft, commit } =
    useFieldDraft<TaskGardenPriority>({
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

  const handleSelect = (next: TaskGardenPriority) => {
    setDraft(next);
    setOpen(false);
    queueMicrotask(() => {
      void commit();
    });
  };

  const accent = getPriorityAccentColor(value);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Priority</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="priority-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <button
        ref={refs.setReference}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="priority-picker-chip"
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
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: accent }}
          />
          <span className="font-semibold">{getPriorityLabel(value)}</span>
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
              aria-label="Set priority"
              className="atlas-panel z-50 grid w-56 grid-cols-2 gap-1 p-2"
              {...getFloatingProps()}
            >
              {PRIORITY_OPTIONS.map((option) => {
                const selected = option === value;
                const spanFull = option === "nice_to_have";
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
                    } ${spanFull ? "col-span-2" : ""}`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-sm"
                      style={{
                        backgroundColor: getPriorityAccentColor(option),
                      }}
                    />
                    <span className="flex-1">{getPriorityLabel(option)}</span>
                    <span className="font-mono text-[0.58rem] text-muted-foreground">
                      {PRIORITY_NOTES[option]}
                    </span>
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
