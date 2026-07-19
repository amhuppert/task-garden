import type {
  ReferenceClassification,
  ReferenceClassificationFailure,
} from "../../lib/plan/reference-resolver";
import { isSafeRelativeReferencePath } from "../../lib/plan/reference-target";
import { detectLinkPreset } from "../../lib/plan/resource-link-preset";
import { ResourceLinkIcon } from "./ResourceLinkIcon";
import { Tooltip } from "./ui/Tooltip";

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
  "flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted";

function ChipLabel({ label }: { label: string }) {
  return <span className="max-w-[24ch] truncate">{label}</span>;
}

export function ResourceLink({
  label,
  target,
  result,
  onDocumentPreview,
}: ResourceLinkProps) {
  if (!result.ok) {
    const kind = inferKind(target);
    const preset = detectLinkPreset(target, kind);
    // aria-disabled (not disabled) keeps the chip focusable so keyboard/AT
    // users can reach the tooltip explaining why the reference is unusable.
    return (
      <Tooltip content={result.error.message}>
        <button
          type="button"
          aria-disabled="true"
          className={`${chipClass} opacity-50 cursor-not-allowed bg-surface-muted`}
        >
          <ResourceLinkIcon preset={preset} />
          <ChipLabel label={label} />
        </button>
      </Tooltip>
    );
  }

  const ref = result.value;
  const preset = detectLinkPreset(
    ref.kind === "external_url" ? ref.href : target,
    ref.kind,
  );
  const tooltipContent = `${label} — ${target}`;

  if (ref.kind === "external_url") {
    return (
      <Tooltip content={tooltipContent}>
        <a
          href={ref.href}
          target="_blank"
          rel="noopener noreferrer"
          className={chipClass}
        >
          <ResourceLinkIcon preset={preset} />
          <ChipLabel label={label} />
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        onClick={() => onDocumentPreview?.(ref.documentPath)}
        className={chipClass}
      >
        <ResourceLinkIcon preset={preset} />
        <ChipLabel label={label} />
      </button>
    </Tooltip>
  );
}
