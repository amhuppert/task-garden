import { describe, expect, it } from "vitest";
import { createPlanRuntimeConfig } from "./plan-runtime-config";

describe("createPlanRuntimeConfig", () => {
  it("returns missing_plan_key error when VITE_PLAN_KEY is empty", () => {
    const config = createPlanRuntimeConfig({ VITE_PLAN_KEY: "" });
    const result = config.resolve();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("missing_plan_key");
      expect(result.error.message).toContain("VITE_PLAN_KEY");
    }
  });

  it("returns missing_plan_key error when VITE_PLAN_KEY is absent", () => {
    const config = createPlanRuntimeConfig({});
    const result = config.resolve();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("missing_plan_key");
    }
  });

  it("returns planKey when VITE_PLAN_KEY is set", () => {
    const config = createPlanRuntimeConfig({ VITE_PLAN_KEY: "task-garden-v1" });
    const result = config.resolve();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.planKey).toBe("task-garden-v1");
    }
  });
});
