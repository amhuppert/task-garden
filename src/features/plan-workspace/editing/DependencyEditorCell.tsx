import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PlanAnalysisSnapshot } from "../../../lib/graph/plan-analysis-engine";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { TaskGardenWorkItem } from "../../../lib/plan/task-garden-plan.schema";
import { FieldShell } from "../ui/FieldShell";
import { LiveRegion } from "../ui/LiveRegion";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { CloseGlyph, PlusGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";
import { VALIDATION_COPY, type ValidationCopy } from "./validation-copy";

export type DependencyEditorMode = "upstream" | "dependents";

export interface DependencyEditorCellProps {
  workItemId: string;
  committedValue: readonly string[];
  baseRevision: number;
  mode: DependencyEditorMode;
  allWorkItems: readonly TaskGardenWorkItem[];
  snapshot: PlanAnalysisSnapshot;
  patchPlan?: PatchPlanFn;
  onBranchNewDependent?: () => void;
}

/**
 * Adding "workItem depends_on candidate" closes a cycle iff workItem is already
 * (transitively) a dependent of candidate. We DFS the snapshot's dependencyIds
 * adjacency starting from candidate and look for workItemId.
 */
function wouldCreateCycle(
  candidateId: string,
  workItemId: string,
  snapshot: PlanAnalysisSnapshot,
): boolean {
  const visited = new Set<string>();
  const stack: string[] = [candidateId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || visited.has(id)) continue;
    visited.add(id);
    const node = snapshot.analysisById[id];
    if (!node) continue;
    for (const dep of node.dependencyIds) {
      if (dep === workItemId) return true;
      if (!visited.has(dep)) stack.push(dep);
    }
  }
  return false;
}

type CandidateStatus = "ok" | "self" | "duplicate" | "cycle";

function classifyCandidate(
  candidateId: string,
  workItemId: string,
  committed: readonly string[],
  snapshot: PlanAnalysisSnapshot,
): CandidateStatus {
  if (candidateId === workItemId) return "self";
  if (committed.includes(candidateId)) return "duplicate";
  if (wouldCreateCycle(candidateId, workItemId, snapshot)) return "cycle";
  return "ok";
}

const STATUS_BADGE_TEXT: Record<Exclude<CandidateStatus, "ok">, string> = {
  self: "self",
  duplicate: "linked",
  cycle: "cycle",
};

const STATUS_TO_COPY: Record<Exclude<CandidateStatus, "ok">, ValidationCopy> = {
  self: VALIDATION_COPY.self_dependency,
  duplicate: VALIDATION_COPY.duplicate_dependency,
  cycle: VALIDATION_COPY.cycle_detected,
};

