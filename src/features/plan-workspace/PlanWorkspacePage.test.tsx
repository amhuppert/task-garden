// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanWorkspacePage } from "./PlanWorkspacePage";
import { useEditStore } from "./editing/edit.store";
import { usePlanDisplayStore } from "./plan-display.store";
import { usePlanExplorerStore } from "./plan-explorer.store";
import { installRadixDomShims } from "./ui/test/radix-dom-shims";

installRadixDomShims();

function resetStores() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
  });
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
    insightMode: "overview",
  });
}

beforeEach(() => {
  resetStores();
});
afterEach(() => {
  cleanup();
  resetStores();
});

const validPlanYaml = `version: 1
plan_id: ws-test
title: Workspace Test
last_updated: 2026-04-01
summary: A test plan.
lanes:
  - id: core
    label: Core
work_items:
  - id: item-a
    title: Item A
    summary: First item.
    lane: core
    status: ready
    value: 100
`;

describe("PlanWorkspacePage", () => {
  it("accepts the { source, revision, planFileName } prop shape and renders the ready state", () => {
    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    // The plan title renders in both the sidebar heading and the mobile bar.
    expect(screen.getAllByText("Workspace Test").length).toBeGreaterThan(0);
  });

  it("renders the invalid-state UI when source is unparseable YAML", () => {
    render(
      <PlanWorkspacePage
        source=":: not valid yaml ::\n  bad"
        revision={1}
        planFileName="bad.yaml"
      />,
    );

    // The alert carries only a brief summary (title + issue count); the
    // detailed issue list renders as ordinary navigable content outside it.
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Invalid plan");
    expect(alert.textContent).toMatch(/\d+ issues? found/);
    const heading = screen.getByRole("heading", { name: "Invalid plan" });
    expect(alert.contains(heading)).toBe(false);
  });

  it("opens the plan-details popover as a labelled dialog and closes it on Escape", async () => {
    const user = userEvent.setup();
    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Plan details" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Plan details" });
    // Panel hosts the plan overview editor (title field seeded from the plan)
    expect(within(dialog).getByDisplayValue("Workspace Test")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Plan details" })).toBeNull();
  });

  it("toggles the insights pane open beside the always-present details pane", async () => {
    const user = userEvent.setup();
    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    // Details pane is always mounted; insights starts closed.
    expect(screen.getByLabelText("Details panel")).toBeTruthy();
    expect(screen.queryByLabelText("Plan insights panel")).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Open insights panel" }),
    );

    // Both panes are now visible at once.
    expect(screen.getByLabelText("Plan insights panel")).toBeTruthy();
    expect(screen.getByLabelText("Plan Insights")).toBeTruthy();
    expect(screen.getByLabelText("Details panel")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Close insights panel" }),
    );
    expect(screen.queryByLabelText("Plan insights panel")).toBeNull();
  });

  it("keeps the insights list open when a listed item is selected, while details update", async () => {
    const user = userEvent.setup();
    usePlanDisplayStore.setState({ insightMode: "ready" });
    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open insights panel" }),
    );
    const insightsPane = screen.getByLabelText("Plan insights panel");

    // Item A is status "ready", so the Ready mode lists it as a clickable row
    // (in both ranked lists — click the first).
    await user.click(
      within(insightsPane).getAllByRole("button", { name: /Item A/ })[0],
    );

    // The list stays open and the details pane now shows the selected item.
    expect(screen.getByLabelText("Plan insights panel")).toBeTruthy();
    const detailsPane = screen.getByLabelText("Details panel");
    expect(within(detailsPane).getByLabelText("Details: Item A")).toBeTruthy();
  });

  it("mounts the write-through status footer in the ready state", () => {
    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    // Idle phase renders the "Synced" label inside the footer's <output> element.
    expect(screen.getByText("Synced")).toBeTruthy();
  });

  it("renders the ValidationToast when the edit store has a validation error", () => {
    // Seed a validation error matching what useFieldDraft would produce on a
    // 422 validation_failed response (e.g. cycle_detected). ValidationToast
    // is mounted at page level and listens to lastWriteResult.
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "work_item:item-a:depends_on",
        copy: {
          title: "Would create a cycle",
          detail: "Adding this dependency closes a loop.",
          code: "cycle_detected",
        },
        canRetry: false,
      },
    });

    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    // ValidationToast renders a Radix toast (role="status") inside the
    // page-mounted ToastViewport; the footer's status region also has
    // role="status", so we find the toast by its content.
    const statusRegions = screen.getAllByRole("status");
    const toast = statusRegions.find((el) =>
      el.textContent?.includes("Would create a cycle"),
    );
    expect(toast).toBeDefined();
    expect(toast?.textContent).toContain("cycle_detected");
    // Close button exists (only the toast renders one with this label)
    expect(screen.getByLabelText("Close notification")).toBeTruthy();
  });

  it("does not render the ValidationToast when the last write result is idle", () => {
    render(
      <PlanWorkspacePage
        source={validPlanYaml}
        revision={1}
        planFileName="ws-test.yaml"
      />,
    );

    // The footer's persistent alert live region stays mounted (LiveRegion
    // regions persist with empty content by design), so absence of the toast
    // is asserted as: no toast close button, and every alert region is empty.
    expect(screen.queryByLabelText("Close notification")).toBeNull();
    for (const region of screen.queryAllByRole("alert")) {
      expect(region.textContent).toBe("");
    }
  });
});
