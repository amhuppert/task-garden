// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlanAnalysisEngine } from "../../lib/graph/plan-analysis-engine";
import type {
  TaskGardenPlan,
  TaskGardenWorkItem,
} from "../../lib/plan/task-garden-plan.schema";
import { PlanInsightsPanel } from "./PlanInsightsPanel";
import type { InsightMode } from "./plan-display.store";

afterEach(cleanup);

function makeItem(
  overrides: Partial<TaskGardenWorkItem> & { id: string; title: string },
): TaskGardenWorkItem {
  return {
    summary: "Summary.",
    lane: "core",
    status: "planned",
    value: 10,
    depends_on: [],
    tags: [],
    deliverables: [],
    reuse_candidates: [],
    links: [],
    ...overrides,
  };
}

function makePlan(workItems: TaskGardenWorkItem[]): TaskGardenPlan {
  return {
    version: 1,
    plan_id: "insights-panel",
    title: "Insights Panel",
    last_updated: "2026-04-03",
    summary: "A small plan for insights panel rendering.",
    estimate_unit: "days",
    references: [],
    lanes: [{ id: "core", label: "Core" }],
    work_items: workItems,
  };
}

const chainPlan = makePlan([
  makeItem({ id: "a", title: "A", status: "ready", value: 60, estimate: 1 }),
  makeItem({
    id: "b",
    title: "B",
    status: "ready",
    value: 60,
    depends_on: ["a"],
    estimate: 2,
  }),
  makeItem({
    id: "c",
    title: "C",
    status: "planned",
    value: 35,
    depends_on: ["b"],
    estimate: 1,
  }),
]);

const readyPlan = makePlan([
  makeItem({
    id: "foundation",
    title: "Foundation",
    status: "done",
    value: 10,
    estimate: 1,
  }),
  makeItem({
    id: "cheap-impact",
    title: "Cheap Impact",
    value: 50,
    depends_on: ["foundation"],
    estimate: 1,
  }),
  makeItem({
    id: "high-value-big",
    title: "High Value Big",
    status: "ready",
    value: 100,
    estimate: 10,
  }),
  makeItem({ id: "no-effort-impact", title: "No Effort Impact", value: 90 }),
  makeItem({ id: "blocked-dependency", title: "Blocked Dependency", value: 5 }),
  makeItem({
    id: "blocked-high",
    title: "Blocked High",
    value: 1000,
    depends_on: ["blocked-dependency"],
    estimate: 1,
  }),
]);

function renderPanel(
  plan: TaskGardenPlan,
  insightMode: InsightMode,
  options: {
    onSelectWorkItem?: (id: string) => void;
    onSetInsightMode?: (mode: InsightMode) => void;
  } = {},
) {
  const snapshot = createPlanAnalysisEngine().build(plan);
  render(
    <PlanInsightsPanel
      snapshot={snapshot}
      display={{
        colorMode: "default",
        sizeMode: "uniform",
        insightMode,
        scheduleOverlay: "none",
      }}
      explorer={{
        selectedWorkItemId: null,
        searchQuery: "",
        activeScope: "all",
        laneIds: [],
        statuses: [],
        tags: [],
      }}
      projection={null}
      onSelectWorkItem={options.onSelectWorkItem}
      onSetInsightMode={options.onSetInsightMode}
    />,
  );
  return snapshot;
}

function sectionByHeading(name: string): HTMLElement {
  const section = screen.getByRole("heading", { name }).closest("section");
  if (!section) throw new Error(`No section for heading "${name}"`);
  return section;
}

describe("PlanInsightsPanel", () => {
  it("renders the four insight modes as a labelled tablist with the active mode selected", () => {
    renderPanel(chainPlan, "overview");

    const tablist = screen.getByRole("tablist", { name: "Insight mode" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Overview",
      "Ready",
      "Ordering",
      "Metrics",
    ]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
  });

  it("notifies insight mode changes when a tab is activated", async () => {
    const user = userEvent.setup();
    const onSetInsightMode = vi.fn();
    renderPanel(chainPlan, "overview", { onSetInsightMode });

    await user.click(screen.getByRole("tab", { name: "Ready" }));

    expect(onSetInsightMode).toHaveBeenCalledWith("ready");
  });

  it("renders the critical item count inside Estimate Profile with an explanation affordance", () => {
    const snapshot = renderPanel(chainPlan, "overview");

    expect(
      screen.getByRole("button", { name: "Estimate Profile explanation" }),
    ).toBeTruthy();

    const criticalCard = screen.getByText("Critical Items").parentElement;
    if (!criticalCard) throw new Error("Missing Critical Items stat card");
    expect(
      within(criticalCard).getByText(
        String(snapshot.estimateSummary.criticalItemCount),
      ),
    ).toBeTruthy();
  });

  it("renders progress as a meter reporting done items", () => {
    renderPanel(chainPlan, "overview");

    const meter = screen.getByRole("meter", { name: "Progress" });
    expect(meter.getAttribute("aria-valuenow")).toBe("0");
    expect(meter.getAttribute("aria-valuemax")).toBe("3");
    expect(meter.getAttribute("aria-valuetext")).toBe("0 of 3 items done");
  });

  it("renders ready work sorted by value density and by value", () => {
    renderPanel(readyPlan, "ready");

    const densityRows = within(
      sectionByHeading("Best Value / Effort"),
    ).getAllByRole("listitem");
    expect(densityRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Cheap Impact"),
      expect.stringContaining("High Value Big"),
      expect.stringContaining("No Effort Impact"),
      expect.stringContaining("Blocked Dependency"),
    ]);

    const valueRows = within(sectionByHeading("Highest Value")).getAllByRole(
      "listitem",
    );
    expect(valueRows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("High Value Big"),
      expect.stringContaining("No Effort Impact"),
      expect.stringContaining("Cheap Impact"),
      expect.stringContaining("Blocked Dependency"),
    ]);

    expect(screen.queryByText("Blocked High")).toBeNull();
  });

  it("selects a work item when a ready row is clicked", async () => {
    const user = userEvent.setup();
    const onSelectWorkItem = vi.fn();
    renderPanel(readyPlan, "ready", { onSelectWorkItem });

    await user.click(
      within(sectionByHeading("Best Value / Effort")).getByRole("button", {
        name: /Cheap Impact/,
      }),
    );

    expect(onSelectWorkItem).toHaveBeenCalledWith("cheap-impact");
  });

  it("marks rows inert with aria-disabled when no selection handler is provided", () => {
    renderPanel(readyPlan, "ready");

    const rows = within(sectionByHeading("Highest Value")).getAllByRole(
      "button",
    );
    for (const row of rows) {
      expect(row.getAttribute("aria-disabled")).toBe("true");
    }
  });

  it("describes ordering badges to assistive tech with visually hidden text", () => {
    renderPanel(chainPlan, "ordering");

    // The terse "1↑ 1↓" badge is aria-hidden; its replacement text is real.
    expect(
      screen.getByText("2 days estimated, 1 dependencies, 1 dependents"),
    ).toBeTruthy();
  });
});
