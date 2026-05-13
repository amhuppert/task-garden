import { useEffect, useRef, useState } from "react";
import { parse as parseYaml } from "yaml";
import {
  type PlanAnalysisEngineService,
  type PlanAnalysisSnapshot,
  planAnalysisEngine,
} from "../graph/plan-analysis-engine";
import type { ValidationIssue } from "./task-garden-plan.schema";
import {
  TaskGardenPlanSchemaService,
  type TaskGardenPlanSchemaServiceInterface,
} from "./task-garden-plan.schema";

export type { PlanAnalysisSnapshot };

// ---------------------------------------------------------------------------
// Input + processing state types
// ---------------------------------------------------------------------------

export interface PlanProcessingInput {
  source: string;
  revision: number;
}

export interface PlanProcessingReady {
  status: "ready";
  input: PlanProcessingInput;
  snapshot: PlanAnalysisSnapshot;
}

export interface PlanProcessingInvalid {
  status: "invalid";
  input: PlanProcessingInput;
  failure: PlanProcessingFailure;
}

export interface PlanProcessingLoading {
  status: "loading";
}

export type PlanProcessingState =
  | PlanProcessingLoading
  | PlanProcessingReady
  | PlanProcessingInvalid;

export type PlanProcessingFailure =
  | { type: "parse"; issues: string[] }
  | { type: "validation"; issues: ValidationIssue[] };

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface PlanProcessingPipelineService {
  process(input: PlanProcessingInput): PlanProcessingState;
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
    process(input: PlanProcessingInput): PlanProcessingState {
      let parsed: unknown;
      try {
        parsed = parseYaml(input.source);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown YAML parse error";
        return {
          status: "invalid",
          input,
          failure: { type: "parse", issues: [message] },
        };
      }

      const validationResult = schemaService.parse(parsed);
      if (!validationResult.ok) {
        return {
          status: "invalid",
          input,
          failure: { type: "validation", issues: [...validationResult.error] },
        };
      }

      const snapshot = analysisEngine.build(validationResult.value);

      return {
        status: "ready",
        input,
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
 * Reactive hook that processes the current input into a PlanProcessingState.
 * Reprocesses whenever input.revision changes. Replaces prior ready state
 * immediately when the current input becomes invalid.
 */
export function usePlanProcessing(
  input: PlanProcessingInput | null,
): PlanProcessingState {
  const [processingState, setProcessingState] = useState<PlanProcessingState>(
    () =>
      input !== null
        ? planProcessingPipeline.process(input)
        : { status: "loading" },
  );

  const lastRevision = useRef<number | null>(input?.revision ?? null);

  useEffect(() => {
    if (input === null) {
      setProcessingState({ status: "loading" });
      lastRevision.current = null;
      return;
    }

    if (input.revision === lastRevision.current) {
      return;
    }

    lastRevision.current = input.revision;
    setProcessingState(planProcessingPipeline.process(input));
  }, [input]);

  return processingState;
}
