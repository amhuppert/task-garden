import { FloatingPortal } from "@floating-ui/react";
import { useEffect } from "react";
import { useEditStore, useLastWriteResult } from "./edit.store";
import { CloseGlyph } from "./glyphs";

const AUTO_DISMISS_MS = 6000;

const NON_VALIDATION_CODES = new Set(["network", "write_failed", "unknown"]);

export function ValidationToast() {
  const lastWriteResult = useLastWriteResult();

  const isShowing =
    lastWriteResult.phase === "error" &&
    !NON_VALIDATION_CODES.has(lastWriteResult.copy.code);

  const errorKey =
    lastWriteResult.phase === "error" ? lastWriteResult.key : null;

  useEffect(() => {
    if (!isShowing || errorKey === null) return;
    const id = setTimeout(() => {
      useEditStore.getState().resetErrorFor(errorKey);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [isShowing, errorKey]);

  if (!isShowing || lastWriteResult.phase !== "error") return null;

  const { copy, key } = lastWriteResult;

  return (
    <FloatingPortal>
      <div
        className="atlas-panel fixed top-4 right-4 z-50 flex max-w-sm items-start gap-3 px-4 py-3"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex-1">
          <p className="atlas-kicker text-pollen">{copy.title}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {copy.detail}
          </p>
          <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
            {copy.code}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close notification"
          onClick={() => useEditStore.getState().resetErrorFor(key)}
        >
          <CloseGlyph size={14} />
        </button>
      </div>
    </FloatingPortal>
  );
}
