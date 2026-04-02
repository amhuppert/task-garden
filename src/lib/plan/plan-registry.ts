import type { PlanKey, Result } from "./plan-runtime-config";

export interface RegisteredPlanSource {
  planKey: PlanKey;
  sourcePath: string;
  displayName: string;
  rawDocument: string;
}

export type PlanSourceError =
  | { type: "plan_not_registered"; planKey: PlanKey; message: string }
  | { type: "plan_source_unavailable"; planKey: PlanKey; message: string };

export interface PlanRegistryService {
  resolve(planKey: PlanKey): Result<RegisteredPlanSource, PlanSourceError>;
  list(): readonly RegisteredPlanSource[];
}

function pathToPlanKey(path: string): string {
  const fileName = path.split("/").at(-1) ?? path;
  return fileName.replace(/\.yaml$/, "");
}

function planKeyToDisplayName(planKey: string): string {
  return planKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createPlanRegistry(
  modules: Record<string, string>,
): PlanRegistryService {
  const sources = new Map<string, RegisteredPlanSource>();

  for (const [path, rawDocument] of Object.entries(modules)) {
    const planKey = pathToPlanKey(path);
    sources.set(planKey, {
      planKey,
      sourcePath: path,
      displayName: planKeyToDisplayName(planKey),
      rawDocument,
    });
  }

  return {
    resolve(planKey) {
      const source = sources.get(planKey);
      if (!source) {
        return {
          ok: false,
          error: {
            type: "plan_not_registered",
            planKey,
            message: `Plan "${planKey}" is not registered. Add a YAML file at src/plans/${planKey}.yaml and check VITE_PLAN_KEY.`,
          },
        };
      }
      return { ok: true, value: source };
    },
    list() {
      return [...sources.values()];
    },
  };
}

// Compile-time registry built from all YAML files in src/plans/.
// Vite transforms import.meta.glob() at build/dev time; the result is inlined.
// Do NOT guard with typeof import.meta.glob — that identifier is undefined in the
// browser runtime even after transformation, so the guard would always fall through.
const planGlobModules: Record<string, string> = import.meta.glob<string>(
  "/src/plans/*.yaml",
  { query: "?raw", import: "default", eager: true },
);

export const planRegistry = createPlanRegistry(planGlobModules);

// Compile-time set of bundled Markdown document paths for repo-relative reference resolution.
const rawDocGlob = import.meta.glob("/memory-bank/**/*.md", {
  query: "?url",
  eager: false,
});

export const bundledDocumentPaths: ReadonlySet<string> = new Set(
  Object.keys(rawDocGlob),
);
