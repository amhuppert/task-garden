import { beforeEach, describe, expect, it } from "vitest";
import { usePlanExplorerStore } from "./plan-explorer.store";

beforeEach(() => {
  usePlanExplorerStore.setState({
    selectedWorkItemId: null,
    searchQuery: "",
    activeScope: "all",
    laneIds: [],
    statuses: [],
    priorities: [],
    tags: [],
  });
});

describe("usePlanExplorerStore", () => {
  it("selectWorkItem sets the selected id", () => {
    usePlanExplorerStore.getState().selectWorkItem("abc");
    expect(usePlanExplorerStore.getState().selectedWorkItemId).toBe("abc");
  });

  it("clearSelection resets id and scope", () => {
    usePlanExplorerStore.setState({
      selectedWorkItemId: "abc",
      activeScope: "upstream",
    });
    usePlanExplorerStore.getState().clearSelection();
    const s = usePlanExplorerStore.getState();
    expect(s.selectedWorkItemId).toBeNull();
    expect(s.activeScope).toBe("all");
  });

  it("setSearchQuery updates query", () => {
    usePlanExplorerStore.getState().setSearchQuery("hello");
    expect(usePlanExplorerStore.getState().searchQuery).toBe("hello");
  });

  it("setScope updates scope", () => {
    usePlanExplorerStore.getState().setScope("downstream");
    expect(usePlanExplorerStore.getState().activeScope).toBe("downstream");
  });

  it("toggleLaneFilter adds then removes", () => {
    usePlanExplorerStore.getState().toggleLaneFilter("lane-a");
    expect(usePlanExplorerStore.getState().laneIds).toContain("lane-a");
    usePlanExplorerStore.getState().toggleLaneFilter("lane-a");
    expect(usePlanExplorerStore.getState().laneIds).not.toContain("lane-a");
  });

  it("toggleStatusFilter adds then removes", () => {
    usePlanExplorerStore.getState().toggleStatusFilter("ready");
    expect(usePlanExplorerStore.getState().statuses).toContain("ready");
    usePlanExplorerStore.getState().toggleStatusFilter("ready");
    expect(usePlanExplorerStore.getState().statuses).not.toContain("ready");
  });

  it("togglePriorityFilter adds then removes", () => {
    usePlanExplorerStore.getState().togglePriorityFilter("p0");
    expect(usePlanExplorerStore.getState().priorities).toContain("p0");
    usePlanExplorerStore.getState().togglePriorityFilter("p0");
    expect(usePlanExplorerStore.getState().priorities).not.toContain("p0");
  });

  it("toggleTagFilter adds then removes", () => {
    usePlanExplorerStore.getState().toggleTagFilter("urgent");
    expect(usePlanExplorerStore.getState().tags).toContain("urgent");
    usePlanExplorerStore.getState().toggleTagFilter("urgent");
    expect(usePlanExplorerStore.getState().tags).not.toContain("urgent");
  });

  it("clearFilters resets filters and search but not selection or scope", () => {
    usePlanExplorerStore.setState({
      selectedWorkItemId: "abc",
      searchQuery: "hello",
      activeScope: "upstream",
      laneIds: ["lane-a"],
      statuses: ["ready"],
      priorities: ["p0"],
      tags: ["urgent"],
    });
    usePlanExplorerStore.getState().clearFilters();
    const s = usePlanExplorerStore.getState();
    expect(s.searchQuery).toBe("");
    expect(s.laneIds).toHaveLength(0);
    expect(s.statuses).toHaveLength(0);
    expect(s.priorities).toHaveLength(0);
    expect(s.tags).toHaveLength(0);
    // selection and scope are NOT reset by clearFilters
    expect(s.selectedWorkItemId).toBe("abc");
    expect(s.activeScope).toBe("upstream");
  });
});
