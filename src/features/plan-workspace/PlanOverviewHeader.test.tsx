// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReferenceClassificationResult } from "../../lib/plan/reference-resolver";
import type { TaskGardenPlan } from "../../lib/plan/task-garden-plan.schema";
import { PlanOverviewHeader } from "./PlanOverviewHeader";
import { TooltipProvider } from "./ui/Tooltip";
import { installRadixDomShims } from "./ui/test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

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
      value: 100,
      depends_on: [],
      tags: [],
      deliverables: [],
      reuse_candidates: [],
      links: [],
    },
  ],
};

function renderHeader() {
  return render(
    <TooltipProvider>
      <PlanOverviewHeader plan={plan} classify={stubClassify} />
    </TooltipProvider>,
  );
}

describe("PlanOverviewHeader", () => {
  it("renders authored labels from structured references", () => {
    renderHeader();
    expect(screen.getByText("Focus")).toBeTruthy();
    expect(screen.getByText("GitHub Repo")).toBeTruthy();
  });

  it("renders each reference through ResourceLink with the resolved element kind", () => {
    renderHeader();
    // document_path → preview button; external_url → new-tab anchor
    expect(screen.getByRole("button", { name: /Focus/ })).toBeTruthy();
    const link = screen.getByRole("link", { name: /GitHub Repo/ });
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders through the shared ResourceLink markup (has data-icon)", () => {
    const { container } = renderHeader();
    expect(container.querySelector('[data-icon="file"]')).toBeTruthy();
    expect(container.querySelector('[data-icon="github"]')).toBeTruthy();
  });
});
