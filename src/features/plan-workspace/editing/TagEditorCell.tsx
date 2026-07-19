import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { TagSchema } from "../../../lib/plan/task-garden-plan.schema";
import { FieldShell } from "../ui/FieldShell";
import { LiveRegion } from "../ui/LiveRegion";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import { draftKeys } from "./edit.store";
import { CloseGlyph } from "./glyphs";
import { patchTargets } from "./patch-targets";
import { useFieldDraft } from "./useFieldDraft";
import { VALIDATION_COPY } from "./validation-copy";

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
  const key = draftKeys.workItemField(workItemId, "tags");
  const errorId = useId();

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

  // Removing a tag unmounts its (focused) remove button; recover focus onto
  // the previous tag's remove button, or the add-tag input when none precedes
  // — mirroring RowListEditor's convention — instead of dropping to <body>.
  const chipButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingFocusRef = useRef<number | null>(null);
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;
    chipButtonRefs.current = chipButtonRefs.current.slice(0, value.length);
    const target = chipButtonRefs.current[pending - 1] ?? inputRef.current;
    target?.focus();
  }, [value]);

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
    pendingFocusRef.current = value.indexOf(tag);
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
    <FieldShell
      label="Tags"
      dirty={isDirty}
      status={<FieldSaveIndicator stateKey={key} />}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag, index) => (
          <span
            key={tag}
            className="atlas-microchip inline-flex items-center gap-1 px-2 py-0.5"
          >
            #{tag}
            <button
              type="button"
              ref={(el) => {
                chipButtonRefs.current[index] = el;
              }}
              aria-label={`Remove tag ${tag}`}
              onClick={() => handleRemove(tag)}
              className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <CloseGlyph size={8} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          data-testid="tag-editor-input"
          aria-label="Add tag"
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={errorId}
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
      {/* Wrapper carries the id/testid because LiveRegion exposes neither;
          aria-describedby text is computed from the subtree, so the
          association still resolves to the alert's message. */}
      <div
        id={errorId}
        data-testid="tag-editor-error"
        className="text-xs text-petal"
      >
        <LiveRegion kind="alert">{error}</LiveRegion>
      </div>
    </FieldShell>
  );
}
