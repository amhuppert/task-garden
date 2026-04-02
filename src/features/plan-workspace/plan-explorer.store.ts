import { create } from "zustand";
import type {
  TaskGardenPriority,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphScope = "all" | "upstream" | "downstream" | "chain";

export interface PlanExplorerStateValue {
  selectedWorkItemId: string | null;
  searchQuery: string;
  activeScope: GraphScope;
  laneIds: readonly string[];
  statuses: readonly TaskGardenStatus[];
  priorities: readonly TaskGardenPriority[];
  tags: readonly string[];
}

interface PlanExplorerActions {
  selectWorkItem(id: string): void;
  clearSelection(): void;
  setSearchQuery(query: string): void;
  setScope(scope: GraphScope): void;
  toggleLaneFilter(laneId: string): void;
  toggleStatusFilter(status: TaskGardenStatus): void;
  togglePriorityFilter(priority: TaskGardenPriority): void;
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
  priorities: [],
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

  togglePriorityFilter(priority) {
    set((s) => ({ priorities: toggle(s.priorities, priority) }));
  },

  toggleTagFilter(tag) {
    set((s) => ({ tags: toggle(s.tags, tag) }));
  },

  clearFilters() {
    set({
      searchQuery: "",
      laneIds: [],
      statuses: [],
      priorities: [],
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

export const selectPriorities = (s: PlanExplorerStateValue) => s.priorities;

export const selectTags = (s: PlanExplorerStateValue) => s.tags;

export const selectHasActiveFilters = (s: PlanExplorerStateValue): boolean =>
  s.searchQuery !== "" ||
  s.laneIds.length > 0 ||
  s.statuses.length > 0 ||
  s.priorities.length > 0 ||
  s.tags.length > 0;
