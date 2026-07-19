import { create } from "zustand";
import type {
  InsightMode,
  PlanDisplayStateValue,
  ScheduleOverlayMode,
} from "../../lib/graph/graph-view-state";
import type {
  ColorEncodingMode,
  SizeEncodingMode,
} from "../../lib/graph/metric-registry";

// ---------------------------------------------------------------------------
// Types — canonical definitions live in lib/graph; re-exported for consumers.
// ---------------------------------------------------------------------------

export type {
  ColorEncodingMode,
  InsightMode,
  PlanDisplayStateValue,
  ScheduleOverlayMode,
  SizeEncodingMode,
};

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
