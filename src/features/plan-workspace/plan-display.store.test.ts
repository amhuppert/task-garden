import { beforeEach, describe, expect, it } from "vitest";
import { usePlanDisplayStore } from "./plan-display.store";

beforeEach(() => {
  usePlanDisplayStore.setState({
    colorMode: "default",
    sizeMode: "uniform",
    insightMode: "overview",
    scheduleOverlay: "none",
  });
});

describe("usePlanDisplayStore", () => {
  it("has correct defaults", () => {
    const s = usePlanDisplayStore.getState();
    expect(s.colorMode).toBe("default");
    expect(s.sizeMode).toBe("uniform");
    expect(s.insightMode).toBe("overview");
    expect(s.scheduleOverlay).toBe("none");
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

  it("setScheduleOverlay updates scheduleOverlay", () => {
    usePlanDisplayStore.getState().setScheduleOverlay("critical_path");
    expect(usePlanDisplayStore.getState().scheduleOverlay).toBe(
      "critical_path",
    );
  });

  it("resetEncodings restores color and size defaults but not insightMode or scheduleOverlay", () => {
    usePlanDisplayStore.setState({
      colorMode: "status",
      sizeMode: "betweenness",
      insightMode: "metrics",
      scheduleOverlay: "slack_heatmap",
    });
    usePlanDisplayStore.getState().resetEncodings();
    const s = usePlanDisplayStore.getState();
    expect(s.colorMode).toBe("default");
    expect(s.sizeMode).toBe("uniform");
    expect(s.insightMode).toBe("metrics");
    expect(s.scheduleOverlay).toBe("slack_heatmap");
  });
});
