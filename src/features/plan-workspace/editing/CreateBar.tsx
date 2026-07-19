import type { ReactNode } from "react";
import { LiveRegion } from "../ui/LiveRegion";

export interface CreateBarProps {
  primaryLabel: string;
  primaryDisabled?: boolean;
  busy?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Optional extra content rendered between secondary and primary (e.g. status copy). */
  hint?: ReactNode;
}

/**
 * Footer chrome for forms that create or commit a record. Matches the
 * prototype in `edit-components.jsx` ~l.726: a right-aligned action bar with
 * a primary CTA and optional secondary (Cancel-style) action. The hint slot
 * is a persistent status live region, so hint changes are announced to AT.
 */
export function CreateBar({
  primaryLabel,
  primaryDisabled = false,
  busy = false,
  onPrimary,
  secondaryLabel,
  onSecondary,
  hint,
}: CreateBarProps) {
  return (
    <div
      data-testid="create-bar"
      className="flex items-center justify-between gap-3 border-t border-border bg-surface/60 px-3 py-2"
    >
      <LiveRegion
        kind="status"
        className="min-w-0 flex-1 text-xs text-muted-foreground"
      >
        {hint}
      </LiveRegion>
      <div className="flex shrink-0 items-center gap-2">
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            data-testid="create-bar-secondary"
            onClick={onSecondary}
            disabled={busy}
            className="atlas-button-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          data-testid="create-bar-primary"
          onClick={onPrimary}
          disabled={primaryDisabled || busy}
          aria-busy={busy || undefined}
          className="atlas-button-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : primaryLabel}
        </button>
      </div>
    </div>
  );
}
