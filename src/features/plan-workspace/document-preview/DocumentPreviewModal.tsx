import { useEffect } from "react";
import type { DocumentErrorCode } from "../../../lib/plan/plan-api-client";
import {
  type UseDocumentDeps,
  useDocument,
} from "../../../lib/plan/use-document";

export interface DocumentPreviewModalProps {
  /** Repo-relative document path, or null when no document is being previewed. */
  documentPath: string | null;
  /** Called when the user dismisses the modal. */
  onClose: () => void;
  /** Optional dependency injection for testing the loading/error phases. */
  deps?: UseDocumentDeps;
}

function describeError(code: DocumentErrorCode): string {
  switch (code) {
    case "unsafe_path":
      return "This document path is not allowed.";
    case "document_not_found":
      return "Document not found.";
    case "document_read_failed":
      return "Could not read the document.";
  }
}

export function DocumentPreviewModal({
  documentPath,
  onClose,
  deps,
}: DocumentPreviewModalProps) {
  const docState = useDocument(documentPath, deps);
  const isOpen = docState.phase !== "idle";

  // The dialog uses non-modal `open`, so the native Esc-to-cancel behavior
  // never applies — close on Escape ourselves.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex h-full w-full max-h-none max-w-none items-center justify-center bg-background/80 backdrop-blur-sm m-0 p-0 border-none"
      aria-modal="true"
      aria-label={`Document preview: ${documentPath ?? ""}`}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="atlas-panel relative mx-4 flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="atlas-kicker mb-0.5">Document Preview</p>
            <p
              className="truncate font-mono text-xs text-muted-foreground"
              title={documentPath ?? undefined}
            >
              {documentPath}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="ml-3 shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-muted"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {docState.phase === "loading" && (
            <output
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
              aria-label="Loading document"
            >
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-moss"
                aria-hidden="true"
              />
              <p className="text-xs text-muted-foreground">Loading…</p>
            </output>
          )}

          {docState.phase === "loaded" && (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
              {docState.content}
            </pre>
          )}

          {docState.phase === "error" && (
            <div
              className="atlas-panel mx-auto max-w-md px-4 py-4"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xl text-petal" aria-hidden="true">
                  ⚠
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-medium text-foreground">
                    Couldn't load document
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {describeError(docState.code)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
