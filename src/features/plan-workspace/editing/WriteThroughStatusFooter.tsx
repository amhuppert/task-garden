import { LiveRegion } from "../ui/LiveRegion";
import {
  useEditStorePendingRetry,
  useEditStoreRetry,
  useLastWriteResult,
} from "./edit.store";

function StatusDot({ tone }: { tone: "idle" | "water" | "done" | "caution" }) {
  const color =
    tone === "water"
      ? "var(--color-water)"
      : tone === "done"
        ? "var(--color-status-done)"
        : tone === "caution"
          ? "var(--color-pollen)"
          : "var(--color-muted-foreground)";
  const pulseClass = tone === "water" ? "animate-pulse" : "";
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 rounded-full ${pulseClass}`}
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Workspace-wide write-through status line: announces sync progress
 * (Synced/Saving/Saved) politely and write failures assertively, with a
 * Retry action for recoverable network failures. Both live regions persist
 * across all phases — only their text swaps — so assistive technology hears
 * every transition.
 */
export function WriteThroughStatusFooter() {
  const lastWriteResult = useLastWriteResult();
  const retry = useEditStoreRetry();
  const pendingRetry = useEditStorePendingRetry();

  const phase = lastWriteResult.phase;
  const isNetworkError =
    phase === "error" && lastWriteResult.copy.code === "network";
  const canRetry =
    isNetworkError && lastWriteResult.canRetry && pendingRetry !== null;

  const status =
    phase === "idle"
      ? { tone: "done" as const, text: "Synced" }
      : phase === "saving"
        ? { tone: "water" as const, text: "Saving …" }
        : phase === "saved"
          ? { tone: "done" as const, text: "Saved" }
          : null;

  const alertText =
    phase === "error"
      ? isNetworkError
        ? "Write failed — CLI offline"
        : lastWriteResult.copy.title
      : null;

  return (
    <div className="flex items-center px-3 py-2 text-xs text-muted-foreground">
      <LiveRegion
        kind="status"
        className={status === null ? undefined : "flex items-center gap-2"}
      >
        {status === null ? null : (
          <>
            <StatusDot tone={status.tone} />
            <span>{status.text}</span>
          </>
        )}
      </LiveRegion>
      <LiveRegion
        kind="alert"
        className={alertText === null ? undefined : "flex items-center gap-2"}
      >
        {alertText === null ? null : (
          <>
            <StatusDot tone="caution" />
            <span>{alertText}</span>
          </>
        )}
      </LiveRegion>
      {isNetworkError ? (
        // aria-disabled keeps the button focusable so the unavailability
        // reason is discoverable; the click guard replaces native disabled.
        <button
          type="button"
          className="atlas-button-secondary ml-2 px-2 py-1 text-[0.68rem]"
          aria-disabled={!canRetry}
          onClick={() => {
            if (!canRetry) {
              return;
            }
            void retry();
          }}
        >
          Retry
          {canRetry ? null : (
            <span className="sr-only"> (unavailable — no pending write)</span>
          )}
        </button>
      ) : null}
    </div>
  );
}
