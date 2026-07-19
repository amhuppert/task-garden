// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskGardenStatus } from "../../lib/plan/task-garden-plan.schema";
import { PlanToolbar, type PlanToolbarAvailableFilters } from "./PlanToolbar";
import { usePlanDisplayStore } from "./plan-display.store";
import { usePlanExplorerStore } from "./plan-explorer.store";
import { installRadixDomShims } from "./ui/test/radix-dom-shims";

installRadixDomShims();

const LANES: PlanToolbarAvailableFilters["lanes"] = [
  { lane: { id: "backend", label: "Backend" }, count: 4 },
  { lane: { id: "frontend", label: "Frontend" }, count: 2 },
];
const STATUSES: PlanToolbarAvailableFilters["statuses"] = (
  ["planned", "in_progress", "done"] as TaskGardenStatus[]
).map((status, i) => ({ status, count: i + 1 }));
const TAG_NAMES = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
const TAGS: PlanToolbarAvailableFilters["tags"] = TAG_NAMES.map((tag, i) => ({
  tag,
  count: i + 1,
}));

const emptyFilters: PlanToolbarAvailableFilters = {
  lanes: [],
  statuses: [],
  tags: [],
};
const fullFilters: PlanToolbarAvailableFilters = {
  lanes: LANES,
  statuses: STATUSES,
  tags: TAGS,
};
const emptySummary = { hiddenNodeCount: 0, selectedNodeFilteredOut: false };

function resetStores() {
  usePlanExplorerStore.setState({
    selectedWorkItemId: null,
    searchQuery: "",
    activeScope: "all",
    laneIds: [],
    statuses: [],
    tags: [],
  });
  usePlanDisplayStore.setState({
    colorMode: "default",
    sizeMode: "uniform",
    scheduleOverlay: "none",
  });
}

function renderToolbar(props?: Partial<Parameters<typeof PlanToolbar>[0]>) {
  return render(
    <PlanToolbar
      availableFilters={emptyFilters}
      projectionSummary={emptySummary}
      baseRevision={1}
      onNewItem={vi.fn()}
      {...props}
    />,
  );
}

