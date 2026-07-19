// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  TaskGardenLane,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";
import { PlanToolbar } from "./PlanToolbar";
import { usePlanDisplayStore } from "./plan-display.store";
import { usePlanExplorerStore } from "./plan-explorer.store";
import { installRadixDomShims } from "./ui/test/radix-dom-shims";

installRadixDomShims();

const LANES: TaskGardenLane[] = [
  { id: "backend", label: "Backend" },
  { id: "frontend", label: "Frontend" },
];
const STATUSES: TaskGardenStatus[] = ["planned", "in_progress", "done"];
const TAGS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];

const emptyFilters = {
  lanes: [],
  statuses: [],
  tags: [],
};
const fullFilters = {
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

/** Radix RadioGroup moves focus in a deferred task and selects only while the
    arrow key is still held; user-event's instant release does not span that
    task — so press, flush, then release. */
async function pressArrow(user: UserEvent, key: "ArrowRight" | "ArrowLeft") {
  await user.keyboard(`{${key}>}`);
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  await user.keyboard(`{/${key}}`);
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

describe("PlanToolbar — exclusive display sections (radio groups)", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("renders the four exclusive sections as labelled radiogroups", () => {
    renderToolbar();
    for (const name of ["Scope", "Color", "Schedule Overlay", "Node Size"]) {
      expect(screen.getByRole("radiogroup", { name })).toBeTruthy();
    }
  });

  it("marks the active option aria-checked instead of aria-pressed", () => {
    usePlanDisplayStore.setState({ scheduleOverlay: "critical_path" });
    renderToolbar();
    const active = screen.getByRole("radio", { name: "Critical Path" });
    expect(active.getAttribute("aria-checked")).toBe("true");
    expect(active.hasAttribute("aria-pressed")).toBe(false);
    expect(
      screen.getByRole("radio", { name: "Off" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("disables scope options (except All items) and describes why when nothing is selected", () => {
    renderToolbar();
    const group = screen.getByRole("radiogroup", { name: "Scope" });
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Select an item to scope the view",
    );
    expect(
      (screen.getByRole("radio", { name: "All items" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    for (const name of ["Upstream", "Downstream", "Full chain"]) {
      expect(
        (screen.getByRole("radio", { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
    }
  });

  it("enables scope options once an item is selected and sets scope on click", async () => {
    usePlanExplorerStore.setState({ selectedWorkItemId: "item-1" });
    const user = userEvent.setup();
    renderToolbar();
    expect(
      screen
        .getByRole("radiogroup", { name: "Scope" })
        .getAttribute("aria-describedby"),
    ).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Upstream" }));
    expect(usePlanExplorerStore.getState().activeScope).toBe("upstream");
  });

  it("sets the color mode when a color radio is clicked", async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(screen.getByRole("radio", { name: "By Lane" }));
    expect(usePlanDisplayStore.getState().colorMode).toBe("lane");
    expect(
      screen
        .getByRole("radio", { name: "By Lane" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("uses a roving tabindex: Tab enters on the checked option and a second Tab leaves the group", async () => {
    usePlanDisplayStore.setState({ colorMode: "status" });
    const user = userEvent.setup();
    renderToolbar();
    const group = screen.getByRole("radiogroup", { name: "Color" });
    // The info-modal trigger is the last focusable before the color radios.
    screen.getByRole("button", { name: "Color Encoding explanation" }).focus();

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "By Status" }),
    );

    await user.tab();
    expect(group.contains(document.activeElement)).toBe(false);
  });

  it("ArrowRight moves focus to the next option and selects it", async () => {
    const user = userEvent.setup();
    renderToolbar();
    // COLOR_MODE_OPTIONS starts ["default", "lane", ...]
    screen.getByRole("radio", { name: "Default" }).focus();
    await pressArrow(user, "ArrowRight");
    const next = screen.getByRole("radio", { name: "By Lane" });
    expect(document.activeElement).toBe(next);
    expect(usePlanDisplayStore.getState().colorMode).toBe("lane");
    expect(next.getAttribute("aria-checked")).toBe("true");
  });

  it("ArrowLeft from the first schedule option wraps to the last", async () => {
    const user = userEvent.setup();
    renderToolbar();
    screen.getByRole("radio", { name: "Off" }).focus();
    await pressArrow(user, "ArrowLeft");
    const last = screen.getByRole("radio", { name: "Slack Heatmap" });
    expect(document.activeElement).toBe(last);
    expect(usePlanDisplayStore.getState().scheduleOverlay).toBe(
      "slack_heatmap",
    );
  });
});

describe("PlanToolbar — filter chip groups", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("renders lane/status/tag sections as labelled groups of toggle buttons", () => {
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

  it("toggles a lane filter on and off, reflected in aria-pressed", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    const chip = screen.getByRole("button", { name: "Backend" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");

    await user.click(chip);
    expect(usePlanExplorerStore.getState().laneIds).toEqual(["backend"]);
    expect(chip.getAttribute("aria-pressed")).toBe("true");

    await user.click(chip);
    expect(usePlanExplorerStore.getState().laneIds).toEqual([]);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
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
});

describe("PlanToolbar — tag disclosure", () => {
  beforeEach(resetStores);
  afterEach(cleanup);

  it("collapses to the first three tags with a hidden-count hint when many tags and none active", () => {
    renderToolbar({ availableFilters: fullFilters });
    const tagGroup = screen.getByRole("group", { name: "Tags" });
    const chips = tagGroup.querySelectorAll("button");
    expect(Array.from(chips).map((c) => c.textContent)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(screen.getByText("+3 more")).toBeTruthy();
  });

  it("shows only active tags when collapsed with an active tag filter", () => {
    usePlanExplorerStore.setState({ tags: ["epsilon"] });
    renderToolbar({ availableFilters: fullFilters });
    const tagGroup = screen.getByRole("group", { name: "Tags" });
    const chips = tagGroup.querySelectorAll("button");
    expect(Array.from(chips).map((c) => c.textContent)).toEqual(["epsilon"]);
    expect(screen.getByText("+5 more")).toBeTruthy();
  });

  it("expands via a disclosure button wired with aria-expanded/aria-controls", async () => {
    const user = userEvent.setup();
    renderToolbar({ availableFilters: fullFilters });
    const disclosure = screen.getByRole("button", { name: "Tags" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    const controlsId = disclosure.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();

    await user.click(disclosure);

    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    const region = document.getElementById(controlsId as string);
    expect(region).toBeTruthy();
    const chips = screen
      .getByRole("group", { name: "Tags" })
      .querySelectorAll("button");
    expect(chips).toHaveLength(TAGS.length);
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  it("starts expanded when five or fewer tags are available", () => {
    renderToolbar({
      availableFilters: { ...fullFilters, tags: TAGS.slice(0, 4) },
    });
    expect(
      screen
        .getByRole("button", { name: "Tags" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
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
