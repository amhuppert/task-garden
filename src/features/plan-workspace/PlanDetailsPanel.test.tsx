import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlanAnalysisSnapshot } from "../../lib/graph/plan-analysis-engine";
import type { ReferenceResolverService } from "../../lib/plan/reference-resolver";
import { PlanDetailsPanel } from "./PlanDetailsPanel";

const stubResolver: ReferenceResolverService = {
  resolve(target, label) {
    if (/^https?:\/\//.test(target)) {
      return { ok: true, value: { kind: "external_url", label, href: target } };
    }
    return {
      ok: true,
      value: {
        kind: "bundled_document",
        label,
        documentPath: target,
        rawDocument: "# Doc",
      },
    };
  },
};

const snapshot: PlanAnalysisSnapshot = {
  plan: {
    version: 1,
    plan_id: "test",
    title: "Test",
    last_updated: "2026-04-01",
    summary: "Test.",
    references: [],
    lanes: [{ id: "core", label: "Core" }],
    work_items: [
      {
        id: "item-a",
        title: "Item A",
        summary: "First.",
        lane: "core",
        status: "ready",
        priority: "p0",
        depends_on: [],
        estimate: {
          value: 3,
          unit: "days",
        },
        tags: [],
        deliverables: [],
        reuse_candidates: [],
        links: [
          { label: "Schema Proposal", href: "memory-bank/schema-proposal.md" },
          { label: "GitHub PR", href: "https://github.com/org/repo/pull/42" },
        ],
      },
    ],
  },
  workItems: {
    "item-a": {
      id: "item-a",
      title: "Item A",
      summary: "First.",
      lane: "core",
      status: "ready",
      priority: "p0",
      depends_on: [],
      estimate: {
        value: 3,
        unit: "days",
      },
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [
        { label: "Schema Proposal", href: "memory-bank/schema-proposal.md" },
        { label: "GitHub PR", href: "https://github.com/org/repo/pull/42" },
      ],
    },
  },
  analysisById: {
    "item-a": {
      dependencyIds: [],
      dependentIds: [],
      level: 0,
      topologicalIndex: 0,
      isRoot: true,
      isLeaf: true,
      metrics: {
        betweenness: 0,
        degree: 0,
        in_degree: 0,
        out_degree: 0,
        dependency_span: 0,
        estimate_days: 3,
        remaining_days: 3,
        downstream_effort_days: 3,
      },
      schedule: {
        estimateDays: 3,
        earliestStartDay: 0,
        earliestFinishDay: 3,
        latestStartDay: 0,
        latestFinishDay: 3,
        slackDays: 0,
        remainingDays: 3,
        downstreamEffortDays: 3,
        isOnCriticalPath: true,
      },
    },
  },
  topologicalOrder: ["item-a"],
  roots: ["item-a"],
  leaves: ["item-a"],
  longestDependencyChain: ["item-a"],
} as unknown as PlanAnalysisSnapshot;

describe("PlanDetailsPanel", () => {
  it("renders task link labels from authored data", () => {
    const html = renderToStaticMarkup(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={{ selectedWorkItemId: "item-a" }}
        resolver={stubResolver}
        selectedNodeFilteredOut={false}
      />,
    );
    expect(html).toContain("Schema Proposal");
    expect(html).toContain("GitHub PR");
  });

  it("renders through the shared ResourceLink markup (has data-icon)", () => {
    const html = renderToStaticMarkup(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={{ selectedWorkItemId: "item-a" }}
        resolver={stubResolver}
        selectedNodeFilteredOut={false}
      />,
    );
    expect(html).toContain('data-icon="file"');
    expect(html).toContain('data-icon="github"');
  });
});
