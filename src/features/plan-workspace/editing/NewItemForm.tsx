import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useEffect, useMemo, useState } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import {
  type EditApiResult,
  type PatchPlanOptions,
  patchPlan as defaultPatchPlan,
} from "../../../lib/plan/edit-api-client";
import {
  type TaskGardenLane,
  type TaskGardenPriority,
  TaskGardenPrioritySchema,
  type TaskGardenStatus,
  TaskGardenStatusSchema,
  type TaskGardenWorkItem,
  TaskGardenWorkItemSchema,
} from "../../../lib/plan/task-garden-plan.schema";
import { usePlanExplorerStore } from "../plan-explorer.store";
import { CreateBar } from "./CreateBar";
import { VALIDATION_COPY } from "./validation-copy";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

export interface NewItemFormPrefill {
  lane?: string;
  dependsOn?: string[];
}

export interface NewItemFormProps {
  open: boolean;
  onClose: () => void;
  prefill?: NewItemFormPrefill;
  lanes: readonly TaskGardenLane[];
  baseRevision?: number;
  /** Override for tests. */
  patchPlan?: PatchPlanFn;
}

interface DraftWorkItem {
  id: string;
  title: string;
  summary: string;
  lane: string;
  status: TaskGardenStatus;
  priority: TaskGardenPriority;
  depends_on: string[];
  tags: string[];
  deliverables: string[];
  reuse_candidates: string[];
  links: { label: string; href: string }[];
  notes: string;
  estimateValue: string;
  estimateUnit: "hours" | "days" | "points";
}

function emptyDraft(
  prefill: NewItemFormPrefill | undefined,
  defaultLaneId: string,
): DraftWorkItem {
  return {
    id: "",
    title: "",
    summary: "",
    lane: prefill?.lane ?? defaultLaneId,
    status: "planned",
    priority: "p2",
    depends_on: prefill?.dependsOn ? [...prefill.dependsOn] : [],
    tags: [],
    deliverables: [],
    reuse_candidates: [],
    links: [],
    notes: "",
    estimateValue: "",
    estimateUnit: "days",
  };
}

function buildSchemaInput(draft: DraftWorkItem): unknown {
  const obj: Record<string, unknown> = {
    id: draft.id.trim(),
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    lane: draft.lane,
    status: draft.status,
    priority: draft.priority,
    depends_on: draft.depends_on,
    tags: draft.tags,
    deliverables: draft.deliverables,
    reuse_candidates: draft.reuse_candidates,
    links: draft.links,
  };
  if (draft.notes.trim().length > 0) obj.notes = draft.notes.trim();
  if (draft.estimateValue.trim().length > 0) {
    const num = Number(draft.estimateValue);
    if (!Number.isNaN(num)) {
      obj.estimate = { value: num, unit: draft.estimateUnit };
    } else {
      obj.estimate = { value: draft.estimateValue, unit: draft.estimateUnit };
    }
  }
  return obj;
}

function generateOperationId(): string {
  return crypto.randomUUID();
}

const STATUS_OPTIONS = TaskGardenStatusSchema.options;
const PRIORITY_OPTIONS = TaskGardenPrioritySchema.options;

