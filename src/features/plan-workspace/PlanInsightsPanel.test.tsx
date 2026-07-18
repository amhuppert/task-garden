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
  estimate_unit: "days",
  references: [],
  lanes: [{ id: "core", label: "Core" }],
  work_items: [
    {
      id: "a",
      title: "A",
      summary: "Start",
      lane: "core",
      status: "ready",
      value: 60,
      depends_on: [],
      estimate: 1,
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
      value: 60,
      depends_on: ["a"],
      estimate: 2,
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
      value: 35,
      depends_on: ["b"],
      estimate: 1,
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

  it("renders ready work sorted by value density and by value", () => {
    const readyPlan: TaskGardenPlan = {
      version: 1,
      plan_id: "ready-queue",
      title: "Ready Queue",
      last_updated: "2026-04-03",
      summary: "A plan for ready work ranking.",
      estimate_unit: "days",
      references: [],
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        {
          id: "foundation",
          title: "Foundation",
          summary: "Already complete.",
          lane: "core",
          status: "done",
          value: 10,
          depends_on: [],
          estimate: 1,
          tags: [],
          deliverables: [],
          reuse_candidates: [],
          links: [],
        },
        {
          id: "cheap-impact",
          title: "Cheap Impact",
          summary: "Small task with strong return.",
          lane: "core",
          status: "planned",
          value: 50,
          depends_on: ["foundation"],
          estimate: 1,
          tags: [],
          deliverables: [],
          reuse_candidates: [],
          links: [],
        },
        {
          id: "high-value-big",
          title: "High Value Big",
          summary: "Large but valuable task.",
          lane: "core",
          status: "ready",
          value: 100,
          depends_on: [],
          estimate: 10,
          tags: [],
          deliverables: [],
          reuse_candidates: [],
          links: [],
        },
        {
          id: "no-effort-impact",
          title: "No Effort Impact",
          summary: "Valuable but not estimated yet.",
          lane: "core",
          status: "planned",
          value: 90,
          depends_on: [],
          tags: [],
          deliverables: [],
          reuse_candidates: [],
          links: [],
        },
        {
          id: "blocked-dependency",
          title: "Blocked Dependency",
          summary: "Not complete yet.",
          lane: "core",
          status: "planned",
          value: 5,
          depends_on: [],
          estimate: 1,
          tags: [],
          deliverables: [],
          reuse_candidates: [],
          links: [],
        },
        {
          id: "blocked-high",
          title: "Blocked High",
          summary: "High value but still blocked.",
          lane: "core",
          status: "planned",
          value: 1000,
          depends_on: ["blocked-dependency"],
          estimate: 1,
          tags: [],
          deliverables: [],
          reuse_candidates: [],
          links: [],
        },
      ],
    };
    const snapshot = createPlanAnalysisEngine().build(readyPlan);

    const html = renderToStaticMarkup(
      <PlanInsightsPanel
        snapshot={snapshot}
        display={{
          colorMode: "default",
          sizeMode: "uniform",
          insightMode: "ready",
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
      />,
    );

    const densitySection = html.slice(
      html.indexOf("Best Value / Effort"),
      html.indexOf("Highest Value"),
    );
    expect(densitySection.indexOf("Cheap Impact")).toBeLessThan(
      densitySection.indexOf("High Value Big"),
    );
    expect(densitySection.indexOf("High Value Big")).toBeLessThan(
      densitySection.indexOf("No Effort Impact"),
    );

    const valueSection = html.slice(html.indexOf("Highest Value"));
    expect(valueSection.indexOf("High Value Big")).toBeLessThan(
      valueSection.indexOf("No Effort Impact"),
    );
    expect(valueSection.indexOf("No Effort Impact")).toBeLessThan(
      valueSection.indexOf("Cheap Impact"),
    );
    expect(html).not.toContain("Blocked High");
  });
});