// The picker is an inline APG combobox (editable input + list-autocomplete via
// aria-activedescendant), deliberately hand-rolled and unportalled: it renders
// inside a React Flow node, where a portalled combobox primitive would break
// nodrag/nowheel interop. Extract to ui/ only when a second combobox appears.
export function DependencyEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  mode,
  allWorkItems,
  snapshot,
  patchPlan,
  onBranchNewDependent,
}: DependencyEditorCellProps) {
  // The dependents cell renders a derived, read-only list — it must not share
  // the depends_on draft slot, or an in-flight dependency edit would leak into
  // the "Dependents" list.
  const key =
    mode === "upstream"
      ? draftKeys.workItemField(workItemId, "depends_on")
      : draftKeys.workItemField(workItemId, "dependents");

  const buildPatch = useCallback(
    (next: readonly string[]) => patchTargets.workItemDepsOn(workItemId, next),
    [workItemId],
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

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<ValidationCopy | null>(null);

  const idBase = useId();
  const listboxId = `${idBase}-listbox`;
  const errorId = `${idBase}-error`;
  const optionId = (candidateId: string) => `${idBase}-opt-${candidateId}`;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);
  // The trigger button remounts when the picker closes, so focus restoration
  // must wait for the post-close render.
  useEffect(() => {
    if (!pickerOpen && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [pickerOpen]);

  // Removing a chip unmounts its (focused) unlink button; recover focus onto
  // the previous chip's unlink button, or the "Link dependency…" trigger,
  // instead of dropping to <body>.
  const chipButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingChipFocusRef = useRef<number | null>(null);
  useEffect(() => {
    const pending = pendingChipFocusRef.current;
    if (pending === null) return;
    pendingChipFocusRef.current = null;
    chipButtonRefs.current = chipButtonRefs.current.slice(0, value.length);
    const target = chipButtonRefs.current[pending - 1] ?? triggerRef.current;
    target?.focus();
  }, [value]);

  const closePicker = (restoreFocus: boolean) => {
    setPickerOpen(false);
    setQuery("");
    setActiveIndex(-1);
    if (restoreFocus) restoreFocusRef.current = true;
  };

  const commitArray = useCallback(
    (nextDeps: readonly string[]) => {
      setDraft(nextDeps);
      queueMicrotask(() => {
        void commit();
      });
    },
    [setDraft, commit],
  );

  // Typeahead candidate list — includes self, duplicates, and cycle-creators
  // (each annotated with a status badge). Filtering and inline validation give
  // the user reachable feedback for every blocked case.
  const candidates = useMemo(() => {
    if (mode !== "upstream") return [];
    const needle = query.trim().toLowerCase();
    return allWorkItems
      .filter((w) => {
        if (needle.length === 0) return true;
        return (
          w.id.toLowerCase().includes(needle) ||
          w.title.toLowerCase().includes(needle)
        );
      })
      .map((w) => ({
        item: w,
        status: classifyCandidate(w.id, workItemId, value, snapshot),
      }));
  }, [allWorkItems, query, value, workItemId, snapshot, mode]);

  const handleSelectCandidate = (candidateId: string) => {
    const status = classifyCandidate(candidateId, workItemId, value, snapshot);
    if (status !== "ok") {
      setError(STATUS_TO_COPY[status]);
      return;
    }
    setError(null);
    closePicker(true);
    commitArray([...value, candidateId]);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (candidates.length === 0) return;
      setActiveIndex((i) => (i + 1) % candidates.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (candidates.length === 0) return;
      setActiveIndex((i) => (i <= 0 ? candidates.length - 1 : i - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const active = candidates[activeIndex];
      if (active) handleSelectCandidate(active.item.id);
      return;
    }
    if (event.key === "Escape") {
      // Consumed by the combobox — must not reach workspace-level hotkeys.
      event.preventDefault();
      event.stopPropagation();
      setError(null);
      closePicker(true);
    }
  };

  const handleRemove = (depId: string) => {
    pendingChipFocusRef.current = value.indexOf(depId);
    const next = value.filter((d) => d !== depId);
    commitArray(next);
  };

  const itemLookup = useMemo(() => {
    const m = new Map<string, TaskGardenWorkItem>();
    for (const item of allWorkItems) m.set(item.id, item);
    return m;
  }, [allWorkItems]);

  const displayList = value;
  const labelText = mode === "upstream" ? "Depends on" : "Dependents";
  const activeCandidate = candidates[activeIndex];

  return (
    <FieldShell
      label={labelText}
      dirty={isDirty}
      trailing={
        mode === "dependents" ? (
          <span
            className="rounded border border-iron px-1 font-mono text-[0.55rem] uppercase tracking-wider text-iron"
            data-testid="dep-derived-badge"
          >
            Derived
          </span>
        ) : undefined
      }
      status={
        <>
          <FieldSaveIndicator stateKey={key} />
          <span className="ml-auto font-mono text-[0.65rem] text-muted-foreground">
            {displayList.length}
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        {displayList.map((depId, index) => {
          const ref = itemLookup.get(depId);
          if (!ref) return null;
          return (
            <div
              key={depId}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-1.5"
              data-testid={`dep-chip-${depId}`}
            >
              <span className="font-mono text-[0.7rem] text-muted-foreground">
                {ref.id}
              </span>
              <span className="flex-1 truncate text-sm text-foreground">
                {ref.title}
              </span>
              {mode === "upstream" && (
                <button
                  type="button"
                  ref={(el) => {
                    chipButtonRefs.current[index] = el;
                  }}
                  aria-label={`Unlink ${depId}`}
                  onClick={() => handleRemove(depId)}
                  className="inline-flex items-center rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <CloseGlyph size={9} />
                </button>
              )}
            </div>
          );
        })}

        {mode === "upstream" && !pickerOpen && (
          <button
            type="button"
            ref={triggerRef}
            data-testid="dep-editor-open-picker"
            // Disclosure-style opener for the combobox: the closed state must
            // be perceivable (aria-expanded=false) — the combobox input only
            // mounts while open, with aria-expanded hardcoded true.
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            onClick={() => {
              setError(null);
              setQuery("");
              setActiveIndex(-1);
              setPickerOpen(true);
            }}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
          >
            <PlusGlyph size={9} />
            Link dependency…
          </button>
        )}

        {mode === "upstream" && pickerOpen && (
          <div
            className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-moss bg-surface p-1"
            data-testid="dep-picker"
          >
            <input
              data-testid="dep-picker-search"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeCandidate ? optionId(activeCandidate.item.id) : undefined
              }
              aria-describedby={error ? errorId : undefined}
              aria-label="Search dependency candidates"
              placeholder="Search by id or title…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
                setError(null);
              }}
              onKeyDown={handleSearchKeyDown}
              // biome-ignore lint/a11y/noAutofocus: typeahead picker focuses input on open
              autoFocus
              className="rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
            />
            {/* biome-ignore lint/a11y/useFocusableInteractive: APG combobox popup — focus stays on the input; the listbox is navigated via aria-activedescendant */}
            {/* biome-ignore lint/a11y/useSemanticElements: native <select> cannot express a typeahead popup with annotated, aria-disabled options */}
            <div
              role="listbox"
              id={listboxId}
              aria-label="Dependency candidates"
              className="flex flex-col gap-1"
            >
              {candidates.map(({ item: cand, status }, index) => (
                <button
                  key={cand.id}
                  type="button"
                  // APG combobox: options are never in the tab sequence — DOM
                  // focus stays on the input, which points here via
                  // aria-activedescendant.
                  tabIndex={-1}
                  // biome-ignore lint/a11y/useSemanticElements: option in a custom combobox popup — native <option> only lives in <select>
                  id={optionId(cand.id)}
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-disabled={status !== "ok" || undefined}
                  data-testid={`dep-candidate-${cand.id}`}
                  data-status={status}
                  onClick={() => handleSelectCandidate(cand.id)}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-surface-muted ${
                    index === activeIndex ? "bg-surface-muted" : ""
                  }`}
                >
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {cand.id}
                  </span>
                  <span className="flex-1 truncate">{cand.title}</span>
                  {status !== "ok" && (
                    <span className="rounded border border-border px-1 font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground">
                      {STATUS_BADGE_TEXT[status]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Outside the listbox — role=listbox may only own options, and a
                status region is the only way an aria-activedescendant user
                hears the empty result. */}
            <LiveRegion
              kind="status"
              className={
                candidates.length === 0
                  ? "px-2 py-1 text-xs text-muted-foreground"
                  : "sr-only"
              }
            >
              {candidates.length === 0 ? "No matches" : null}
            </LiveRegion>
            <button
              type="button"
              data-testid="dep-picker-cancel"
              onClick={() => {
                setError(null);
                closePicker(true);
              }}
              className="self-end px-2 py-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              esc
            </button>
          </div>
        )}

        {mode === "dependents" && (
          <button
            type="button"
            data-testid="dep-branch-new-dependent"
            onClick={() => onBranchNewDependent?.()}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
          >
            <PlusGlyph size={9} />
            Branch new dependent…
          </button>
        )}
      </div>

      <LiveRegion kind="alert" className="text-xs text-petal">
        {error && (
          <span id={errorId} data-testid="dep-editor-error">
            {error.title} — {error.detail}
          </span>
        )}
      </LiveRegion>
    </FieldShell>
  );
}
