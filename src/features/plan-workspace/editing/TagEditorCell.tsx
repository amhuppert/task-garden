import { useCallback, useState } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import { TagSchema } from "../../../lib/plan/task-garden-plan.schema";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { CloseGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";
import { VALIDATION_COPY } from "./validation-copy";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

export interface TagEditorCellProps {
  workItemId: string;
  committedValue: readonly string[];
  baseRevision: number;
  patchPlan?: PatchPlanFn;
}

export function TagEditorCell({
  workItemId,
  committedValue,
  baseRevision,
  patchPlan,
}: TagEditorCellProps) {
  const key = `work_item:${workItemId}:tags`;

  const buildPatch = useCallback(
    (next: readonly string[]) => patchTargets.workItemTags(workItemId, next),
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

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commitArray = useCallback(
    (nextTags: readonly string[]) => {
      setDraft(nextTags);
      queueMicrotask(() => {
        void commit();
      });
    },
    [setDraft, commit],
  );

  const handleAdd = () => {
    const candidate = input.trim();
    if (candidate === "") return;
    const parsed = TagSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(VALIDATION_COPY.default.detail);
      return;
    }
    if (value.includes(candidate)) {
      setError(VALIDATION_COPY.default.detail);
      return;
    }
    setError(null);
    setInput("");
    commitArray([...value, candidate]);
  };

  const handleRemove = (tag: string) => {
    const next = value.filter((t) => t !== tag);
    commitArray(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    } else if (event.key === "Backspace" && input === "" && value.length > 0) {
      event.preventDefault();
      const next = value.slice(0, value.length - 1);
      commitArray(next);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="atlas-kicker">Tags</span>
        {isDirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
            data-testid="tags-dirty-dot"
          />
        )}
        <FieldSaveIndicator stateKey={key} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="atlas-microchip inline-flex items-center gap-1 px-2 py-0.5"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => handleRemove(tag)}
              className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={8} />
            </button>
          </span>
        ))}
        <input
          data-testid="tag-editor-input"
          aria-label="Add tag"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="add tag…"
          className="min-w-[80px] flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-moss"
        />
      </div>
      {error && (
        <span data-testid="tag-editor-error" className="text-xs text-petal">
          {error}
        </span>
      )}
    </div>
  );
}
