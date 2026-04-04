import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createPlanAnalysisEngine } from "../../lib/graph/plan-analysis-engine";
import type { TaskGardenPlan } from "../../lib/plan/task-garden-plan.schema";
import { PlanInsightsPanel } from "./PlanInsightsPanel";

const plan: TaskGardenPlan = {
  version: 1,
  plan_id: "estimate-insights",
  title: "Estimate Insights",
  last_updated: "2026-04-03",
  summary: "A small plan for insights panel rendering.",
  references: [],
  lanes: [{ id: "core", label: "Core" }],
  work_items: [
    {
      id: "a",
      title: "A",
      summary: "Start",
      lane: "core",
      status: "ready",
      priority: "p1",
      depends_on: [],
      estimate: { value: 1, unit: "days" },
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "b",
      title: "B",
      summary: "Middle",
      lane: "core",
      status: "ready",
      priority: "p1",
      depends_on: ["a"],
      estimate: { value: 2, unit: "days" },
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
    {
      id: "c",
      title: "C",
      summary: "Finish",
      lane: "core",
      status: "planned",
      priority: "p2",
      depends_on: ["b"],
      estimate: { value: 1, unit: "days" },
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
};

describe("PlanInsightsPanel", () => {
  it("renders the critical item count inside Estimate Profile with an explanation affordance", () => {
    const snapshot = createPlanAnalysisEngine().build(plan);

    const html = renderToStaticMarkup(
      <PlanInsightsPanel
        snapshot={snapshot}
        display={{
          colorMode: "default",
          sizeMode: "uniform",
          insightMode: "overview",
          scheduleOverlay: "none",
        }}
        explorer={{
          selectedWorkItemId: null,
          searchQuery: "",
          activeScope: "all",
          laneIds: [],
          statuses: [],
          priorities: [],
          tags: [],
        }}
        projection={null}
      />,
    );

    expect(html).toContain("Estimate Profile");
    expect(html).toContain("Critical Items");
    expect(html).toContain(`aria-label="Estimate Profile explanation"`);
    expect(html).toContain(
      `>${snapshot.estimateSummary.criticalItemCount}</span>`,
    );
  });
});
