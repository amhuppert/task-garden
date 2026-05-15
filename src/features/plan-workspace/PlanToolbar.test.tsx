// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanToolbar } from "./PlanToolbar";
import { usePlanExplorerStore } from "./plan-explorer.store";

const emptyFilters = {
  lanes: [],
  statuses: [],
  priorities: [],
  tags: [],
};
const emptySummary = { hiddenNodeCount: 0, selectedNodeFilteredOut: false };

function resetExplorer() {
  usePlanExplorerStore.setState({
    selectedWorkItemId: null,
    searchQuery: "",
    activeScope: "all",
    laneIds: [],
    statuses: [],
    priorities: [],
    tags: [],
  });
}

describe("PlanToolbar — search input debouncing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetExplorer();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not push every keystroke to the store synchronously", () => {
    const { getByPlaceholderText } = render(
      <PlanToolbar
        availableFilters={emptyFilters}
        projectionSummary={emptySummary}
      />,
    );

    const input = getByPlaceholderText(
      "Search title, tag, lane…",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    // Input reflects the latest keystroke immediately.
    expect(input.value).toBe("abc");
    // But the store has not been updated yet (debounced).
    expect(usePlanExplorerStore.getState().searchQuery).toBe("");
  });

  it("commits the latest input value to the store after the debounce window", () => {
    const { getByPlaceholderText } = render(
      <PlanToolbar
        availableFilters={emptyFilters}
        projectionSummary={emptySummary}
      />,
    );

    const input = getByPlaceholderText("Search title, tag, lane…");
    fireEvent.change(input, { target: { value: "abc" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(usePlanExplorerStore.getState().searchQuery).toBe("abc");
  });

  it("syncs the input back to the store value when clearFilters is invoked", () => {
    usePlanExplorerStore.setState({ searchQuery: "stale" });

    const { getByPlaceholderText } = render(
      <PlanToolbar
        availableFilters={emptyFilters}
        projectionSummary={emptySummary}
      />,
    );

    const input = getByPlaceholderText(
      "Search title, tag, lane…",
    ) as HTMLInputElement;
    expect(input.value).toBe("stale");

    act(() => {
      usePlanExplorerStore.getState().clearFilters();
    });

    expect(input.value).toBe("");
  });
});
