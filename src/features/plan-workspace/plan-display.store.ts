import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColorEncodingMode =
  | "default"
  | "lane"
  | "status"
  | "priority"
  | "estimate_days"
  | "remaining_days"
  | "downstream_effort_days"
  | "degree"
  | "betweenness"
  | "dependency_span";

export type SizeEncodingMode =
  | "uniform"
  | "estimate_days"
  | "remaining_days"
  | "downstream_effort_days"
  | "degree"
  | "betweenness"
  | "dependency_span";

export type InsightMode = "overview" | "ordering" | "metrics";
export type ScheduleOverlayMode = "none" | "critical_path" | "slack_heatmap";

export interface PlanDisplayStateValue {
  colorMode: ColorEncodingMode;
  sizeMode: SizeEncodingMode;
  insightMode: InsightMode;
  scheduleOverlay: ScheduleOverlayMode;
}

interface PlanDisplayActions {
  setColorMode(mode: ColorEncodingMode): void;
  setSizeMode(mode: SizeEncodingMode): void;
  setInsightMode(mode: InsightMode): void;
  setScheduleOverlay(mode: ScheduleOverlayMode): void;
  resetEncodings(): void;
}

type PlanDisplayStore = PlanDisplayStateValue & PlanDisplayActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultState: PlanDisplayStateValue = {
  colorMode: "default",
  sizeMode: "uniform",
  insightMode: "overview",
  scheduleOverlay: "none",
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlanDisplayStore = create<PlanDisplayStore>((set) => ({
  ...defaultState,

  setColorMode(mode) {
    set({ colorMode: mode });
  },

  setSizeMode(mode) {
    set({ sizeMode: mode });
  },

  setInsightMode(mode) {
    set({ insightMode: mode });
  },

  setScheduleOverlay(mode) {
    set({ scheduleOverlay: mode });
  },

  resetEncodings() {
    set({ colorMode: "default", sizeMode: "uniform" });
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectColorMode = (s: PlanDisplayStateValue) => s.colorMode;

export const selectSizeMode = (s: PlanDisplayStateValue) => s.sizeMode;

export const selectInsightMode = (s: PlanDisplayStateValue) => s.insightMode;

export const selectScheduleOverlay = (s: PlanDisplayStateValue) =>
  s.scheduleOverlay;
