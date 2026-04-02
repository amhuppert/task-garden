// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanEmptyStateProps {
  /**
   * Message from the projection service explaining why the result set is
   * empty (e.g. "No work items match the active filters.").
   * Required so callers are explicit about the reason.
   */
  message: string;
  /** Called when the user wants to clear all active filters. */
  onClearFilters?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shown when a valid plan's search or filter criteria match zero work items.
 * This is NOT an error state — the plan itself is valid. The empty set is
 * the result of the user's current filter/search selection.
 */
export function PlanEmptyState({
  message,
  onClearFilters,
}: PlanEmptyStateProps) {
  return (
    <output
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      aria-label="No matching items"
    >
      {/* Quiet botanical mark */}
      <span className="text-3xl text-muted-foreground/40" aria-hidden="true">
        ◌
      </span>

      <div className="max-w-xs">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Try broadening your search or clearing the active filters.
        </p>
      </div>

      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="atlas-button-secondary atlas-field-focus text-sm"
        >
          Clear filters
        </button>
      )}
    </output>
  );
}
