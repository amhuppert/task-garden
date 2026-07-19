import { useEffect, useRef } from "react";
import type { FocusEvent, ReactNode } from "react";
import { PlusGlyph } from "../editing/glyphs";

/** Per-row callbacks handed to `renderRow` for mutating that row. */
export type RowApi<Row> = {
  update: (row: Row) => void;
  remove: () => void;
};

export type RowListEditorProps<Row> = {
  rows: readonly Row[];
  /** Draft update — the caller owns row state (typically a field draft). */
  onRowsChange: (rows: Row[]) => void;
  onCommit: () => void;
  /**
   * "field-blur": every field blur inside a row commits.
   * "row-blur": commits only when focus leaves the row entirely.
   */
  commitOn: "field-blur" | "row-blur";
  renderRow: (row: Row, index: number, api: RowApi<Row>) => ReactNode;
  makeEmptyRow: () => Row;
  addLabel: string;
  /** id of the visible section label (kicker) — wired to the group via aria-labelledby. */
  labelId: string;
  /** Stamps `${prefix}row-${index}` on row containers and `${prefix}add` on the add button. */
  testIdPrefix?: string;
};

type PendingFocus =
  | { kind: "added-row"; index: number }
  | { kind: "removed-row"; index: number };

/**
 * RowListEditor — a labelled list of repeating form rows plus an append
 * button. Exposed to AT as an ARIA `group` named by `labelId` (repeating form
 * rows have no APG composite pattern; each field keeps its own native
 * semantics).
 *
 * The abstraction: callers render row content and inject domain logic
 * (sanitization, drafts, commit); the primitive completely owns the row
 * chrome, the add button, the commit-on-blur protocol selected by `commitOn`,
 * autofocus of a newly added row's first field, and focus recovery after a
 * row is removed (the adjacent row's remove control, or the add button when
 * no rows remain).
 */
export function RowListEditor<Row>({
  rows,
  onRowsChange,
  onCommit,
  commitOn,
  renderRow,
  makeEmptyRow,
  addLabel,
  labelId,
  testIdPrefix,
}: RowListEditorProps<Row>) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusRef = useRef<PendingFocus | null>(null);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    rowRefs.current = rowRefs.current.slice(0, rows.length);

    if (pending.kind === "added-row") {
      rowRefs.current[pending.index]
        ?.querySelector<HTMLElement>(
          "input, textarea, select, [contenteditable='true']",
        )
        ?.focus();
      return;
    }

    // Removal would otherwise drop focus to <body>. By convention the remove
    // control is the last button a row renders, so target the previous row's
    // last button; when the first row was removed, the row that slid into its
    // place; only with no rows left, the add button.
    const adjacentRow =
      rowRefs.current[pending.index - 1] ?? rowRefs.current[pending.index];
    const buttons = adjacentRow?.querySelectorAll<HTMLElement>("button");
    const target =
      buttons && buttons.length > 0
        ? buttons[buttons.length - 1]
        : addButtonRef.current;
    target?.focus();
  }, [rows]);

  const rowApi = (index: number): RowApi<Row> => ({
    update: (row) => {
      onRowsChange(rows.map((r, i) => (i === index ? row : r)));
    },
    remove: () => {
      onRowsChange(rows.filter((_, i) => i !== index));
      pendingFocusRef.current = { kind: "removed-row", index };
      queueMicrotask(() => {
        onCommit();
      });
    },
  });

  const handleAdd = () => {
    onRowsChange([...rows, makeEmptyRow()]);
    pendingFocusRef.current = { kind: "added-row", index: rows.length };
  };

  // Row-scoped focus-out protocol (moved verbatim from LinksEditorCell):
  // React's onBlur on the row container fires for each child blur. In
  // "row-blur" mode we check relatedTarget to detect whether the next focus
  // is still within the same row, committing only when focus leaves the row
  // entirely; in "field-blur" mode every child blur commits.
  const handleRowBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (commitOn === "row-blur") {
      const next = event.relatedTarget as Node | null;
      if (next && event.currentTarget.contains(next)) return;
    }
    queueMicrotask(() => {
      onCommit();
    });
  };

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: fieldset needs a legend child for its name, but the visible label lives outside this primitive (FieldShell kicker); fieldset's min-content sizing would also alter the existing layout
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-1.5"
    >
      {rows.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: rows lack stable identity
          key={index}
          ref={(el) => {
            rowRefs.current[index] = el;
          }}
          onBlur={handleRowBlur}
          data-testid={testIdPrefix ? `${testIdPrefix}row-${index}` : undefined}
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-2 py-1"
        >
          {renderRow(row, index, rowApi(index))}
        </div>
      ))}
      <button
        type="button"
        ref={addButtonRef}
        data-testid={testIdPrefix ? `${testIdPrefix}add` : undefined}
        onClick={handleAdd}
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
      >
        <PlusGlyph size={9} />
        {addLabel}
      </button>
    </div>
  );
}
