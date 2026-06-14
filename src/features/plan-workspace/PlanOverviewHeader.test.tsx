import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReferenceClassificationResult } from "../../lib/plan/reference-resolver";
import type { TaskGardenPlan } from "../../lib/plan/task-garden-plan.schema";
import { PlanOverviewHeader } from "./PlanOverviewHeader";

const stubClassify = (
  target: string,
  label: string,
): ReferenceClassificationResult => {
  if (/^https?:\/\//.test(target)) {
    return { ok: true, value: { kind: "external_url", label, href: target } };
  }
  return {
    ok: true,
    value: {
      kind: "document_path",
      label,
      documentPath: target,
    },
  };
};

const plan: TaskGardenPlan = {
  version: 1,
  plan_id: "test",
  title: "Test Plan",
  last_updated: "2026-04-01",
  summary: "A test plan.",
  estimate_unit: "days",
  references: [
    { label: "Focus", href: "memory-bank/focus.md" },
    { label: "GitHub Repo", href: "https://github.com/org/repo" },
  ],
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
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
};

describe("PlanOverviewHeader", () => {
  it("renders authored labels from structured references", () => {
    const html = renderToStaticMarkup(
      <PlanOverviewHeader plan={plan} classify={stubClassify} />,
    );
    expect(html).toContain("Focus");
    expect(html).toContain("GitHub Repo");
  });

  it("renders through the shared ResourceLink markup (has data-icon)", () => {
    const html = renderToStaticMarkup(
      <PlanOverviewHeader plan={plan} classify={stubClassify} />,
    );
    expect(html).toContain('data-icon="file"');
    expect(html).toContain('data-icon="github"');
  });
});
