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

export function WriteThroughStatusFooter() {
  const lastWriteResult = useLastWriteResult();
  const retry = useEditStoreRetry();
  const pendingRetry = useEditStorePendingRetry();

  if (lastWriteResult.phase === "idle") {
    return (
      <output
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <StatusDot tone="done" />
        <span>Synced</span>
      </output>
    );
  }

  if (lastWriteResult.phase === "saving") {
    return (
      <output
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <StatusDot tone="water" />
        <span>Saving …</span>
      </output>
    );
  }

  if (lastWriteResult.phase === "saved") {
    return (
      <output
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <StatusDot tone="done" />
        <span>Saved</span>
      </output>
    );
  }

  const isNetworkError = lastWriteResult.copy.code === "network";

  if (isNetworkError) {
    const canRetry = lastWriteResult.canRetry && pendingRetry !== null;
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
        role="alert"
      >
        <StatusDot tone="caution" />
        <span>Write failed — CLI offline</span>
        <button
          type="button"
          className="atlas-button-secondary px-2 py-1 text-[0.68rem]"
          onClick={() => {
            void retry();
          }}
          disabled={!canRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
      role="alert"
    >
      <StatusDot tone="caution" />
      <span>{lastWriteResult.copy.title}</span>
    </div>
  );
}
