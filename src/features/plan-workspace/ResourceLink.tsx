import type {
  ReferenceClassification,
  ReferenceClassificationFailure,
} from "../../lib/plan/reference-resolver";
import { isSafeRelativeReferencePath } from "../../lib/plan/reference-target";
import { detectLinkPreset } from "../../lib/plan/resource-link-preset";
import { ResourceLinkIcon } from "./ResourceLinkIcon";

type ClassifyResult =
  | { ok: true; value: ReferenceClassification }
  | { ok: false; error: ReferenceClassificationFailure };

export interface ResourceLinkProps {
  label: string;
  target: string;
  result: ClassifyResult;
  onDocumentPreview?: (documentPath: string) => void;
}

function inferKind(target: string): "external_url" | "document_path" {
  return isSafeRelativeReferencePath(target) ? "document_path" : "external_url";
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

  return (
    <button
      type="button"
      onClick={() => onDocumentPreview?.(ref.documentPath)}
      className={chipClass}
    >
      <ResourceLinkIcon preset={preset} />
      {label}
    </button>
  );
}
