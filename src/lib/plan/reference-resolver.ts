import type { Result } from "./result";

// ---------------------------------------------------------------------------
// Classification — the public API
// ---------------------------------------------------------------------------

export type ReferenceClassification =
  | { kind: "external_url"; label: string; href: string }
  | { kind: "document_path"; label: string; documentPath: string };

export type ReferenceClassificationFailure = {
  type: "unsupported_target_format";
  target: string;
  message: string;
};

export type ReferenceClassificationResult = Result<
  ReferenceClassification,
  ReferenceClassificationFailure
>;

/**
 * Classifies a reference target string into either an external URL or a
 * repo-relative document path. No I/O — document content is fetched on
 * demand by callers via the document API.
 */
export function classifyReference(
  target: string,
  label: string,
): ReferenceClassificationResult {
  if (/^https?:\/\/.+/.test(target)) {
    return {
      ok: true,
      value: { kind: "external_url", label, href: target },
    };
  }

  if (/^[a-zA-Z0-9].*\.md$/.test(target) && !target.includes("..")) {
    return {
      ok: true,
      value: { kind: "document_path", label, documentPath: target },
    };
  }

  return {
    ok: false,
    error: {
      type: "unsupported_target_format",
      target,
      message: `Reference target "${target}" is not a supported format. Use an http/https URL or a repo-relative .md path (must not start with '/' or '.' and must not contain '..').`,
    },
  };
}
