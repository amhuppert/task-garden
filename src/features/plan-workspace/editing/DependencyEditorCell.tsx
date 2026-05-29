import { useCallback, useMemo, useState } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type { PlanAnalysisSnapshot } from "../../../lib/graph/plan-analysis-engine";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type { TaskGardenWorkItem } from "../../../lib/plan/task-garden-plan.schema";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { CloseGlyph, PlusGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";
import { VALIDATION_COPY, type ValidationCopy } from "./validation-copy";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

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
  const key = `work_item:${workItemId}:depends_on`;

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
  const [error, setError] = useState<ValidationCopy | null>(null);

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
    setPickerOpen(false);
    setQuery("");
    commitArray([...value, candidateId]);
  };

  const handleRemove = (depId: string) => {
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">{labelText}</span>
        {mode === "dependents" && (
          <span
            className="rounded border border-iron px-1 font-mono text-[0.55rem] uppercase tracking-wider text-iron"
            data-testid="dep-derived-badge"
          >
            Derived
          </span>
        )}
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="dep-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
        <span className="ml-auto font-mono text-[0.65rem] text-muted-foreground">
          {displayList.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {displayList.map((depId) => {
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
            data-testid="dep-editor-open-picker"
            onClick={() => {
              setError(null);
              setQuery("");
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
              aria-label="Search dependency candidates"
              placeholder="Search by id or title…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError(null);
              }}
              // biome-ignore lint/a11y/noAutofocus: typeahead picker focuses input on open
              autoFocus
              className="rounded-[var(--radius-sm)] border border-border bg-panel px-2 py-1 text-sm text-foreground outline-none focus:border-moss"
            />
            {candidates.length === 0 ? (
              <span className="px-2 py-1 text-xs text-muted-foreground">
                No matches
              </span>
            ) : (
              candidates.map(({ item: cand, status }) => (
                <button
                  key={cand.id}
                  type="button"
                  data-testid={`dep-candidate-${cand.id}`}
                  data-status={status}
                  onClick={() => handleSelectCandidate(cand.id)}
                  className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-surface-muted"
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
              ))
            )}
            <button
              type="button"
              data-testid="dep-picker-cancel"
              onClick={() => {
                setPickerOpen(false);
                setQuery("");
                setError(null);
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

      {error && (
        <span
          data-testid="dep-editor-error"
          className="text-xs text-[color:var(--color-petal)]"
        >
          {error.title} — {error.detail}
        </span>
      )}
    </div>
  );
}
