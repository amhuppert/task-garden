import { describe, expect, it } from "vitest";
import { createPlanRegistry } from "./plan-registry";

const YAML_A = "version: 1\nplan_id: task-garden-v1";
const YAML_B = "version: 1\nplan_id: another-plan";

const mockModules: Record<string, string> = {
  "/src/plans/task-garden-v1.yaml": YAML_A,
  "/src/plans/another-plan.yaml": YAML_B,
};

describe("createPlanRegistry", () => {
  const registry = createPlanRegistry(mockModules);

  it("resolves a registered plan by key", () => {
    const result = registry.resolve("task-garden-v1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.planKey).toBe("task-garden-v1");
      expect(result.value.rawDocument).toBe(YAML_A);
      expect(result.value.sourcePath).toBe("/src/plans/task-garden-v1.yaml");
      expect(result.value.displayName).toBe("Task Garden V1");
    }
  });

  it("returns plan_not_registered for an unknown key", () => {
    const result = registry.resolve("unknown-plan");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("plan_not_registered");
      expect(result.error.planKey).toBe("unknown-plan");
    }
  });

  it("lists all registered plans", () => {
    const plans = registry.list();
    expect(plans.length).toBe(2);
    const keys = plans.map((p) => p.planKey);
    expect(keys).toContain("task-garden-v1");
    expect(keys).toContain("another-plan");
  });

  it("generates a human-readable displayName from the plan key", () => {
    const result = registry.resolve("another-plan");
    if (result.ok) {
      expect(result.value.displayName).toBe("Another Plan");
    }
  });
});
