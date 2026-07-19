import { useEffect, useState } from "react";
import { LiveRegion } from "../ui/LiveRegion";
import { type DraftKey, useLastWriteResult } from "./edit.store";

interface FieldSaveIndicatorProps {
  stateKey: DraftKey;
}

const SAVED_AUTO_CLEAR_MS = 1400;

/**
 * Announces per-field write progress ("Saving"/"Saved") for the cell whose
 * draft key matches the store's last write. The live region persists across
 * phases (empty when this key is not the one being written) so assistive
 * technology hears every transition; "Saved" clears itself after 1.4s.
 */
export function FieldSaveIndicator({ stateKey }: FieldSaveIndicatorProps) {
  const lastWriteResult = useLastWriteResult();
  const [savedHidden, setSavedHidden] = useState(false);

  const matchesSaving =
    lastWriteResult.phase === "saving" && lastWriteResult.key === stateKey;
  const matchesSaved =
    lastWriteResult.phase === "saved" && lastWriteResult.key === stateKey;

  useEffect(() => {
    if (!matchesSaved) {
      setSavedHidden(false);
      return;
    }
    const id = setTimeout(() => setSavedHidden(true), SAVED_AUTO_CLEAR_MS);
    return () => clearTimeout(id);
  }, [matchesSaved]);

  const message = matchesSaving
    ? ("Saving" as const)
    : matchesSaved && !savedHidden
      ? ("Saved" as const)
      : null;

  return (
    <LiveRegion
      kind="status"
      className={message === null ? undefined : "atlas-microchip"}
    >
      {message === null ? null : (
        <>
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              message === "Saving" ? "animate-pulse" : ""
            }`}
            style={{
              backgroundColor:
                message === "Saving"
                  ? "var(--color-water)"
                  : "var(--color-status-done)",
            }}
          />
          {message}
        </>
      )}
    </LiveRegion>
  );
}
