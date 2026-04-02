import { describe, expect, it } from "vitest";
import type { RegisteredPlanSource } from "./plan-registry";
import { buildPlanSourceEmission } from "./plan-source-subscription";

const mockSource: RegisteredPlanSource = {
  planKey: "task-garden-v1",
  sourcePath: "/src/plans/task-garden-v1.yaml",
  displayName: "Task Garden V1",
  rawDocument: "version: 1\nplan_id: task-garden-v1",
};

describe("buildPlanSourceEmission", () => {
  it("builds an emission with the provided source and versions", () => {
    const emission = buildPlanSourceEmission(mockSource, "src-1", "schema-1");
    expect(emission.source).toBe(mockSource);
    expect(emission.sourceVersion).toBe("src-1");
    expect(emission.schemaVersion).toBe("schema-1");
  });

  it("produces a refreshKey that combines sourceVersion and schemaVersion", () => {
    const emission = buildPlanSourceEmission(mockSource, "src-1", "schema-1");
    expect(emission.refreshKey).toBe("src-1:schema-1");
  });

  it("produces distinct refreshKeys when either version changes", () => {
    const e1 = buildPlanSourceEmission(mockSource, "src-1", "schema-1");
    const e2 = buildPlanSourceEmission(mockSource, "src-2", "schema-1");
    const e3 = buildPlanSourceEmission(mockSource, "src-1", "schema-2");
    expect(e1.refreshKey).not.toBe(e2.refreshKey);
    expect(e1.refreshKey).not.toBe(e3.refreshKey);
  });
});
