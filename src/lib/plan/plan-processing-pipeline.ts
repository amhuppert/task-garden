import { useEffect, useRef, useState } from "react";
import { parse as parseYaml } from "yaml";
import {
  type PlanAnalysisEngineService,
  type PlanAnalysisSnapshot,
  planAnalysisEngine,
} from "../graph/plan-analysis-engine";
import type { PlanKey } from "./plan-runtime-config";
import type { PlanSourceEmission } from "./plan-source-subscription";
import type { ValidationIssue } from "./task-garden-plan.schema";
import {
  TaskGardenPlanSchemaService,
  type TaskGardenPlanSchemaServiceInterface,
} from "./task-garden-plan.schema";

export type { PlanAnalysisSnapshot };

// ---------------------------------------------------------------------------
// Processing state types
// ---------------------------------------------------------------------------

export interface PlanProcessingReady {
  status: "ready";
  source: PlanSourceEmission;
  snapshot: PlanAnalysisSnapshot;
}

export interface PlanProcessingInvalid {
  status: "invalid";
  source: PlanSourceEmission | null;
  failure: PlanProcessingFailure;
}

export interface PlanProcessingLoading {
  status: "loading";
  planKey: PlanKey;
}

export type PlanProcessingState =
  | PlanProcessingLoading
  | PlanProcessingReady
  | PlanProcessingInvalid;

export type PlanProcessingFailure =
  | { type: "source"; issues: string[] }
  | { type: "parse"; issues: string[] }
  | { type: "validation"; issues: ValidationIssue[] };

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface PlanProcessingPipelineService {
  process(source: PlanSourceEmission): PlanProcessingState;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Testable factory — inject schema service and analysis engine.
 * Processing is deterministic for a given source text and schema version.
 */
export function createPlanProcessingPipeline(
  schemaService: TaskGardenPlanSchemaServiceInterface,
  analysisEngine: PlanAnalysisEngineService,
): PlanProcessingPipelineService {
  return {
    process(source: PlanSourceEmission): PlanProcessingState {
      const rawDocument = source.source.rawDocument;

      // 1. Parse YAML
      let parsed: unknown;
      try {
        parsed = parseYaml(rawDocument);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown YAML parse error";
        return {
          status: "invalid",
          source,
          failure: { type: "parse", issues: [message] },
        };
      }

      // 2. Validate through schema boundary
      const validationResult = schemaService.parse(parsed);
      if (!validationResult.ok) {
        return {
          status: "invalid",
          source,
          failure: { type: "validation", issues: [...validationResult.error] },
        };
      }

      // 3. Build analysis snapshot from trusted validated data
      const snapshot = analysisEngine.build(validationResult.value);

      return {
        status: "ready",
        source,
        snapshot,
      };
    },
  };
}

/** Singleton bound to the default schema service and analysis engine. */
export const planProcessingPipeline: PlanProcessingPipelineService =
  createPlanProcessingPipeline(TaskGardenPlanSchemaService, planAnalysisEngine);

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Reactive hook that processes the current source emission into a
 * PlanProcessingState. Reprocesses whenever source.refreshKey changes.
 * Replaces prior ready state immediately when the current source becomes invalid.
 */
export function usePlanProcessing(
  source: PlanSourceEmission | null,
): PlanProcessingState {
  const planKey = source?.source.planKey ?? "";

  const [processingState, setProcessingState] = useState<PlanProcessingState>(
    () =>
      source !== null
        ? planProcessingPipeline.process(source)
        : { status: "loading", planKey },
  );

  // Track the last seen refreshKey so we only reprocess on actual changes.
  const lastRefreshKey = useRef<string | null>(source?.refreshKey ?? null);

  useEffect(() => {
    if (source === null) {
      setProcessingState({ status: "loading", planKey: "" });
      lastRefreshKey.current = null;
      return;
    }

    if (source.refreshKey === lastRefreshKey.current) {
      return;
    }

    lastRefreshKey.current = source.refreshKey;
    // Process synchronously — replace prior ready state immediately on invalid.
    const next = planProcessingPipeline.process(source);
    setProcessingState(next);
  }, [source]);

  return processingState;
}
