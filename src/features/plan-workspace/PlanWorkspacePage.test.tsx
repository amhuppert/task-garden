// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanWorkspacePage } from "./PlanWorkspacePage";

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
    priority: p0
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

    expect(screen.getByText("Workspace Test")).toBeTruthy();
  });

  it("renders the invalid-state UI when source is unparseable YAML", () => {
    render(
      <PlanWorkspacePage
        source=":: not valid yaml ::\n  bad"
        revision={1}
        planFileName="bad.yaml"
      />,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
