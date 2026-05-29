import { useEffect, useState } from "react";
import { type DraftKey, useLastWriteResult } from "./edit.store";

interface FieldSaveIndicatorProps {
  stateKey: DraftKey;
}

const SAVED_AUTO_CLEAR_MS = 1400;

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

  if (matchesSaving) {
    return (
      <output className="atlas-microchip" aria-live="polite">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ backgroundColor: "var(--color-water)" }}
        />
        Saving
      </output>
    );
  }

  if (matchesSaved && !savedHidden) {
    return (
      <output className="atlas-microchip" aria-live="polite">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--color-status-done)" }}
        />
        Saved
      </output>
    );
  }

  return null;
}