export function NewItemForm({
  open,
  onClose,
  prefill,
  lanes,
  baseRevision,
  patchPlan,
}: NewItemFormProps) {
  const defaultLaneId = prefill?.lane ?? lanes[0]?.id ?? "";
  const [draft, setDraft] = useState<DraftWorkItem>(() =>
    emptyDraft(prefill, defaultLaneId),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const selectWorkItem = usePlanExplorerStore((s) => s.selectWorkItem);

  // Re-seed the draft when the form is opened (or the prefill changes) so the
  // form is fresh between entry points (toolbar, lane ghost, branch).
  useEffect(() => {
    if (open) {
      setDraft(emptyDraft(prefill, defaultLaneId));
      setSubmitError(null);
      setTouched({});
    }
  }, [open, prefill, defaultLaneId]);

  const markTouched = (field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const { refs, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });
  const dismiss = useDismiss(context, { escapeKey: true, outsidePress: false });
  const { getFloatingProps } = useInteractions([dismiss]);

  const validation = useMemo(() => {
    const input = buildSchemaInput(draft);
    return TaskGardenWorkItemSchema.safeParse(input);
  }, [draft]);

  if (!open) return null;

  const fieldError = (
    field: keyof TaskGardenWorkItem | "estimate" | string,
  ): string | null => {
    if (validation.success) return null;
    if (!touched[field]) return null;
    const issue = validation.error.issues.find(
      (i) => i.path[0] === field || i.path.join(".") === field,
    );
    if (!issue) return null;
    const copy = VALIDATION_COPY[issue.code];
    return copy?.detail ?? issue.message;
  };

  const canSubmit = validation.success && !submitting;

  const update = <K extends keyof DraftWorkItem>(
    key: K,
    value: DraftWorkItem[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!validation.success) return;
    setSubmitting(true);
    setSubmitError(null);

    const patchFn = patchPlan ?? defaultPatchPlan;
    const operationId = generateOperationId();
    const newItem = validation.data;
    const result = await patchFn(
      { kind: "work_item.create", value: newItem },
      { operationId, baseRevision },
    );

    setSubmitting(false);
    if (result.ok) {
      selectWorkItem(newItem.id);
      onClose();
      setDraft(emptyDraft(undefined, defaultLaneId));
      return;
    }

    if (result.error === "validation_failed" && result.issues.length > 0) {
      const first = result.issues[0];
      const copy = VALIDATION_COPY[first.code];
      setSubmitError(copy?.detail ?? first.message);
    } else if (result.error === "yaml_parse") {
      setSubmitError(VALIDATION_COPY.yaml_parse.detail);
    } else if (result.error === "network") {
      setSubmitError(VALIDATION_COPY.network.detail);
    } else {
      setSubmitError(VALIDATION_COPY.write_failed.detail);
    }
  };

  const errId = fieldError("id");
  const errTitle = fieldError("title");
  const errSummary = fieldError("summary");
  const errLane = fieldError("lane");

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        className="z-50 flex items-start justify-center bg-background/70 p-6 backdrop-blur-sm"
      >
        <FloatingFocusManager context={context} modal>
          <div
            ref={refs.setFloating}
            data-testid="new-item-form"
            aria-label="New work item"
            className="atlas-panel z-50 flex w-full max-w-2xl flex-col overflow-hidden"
            {...getFloatingProps()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="atlas-title text-base text-foreground">
                New work item
              </h2>
              <button
                type="button"
                aria-label="Close"
                data-testid="new-item-form-close"
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Esc
              </button>
            </div>

            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="nif-id"
                  className="atlas-kicker text-foreground"
                >
                  ID (slug)
                </label>
                <input
                  id="nif-id"
                  data-testid="nif-id"
                  value={draft.id}
                  onChange={(e) => update("id", e.target.value)}
                  onBlur={() => markTouched("id")}
                  placeholder="my-new-item"
                  className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
                />
                {errId && (
                  <span
                    className="text-xs text-petal"
                    data-testid="nif-id-error"
                  >
                    {errId}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="nif-title"
                  className="atlas-kicker text-foreground"
                >
                  Title
                </label>
                <input
                  id="nif-title"
                  data-testid="nif-title"
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                  onBlur={() => markTouched("title")}
                  className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
                />
                {errTitle && (
                  <span
                    className="text-xs text-petal"
                    data-testid="nif-title-error"
                  >
                    {errTitle}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="nif-summary"
                  className="atlas-kicker text-foreground"
                >
                  Summary
                </label>
                <textarea
                  id="nif-summary"
                  data-testid="nif-summary"
                  rows={3}
                  value={draft.summary}
                  onChange={(e) => update("summary", e.target.value)}
                  onBlur={() => markTouched("summary")}
                  className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
                />
                {errSummary && (
                  <span
                    className="text-xs text-petal"
                    data-testid="nif-summary-error"
                  >
                    {errSummary}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="nif-lane"
                    className="atlas-kicker text-foreground"
                  >
                    Lane
                  </label>
                  <select
                    id="nif-lane"
                    data-testid="nif-lane"
                    value={draft.lane}
                    onChange={(e) => update("lane", e.target.value)}
                    onBlur={() => markTouched("lane")}
                    className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
                  >
                    {lanes.length === 0 ? (
                      <option value="">(no lanes)</option>
                    ) : (
                      lanes.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))
                    )}
                  </select>
                  {errLane && (
                    <span className="text-xs text-petal">{errLane}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="nif-status"
                    className="atlas-kicker text-foreground"
                  >
                    Status
                  </label>
                  <select
                    id="nif-status"
                    data-testid="nif-status"
                    value={draft.status}
                    onChange={(e) =>
                      update("status", e.target.value as TaskGardenStatus)
                    }
                    className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="nif-priority"
                    className="atlas-kicker text-foreground"
                  >
                    Priority
                  </label>
                  <select
                    id="nif-priority"
                    data-testid="nif-priority"
                    value={draft.priority}
                    onChange={(e) =>
                      update("priority", e.target.value as TaskGardenPriority)
                    }
                    className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {draft.depends_on.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="atlas-kicker text-foreground">
                    Depends on
                  </span>
                  <div
                    className="flex flex-wrap gap-1"
                    data-testid="nif-depends-on"
                  >
                    {draft.depends_on.map((dep) => (
                      <span
                        key={dep}
                        className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-0.5 font-mono text-[0.7rem] text-foreground"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {submitError && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-sm)] border border-petal/40 bg-surface px-2 py-1 text-xs text-petal"
                  data-testid="nif-error"
                >
                  {submitError}
                </p>
              )}
            </div>

            <CreateBar
              primaryLabel="Add to plan"
              primaryDisabled={!canSubmit}
              busy={submitting}
              onPrimary={handleSubmit}
              secondaryLabel="Cancel"
              onSecondary={onClose}
              hint={
                validation.success ? null : (
                  <span data-testid="nif-validity">
                    Form has unresolved fields
                  </span>
                )
              }
            />
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