describe("PlanToolbar — search input debouncing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not push every keystroke to the store synchronously", () => {
    const { getByPlaceholderText } = renderToolbar();

    const input = getByPlaceholderText(
      "Search id, title, summary, tag, lane…",
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
    const { getByPlaceholderText } = renderToolbar();

    const input = getByPlaceholderText("Search id, title, summary, tag, lane…");
    fireEvent.change(input, { target: { value: "abc" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(usePlanExplorerStore.getState().searchQuery).toBe("abc");
  });

  it("syncs the input back to the store value when clearFilters is invoked", () => {
    usePlanExplorerStore.setState({ searchQuery: "stale" });

    const { getByPlaceholderText } = renderToolbar();

    const input = getByPlaceholderText(
      "Search id, title, summary, tag, lane…",
    ) as HTMLInputElement;
    expect(input.value).toBe("stale");

    act(() => {
      usePlanExplorerStore.getState().clearFilters();
    });

    expect(input.value).toBe("");
  });

  it("is a search input with a declared / shortcut", () => {
    const { getByPlaceholderText } = renderToolbar();
    const input = getByPlaceholderText("Search id, title, summary, tag, lane…");
    expect(input.getAttribute("type")).toBe("search");
    expect(input.getAttribute("aria-keyshortcuts")).toBe("/");
  });
});

describe("PlanToolbar — new item button", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("invokes onNewItem when the toolbar new-item button is clicked", () => {
    const onNewItem = vi.fn();
    const { getByTestId } = renderToolbar({ onNewItem });

    fireEvent.click(getByTestId("toolbar-new-item"));
    expect(onNewItem).toHaveBeenCalledTimes(1);
  });
});

describe("PlanToolbar — visibility summary live regions", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("keeps both live regions mounted (but empty) when nothing is hidden", () => {
    renderToolbar();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("announces the hidden-item count in the status region", () => {
    renderToolbar({
      projectionSummary: { hiddenNodeCount: 2, selectedNodeFilteredOut: false },
    });
    expect(screen.getByRole("status").textContent).toContain(
      "2 items hidden by filters",
    );
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("announces a filtered-out selection in the alert region", () => {
    renderToolbar({
      projectionSummary: { hiddenNodeCount: 1, selectedNodeFilteredOut: true },
    });
    expect(screen.getByRole("status").textContent).toContain(
      "1 item hidden by filters",
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Selected item is hidden by active filters",
    );
  });
});

describe("PlanToolbar — display selects (scope / color / overlay / size)", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("renders the four display controls as labelled comboboxes showing the active value", () => {
    renderToolbar();
    const expectations: [string, string][] = [
      ["Scope", "All items"],
      ["Color", "Default"],
      ["Schedule Overlay", "Off"],
      ["Node Size", "Uniform"],
    ];
    for (const [name, activeLabel] of expectations) {
      const trigger = screen.getByRole("combobox", { name });
      expect(trigger.textContent).toContain(activeLabel);
    }
  });

  it("disables scoping options and describes why when nothing is selected", async () => {
    const user = userEvent.setup();
    renderToolbar();

    const trigger = screen.getByRole("combobox", { name: "Scope" });
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Select an item to scope the view",
    );

    await user.click(trigger);
    const listbox = await screen.findByRole("listbox", { name: "Scope" });
    for (const name of ["Upstream", "Downstream", "Full chain"]) {
      expect(
        within(listbox)
          .getByRole("option", { name })
          .getAttribute("data-disabled"),
      ).not.toBeNull();
    }
    expect(
      within(listbox)
        .getByRole("option", { name: /All items/ })
        .getAttribute("data-disabled"),
    ).toBeNull();
  });

  it("enables scope options once an item is selected and sets scope on pick", async () => {
    usePlanExplorerStore.setState({ selectedWorkItemId: "item-1" });
    const user = userEvent.setup();
    renderToolbar();

    const trigger = screen.getByRole("combobox", { name: "Scope" });
    expect(trigger.getAttribute("aria-describedby")).toBeNull();

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Upstream" }));

    expect(usePlanExplorerStore.getState().activeScope).toBe("upstream");
    expect(trigger.textContent).toContain("Upstream");
  });

  it("sets the color mode when a color option is picked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("combobox", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "By Lane" }));

    expect(usePlanDisplayStore.getState().colorMode).toBe("lane");
    expect(
      screen.getByRole("combobox", { name: "Color" }).textContent,
    ).toContain("By Lane");
  });

  it("sets the schedule overlay when an overlay option is picked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(
      screen.getByRole("combobox", { name: "Schedule Overlay" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "Critical Path" }),
    );

    expect(usePlanDisplayStore.getState().scheduleOverlay).toBe(
      "critical_path",
    );
  });

  it("sets the size mode when a size option is picked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("combobox", { name: "Node Size" }));
    await user.click(await screen.findByRole("option", { name: "By Degree" }));

    expect(usePlanDisplayStore.getState().sizeMode).toBe("degree");
  });
});

describe("PlanToolbar — filter lists", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("renders lane/status/tag sections as labelled groups of toggle rows", () => {
    renderToolbar({ availableFilters: fullFilters });
    for (const name of ["Lane", "Status", "Tags"]) {
      expect(screen.getByRole("group", { name })).toBeTruthy();
    }
    // Statuses render their presentation labels, not raw values.
    expect(screen.getByRole("button", { name: "In Progress" })).toBeTruthy();
  });

  it("omits filter sections whose available values are empty", () => {
    renderToolbar();
    for (const name of ["Lane", "Status", "Tags"]) {
      expect(screen.queryByRole("group", { name })).toBeNull();
    }
  });

  it("shows per-option item counts without polluting accessible names", () => {
    renderToolbar({ availableFilters: fullFilters });
    const backend = screen.getByRole("button", { name: "Backend" });
    // The count renders inside the row but stays out of the accessible name.
    expect(backend.textContent).toContain("4");
  });

  it("toggles a lane filter on and off, reflected in aria-pressed", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    const row = screen.getByRole("button", { name: "Backend" });
    expect(row.getAttribute("aria-pressed")).toBe("false");

    await user.click(row);
    expect(usePlanExplorerStore.getState().laneIds).toEqual(["backend"]);
    expect(row.getAttribute("aria-pressed")).toBe("true");

    await user.click(row);
    expect(usePlanExplorerStore.getState().laneIds).toEqual([]);
    expect(row.getAttribute("aria-pressed")).toBe("false");
  });

  it("toggles status filters through the store", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    await user.click(screen.getByRole("button", { name: "In Progress" }));
    expect(usePlanExplorerStore.getState().statuses).toEqual(["in_progress"]);
  });

  it("toggles tag filters through the store", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    await user.click(screen.getByRole("button", { name: "alpha" }));
    expect(usePlanExplorerStore.getState().tags).toEqual(["alpha"]);
  });

  it("shows an active-count badge on sections with active filters", () => {
    usePlanExplorerStore.setState({ tags: ["alpha", "beta"] });
    renderToolbar({ availableFilters: fullFilters });
    expect(screen.getByLabelText("2 active")).toBeTruthy();
  });
});

