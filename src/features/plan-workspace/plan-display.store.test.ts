import { beforeEach, describe, expect, it } from "vitest";
import { usePlanDisplayStore } from "./plan-display.store";

beforeEach(() => {
  usePlanDisplayStore.setState({
    colorMode: "default",
    sizeMode: "uniform",
    insightMode: "overview",
  });
});

describe("usePlanDisplayStore", () => {
  it("has correct defaults", () => {
    const s = usePlanDisplayStore.getState();
    expect(s.colorMode).toBe("default");
    expect(s.sizeMode).toBe("uniform");
    expect(s.insightMode).toBe("overview");
  });

  it("setColorMode updates colorMode", () => {
    usePlanDisplayStore.getState().setColorMode("lane");
    expect(usePlanDisplayStore.getState().colorMode).toBe("lane");
  });

  it("setSizeMode updates sizeMode", () => {
    usePlanDisplayStore.getState().setSizeMode("degree");
    expect(usePlanDisplayStore.getState().sizeMode).toBe("degree");
  });

  it("setInsightMode updates insightMode", () => {
    usePlanDisplayStore.getState().setInsightMode("ordering");
    expect(usePlanDisplayStore.getState().insightMode).toBe("ordering");
  });

  it("resetEncodings restores color and size defaults but not insightMode", () => {
    usePlanDisplayStore.setState({
      colorMode: "status",
      sizeMode: "betweenness",
      insightMode: "metrics",
    });
    usePlanDisplayStore.getState().resetEncodings();
    const s = usePlanDisplayStore.getState();
    expect(s.colorMode).toBe("default");
    expect(s.sizeMode).toBe("uniform");
    expect(s.insightMode).toBe("metrics"); // insightMode not reset by resetEncodings
  });
});
