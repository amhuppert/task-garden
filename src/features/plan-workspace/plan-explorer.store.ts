import { create } from "zustand";
import type {
  GraphScope,
  PlanExplorerStateValue,
} from "../../lib/graph/graph-view-state";
import type { TaskGardenStatus } from "../../lib/plan/task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Types — canonical definitions live in lib/graph; re-exported for consumers.
// ---------------------------------------------------------------------------

export type { GraphScope, PlanExplorerStateValue };

interface PlanExplorerActions {
  selectWorkItem(id: string): void;
  clearSelection(): void;
  setSearchQuery(query: string): void;
  setScope(scope: GraphScope): void;
  toggleLaneFilter(laneId: string): void;
  toggleStatusFilter(status: TaskGardenStatus): void;
  toggleTagFilter(tag: string): void;
  clearFilters(): void;
}

type PlanExplorerStore = PlanExplorerStateValue & PlanExplorerActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultState: PlanExplorerStateValue = {
  selectedWorkItemId: null,
  searchQuery: "",
  activeScope: "all",
  laneIds: [],
  statuses: [],
  tags: [],
};

// ---------------------------------------------------------------------------
// Toggle helper
// ---------------------------------------------------------------------------

function toggle<T>(arr: readonly T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlanExplorerStore = create<PlanExplorerStore>((set) => ({
  ...defaultState,

  selectWorkItem(id) {
    set({ selectedWorkItemId: id });
  },

  clearSelection() {
    set({ selectedWorkItemId: null, activeScope: "all" });
  },

  setSearchQuery(query) {
    set({ searchQuery: query });
  },

  setScope(scope) {
    set({ activeScope: scope });
  },

  toggleLaneFilter(laneId) {
    set((s) => ({ laneIds: toggle(s.laneIds, laneId) }));
  },

  toggleStatusFilter(status) {
    set((s) => ({ statuses: toggle(s.statuses, status) }));
  },

  toggleTagFilter(tag) {
    set((s) => ({ tags: toggle(s.tags, tag) }));
  },

  clearFilters() {
    set({
      searchQuery: "",
      laneIds: [],
      statuses: [],
      tags: [],
    });
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectSelectedWorkItemId = (s: PlanExplorerStateValue) =>
  s.selectedWorkItemId;

export const selectSearchQuery = (s: PlanExplorerStateValue) => s.searchQuery;

export const selectActiveScope = (s: PlanExplorerStateValue) => s.activeScope;

export const selectLaneIds = (s: PlanExplorerStateValue) => s.laneIds;

export const selectStatuses = (s: PlanExplorerStateValue) => s.statuses;

export const selectTags = (s: PlanExplorerStateValue) => s.tags;

export const selectHasActiveFilters = (s: PlanExplorerStateValue): boolean =>
  s.searchQuery !== "" ||
  s.laneIds.length > 0 ||
  s.statuses.length > 0 ||
  s.tags.length > 0;