describe("PlanToolbar — tag list narrowing", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  const manyTags: PlanToolbarAvailableFilters["tags"] = [
    ...TAG_NAMES,
    "eta",
    "theta",
    "iota",
  ].map((tag, i) => ({ tag, count: i + 1 }));

  it("renders every tag as a row without a narrowing input for small tag sets", () => {
    renderToolbar({ availableFilters: fullFilters });
    const tagGroup = screen.getByRole("group", { name: "Tags" });
    expect(within(tagGroup).getAllByRole("button")).toHaveLength(
      TAG_NAMES.length,
    );
    expect(screen.queryByLabelText("Narrow tag list")).toBeNull();
  });

  it("offers a narrowing input for large tag sets that filters the visible rows", async () => {
    const user = userEvent.setup();
    renderToolbar({
      availableFilters: { ...fullFilters, tags: manyTags },
    });

    const narrowInput = screen.getByLabelText("Narrow tag list");
    const tagGroup = screen.getByRole("group", { name: "Tags" });
    expect(within(tagGroup).getAllByRole("button")).toHaveLength(
      manyTags.length,
    );

    await user.type(narrowInput, "eta");

    // "eta" matches beta, zeta, eta, theta.
    expect(
      within(tagGroup)
        .getAllByRole("button")
        .map((b) => b.textContent?.replace(/\d+$/, "")),
    ).toEqual(["beta", "zeta", "eta", "theta"]);
  });

  it("keeps active tags selected in the store while they are narrowed out of view", async () => {
    usePlanExplorerStore.setState({ tags: ["alpha"] });
    const user = userEvent.setup();
    renderToolbar({
      availableFilters: { ...fullFilters, tags: manyTags },
    });

    await user.type(screen.getByLabelText("Narrow tag list"), "iota");
    await user.click(screen.getByRole("button", { name: "iota" }));

    expect(usePlanExplorerStore.getState().tags).toEqual(["alpha", "iota"]);
  });

  it("reports when no tags match the narrowing query", async () => {
    const user = userEvent.setup();
    renderToolbar({
      availableFilters: { ...fullFilters, tags: manyTags },
    });

    await user.type(screen.getByLabelText("Narrow tag list"), "nomatch");

    expect(screen.getByText('No tags match "nomatch"')).toBeTruthy();
  });
});

describe("PlanToolbar — lane edit popover", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("opens a non-modal dialog hosting the lane inline editor", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    const pencil = screen.getByTestId("lane-edit-backend");
    expect(pencil.getAttribute("aria-expanded")).toBe("false");

    await user.click(pencil);

    const panel = await screen.findByRole("dialog", {
      name: "Edit lane Backend",
    });
    expect(pencil.getAttribute("aria-expanded")).toBe("true");
    expect(
      panel.querySelector("[data-testid='lane-label-input']"),
    ).toBeTruthy();
  });

  it("closes on Escape, unmounting the editor and returning focus to the pencil", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    const pencil = screen.getByTestId("lane-edit-frontend");
    await user.click(pencil);
    await screen.findByRole("dialog", { name: "Edit lane Frontend" });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(screen.queryByTestId("lane-label-input")).toBeNull();
    expect(document.activeElement).toBe(pencil);
  });
});
