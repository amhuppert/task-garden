import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColorEncodingMode =
  | "default"
  | "lane"
  | "status"
  | "priority"
  | "degree"
  | "betweenness"
  | "dependency_span";

export type SizeEncodingMode =
  | "uniform"
  | "degree"
  | "betweenness"
  | "dependency_span";

export type InsightMode = "overview" | "ordering" | "metrics";

export interface PlanDisplayStateValue {
  colorMode: ColorEncodingMode;
  sizeMode: SizeEncodingMode;
  insightMode: InsightMode;
}

interface PlanDisplayActions {
  setColorMode(mode: ColorEncodingMode): void;
  setSizeMode(mode: SizeEncodingMode): void;
  setInsightMode(mode: InsightMode): void;
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
