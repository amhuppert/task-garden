import { describe, expect, it } from "vitest";
import { createPlanAnalysisEngine } from "../graph/plan-analysis-engine";
import {
  type PlanProcessingInput,
  type PlanProcessingPipelineService,
  createPlanProcessingPipeline,
} from "./plan-processing-pipeline";
import { createTaskGardenPlanSchemaService } from "./task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_YAML = `
version: 1
plan_id: test-plan
title: Test Plan
last_updated: "2024-01-01"
summary: A plan for testing.
lanes:
  - id: backlog
    label: Backlog
work_items:
  - id: task-a
    title: Task A
    summary: First task.
    lane: backlog
    status: planned
    priority: p1
`.trim();

const INVALID_YAML_PARSE = `
version: 1
  bad indent: [unclosed
`.trim();

const INVALID_YAML_SCHEMA = `
version: 1
plan_id: test-plan
title: Test Plan
last_updated: "2024-01-01"
summary: A plan for testing.
lanes:
  - id: backlog
    label: Backlog
work_items:
  - id: task-a
    title: Task A
    summary: First task.
    lane: does-not-exist
    status: planned
    priority: p1
`.trim();

function makeInput(source: string, revision = 1): PlanProcessingInput {
  return { source, revision };
}

function makePipeline(): PlanProcessingPipelineService {
  return createPlanProcessingPipeline(
    createTaskGardenPlanSchemaService(),
    createPlanAnalysisEngine(),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlanProcessingPipeline", () => {
  describe("process() with valid YAML", () => {
    it("returns ready state", () => {
      const pipeline = makePipeline();
      const input = makeInput(VALID_YAML);
      const result = pipeline.process(input);
      expect(result.status).toBe("ready");
    });

    it("ready state carries the input", () => {
      const pipeline = makePipeline();
      const input = makeInput(VALID_YAML);
      const result = pipeline.process(input);
      if (result.status !== "ready") throw new Error("expected ready");
      expect(result.input).toBe(input);
    });

    it("ready state carries a snapshot with the validated plan", () => {
      const pipeline = makePipeline();
      const input = makeInput(VALID_YAML);
      const result = pipeline.process(input);
      if (result.status !== "ready") throw new Error("expected ready");
      expect(result.snapshot.plan.plan_id).toBe("test-plan");
    });

    it("is deterministic — same input produces identical plan_id", () => {
      const pipeline = makePipeline();
      const input = makeInput(VALID_YAML);
      const r1 = pipeline.process(input);
      const r2 = pipeline.process(input);
      if (r1.status !== "ready" || r2.status !== "ready")
        throw new Error("expected ready");
      expect(r1.snapshot.plan.plan_id).toBe(r2.snapshot.plan.plan_id);
    });
  });

  describe("process() with YAML parse errors", () => {
    it("returns invalid state", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_PARSE);
      const result = pipeline.process(input);
      expect(result.status).toBe("invalid");
    });

    it("failure type is 'parse'", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_PARSE);
      const result = pipeline.process(input);
      if (result.status !== "invalid") throw new Error("expected invalid");
      expect(result.failure.type).toBe("parse");
    });

    it("parse failure carries at least one issue message", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_PARSE);
      const result = pipeline.process(input);
      if (result.status !== "invalid") throw new Error("expected invalid");
      if (result.failure.type !== "parse")
        throw new Error("expected parse failure");
      expect(result.failure.issues.length).toBeGreaterThan(0);
    });

    it("invalid state carries the input", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_PARSE);
      const result = pipeline.process(input);
      if (result.status !== "invalid") throw new Error("expected invalid");
      expect(result.input).toBe(input);
    });
  });

  describe("process() with schema validation errors", () => {
    it("returns invalid state", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_SCHEMA);
      const result = pipeline.process(input);
      expect(result.status).toBe("invalid");
    });

    it("failure type is 'validation'", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_SCHEMA);
      const result = pipeline.process(input);
      if (result.status !== "invalid") throw new Error("expected invalid");
      expect(result.failure.type).toBe("validation");
    });

    it("validation failure carries ValidationIssue array", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_SCHEMA);
      const result = pipeline.process(input);
      if (result.status !== "invalid") throw new Error("expected invalid");
      if (result.failure.type !== "validation")
        throw new Error("expected validation failure");
      expect(result.failure.issues.length).toBeGreaterThan(0);
      expect(result.failure.issues[0]).toHaveProperty("code");
      expect(result.failure.issues[0]).toHaveProperty("message");
    });

    it("invalid state carries the input", () => {
      const pipeline = makePipeline();
      const input = makeInput(INVALID_YAML_SCHEMA);
      const result = pipeline.process(input);
      if (result.status !== "invalid") throw new Error("expected invalid");
      expect(result.input).toBe(input);
    });
  });

  describe("processing is deterministic", () => {
    it("same source text produces same status regardless of revision", () => {
      const pipeline = makePipeline();
      const validInput = makeInput(VALID_YAML, 1);
      const invalidInput = makeInput(INVALID_YAML_SCHEMA, 2);
      const validInputAgain = makeInput(VALID_YAML, 3);

      const r1 = pipeline.process(validInput);
      const r2 = pipeline.process(invalidInput);
      const r3 = pipeline.process(validInputAgain);

      expect(r1.status).toBe("ready");
      expect(r2.status).toBe("invalid");
      expect(r3.status).toBe("ready");
    });
  });
});
