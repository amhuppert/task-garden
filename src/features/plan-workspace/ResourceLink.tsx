import type {
  ReferenceResolutionFailure,
  ResolvedReference,
} from "../../lib/plan/reference-resolver";
import { detectLinkPreset } from "../../lib/plan/resource-link-preset";
import { ResourceLinkIcon } from "./ResourceLinkIcon";

type ResolveResult =
  | { ok: true; value: ResolvedReference }
  | { ok: false; error: ReferenceResolutionFailure };

export interface ResourceLinkProps {
  label: string;
  target: string;
  result: ResolveResult;
  onDocumentPreview?: (documentPath: string, rawDocument: string) => void;
}

function inferKind(target: string): "external_url" | "bundled_document" {
  return /^[a-zA-Z0-9].*\.md$/.test(target) && !target.includes("..")
    ? "bundled_document"
    : "external_url";
}

const chipClass =
  "flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted";

export function ResourceLink({
  label,
  target,
  result,
  onDocumentPreview,
}: ResourceLinkProps) {
  if (!result.ok) {
    const kind = inferKind(target);
    const preset = detectLinkPreset(target, kind);
    return (
      <button
        type="button"
        disabled
        title={result.error.message}
        className={`${chipClass} opacity-50 cursor-not-allowed bg-surface-muted`}
      >
        <ResourceLinkIcon preset={preset} />
        {label}
      </button>
    );
  }

  const ref = result.value;
  const preset = detectLinkPreset(
    ref.kind === "external_url" ? ref.href : target,
    ref.kind,
  );

  if (ref.kind === "external_url") {
    return (
      <a
        href={ref.href}
        target="_blank"
        rel="noopener noreferrer"
        className={chipClass}
      >
        <ResourceLinkIcon preset={preset} />
        {label}
      </a>
    );
  }

  // bundled_document
  return (
    <button
      type="button"
      onClick={() => onDocumentPreview?.(ref.documentPath, ref.rawDocument)}
      className={chipClass}
    >
      <ResourceLinkIcon preset={preset} />
      {label}
    </button>
  );
}
