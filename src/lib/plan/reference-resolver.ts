import type { Result } from "./plan-runtime-config";
import type { ReferenceTarget } from "./task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export type ResolvedReference =
  | {
      kind: "external_url";
      label: string;
      href: string;
    }
  | {
      kind: "bundled_document";
      label: string;
      documentPath: string;
      rawDocument: string;
    };

export type ReferenceResolutionFailure =
  | {
      type: "unsupported_target_format";
      target: ReferenceTarget;
      message: string;
    }
  | {
      type: "document_not_registered";
      target: ReferenceTarget;
      message: string;
    };

export interface ReferenceResolverService {
  resolve(
    target: ReferenceTarget,
    label: string,
  ): Result<ResolvedReference, ReferenceResolutionFailure>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a ReferenceResolverService backed by the provided document map.
 *
 * `modules` keys are expected to be absolute-from-root paths as produced by
 * `import.meta.glob` (e.g. `/memory-bank/foo.md`). They are normalised to
 * repo-relative paths (e.g. `memory-bank/foo.md`) for lookup, matching the
 * format of `ReferenceTarget` values in authored plan files.
 */
export function createReferenceResolver(
  modules: Record<string, string>,
): ReferenceResolverService {
  // Build an internal map keyed by repo-relative paths (no leading slash).
  const registry = new Map<string, string>();
  for (const [path, content] of Object.entries(modules)) {
    const repoRelativePath = path.startsWith("/") ? path.slice(1) : path;
    registry.set(repoRelativePath, content);
  }

  return {
    resolve(target, label) {
      // External URL — pass through unchanged.
      if (/^https?:\/\/.+/.test(target)) {
        return {
          ok: true,
          value: { kind: "external_url", label, href: target },
        };
      }

      // Repo-relative Markdown path — look up in bundled registry.
      if (/^[a-zA-Z0-9].*\.md$/.test(target) && !target.includes("..")) {
        const rawDocument = registry.get(target);
        if (rawDocument !== undefined) {
          return {
            ok: true,
            value: {
              kind: "bundled_document",
              label,
              documentPath: target,
              rawDocument,
            },
          };
        }
        return {
          ok: false,
          error: {
            type: "document_not_registered",
            target,
            message: `Document "${target}" is not in the bundled document set. Only Markdown files included at build time can be previewed.`,
          },
        };
      }

      // Unsupported format.
      return {
        ok: false,
        error: {
          type: "unsupported_target_format",
          target,
          message: `Reference target "${target}" is not a supported format. Use an http/https URL or a repo-relative .md path (must not start with '/' or '.' and must not contain '..').`,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton — document registry built at compile time via Vite glob imports
// ---------------------------------------------------------------------------

// Compile-time document registry built via Vite glob imports.
// Do NOT guard with typeof import.meta.glob — Vite transforms the call at
// build/dev time but does NOT inject it as a runtime function, so the guard
// would always fall through to {} in the browser.
const documentGlobModules: Record<string, string> = import.meta.glob<string>(
  ["/memory-bank/**/*.md", "/src/**/*.md"],
  { query: "?raw", import: "default", eager: true },
);

export const referenceResolver: ReferenceResolverService =
  createReferenceResolver(documentGlobModules);
