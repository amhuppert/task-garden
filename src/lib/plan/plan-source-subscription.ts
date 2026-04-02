import { useEffect, useState } from "react";
import { planRegistry } from "./plan-registry";
import type { PlanSourceError, RegisteredPlanSource } from "./plan-registry";
import type { PlanKey, Result } from "./plan-runtime-config";

export interface PlanSourceEmission {
  source: RegisteredPlanSource;
  sourceVersion: string;
  schemaVersion: string;
  /** Changes whenever sourceVersion or schemaVersion changes — use as a reprocessing trigger. */
  refreshKey: string;
}

export function buildPlanSourceEmission(
  source: RegisteredPlanSource,
  sourceVersion: string,
  schemaVersion: string,
): PlanSourceEmission {
  return {
    source,
    sourceVersion,
    schemaVersion,
    refreshKey: `${sourceVersion}:${schemaVersion}`,
  };
}

// Module-level refresh counter incremented by Vite HMR events.
// Changing this triggers re-renders in consumers of useSelectedPlanSource.
let refreshCount = 0;
const hmrListeners = new Set<() => void>();

function notifyListeners() {
  refreshCount++;
  for (const listener of hmrListeners) {
    listener();
  }
}

// Stable schema version token — replaced when the schema module hot-reloads.
// Using a module-level variable means schema edits naturally increment refreshCount.
let schemaVersionToken = "schema-v1";

if (import.meta.hot) {
  // Re-emit whenever any module in the dev graph updates (covers YAML and schema changes).
  import.meta.hot.on("vite:afterUpdate", (payload) => {
    const affectsSchema = payload.updates.some((u) =>
      u.path.includes("plan-schema"),
    );
    if (affectsSchema) {
      schemaVersionToken = `schema-v${refreshCount + 1}`;
    }
    notifyListeners();
  });
}

/**
 * Reactive hook that returns the current source emission for the given plan key.
 * Re-renders whenever the selected YAML or schema module changes during development.
 */
export function useSelectedPlanSource(
  planKey: PlanKey,
): Result<PlanSourceEmission, PlanSourceError> {
  const [tick, setTick] = useState(refreshCount);

  useEffect(() => {
    const notify = () => setTick((c) => c + 1);
    hmrListeners.add(notify);
    return () => {
      hmrListeners.delete(notify);
    };
  }, []);

  const sourceResult = planRegistry.resolve(planKey);
  if (!sourceResult.ok) {
    return sourceResult;
  }

  const emission = buildPlanSourceEmission(
    sourceResult.value,
    String(tick),
    schemaVersionToken,
  );
  return { ok: true, value: emission };
}
