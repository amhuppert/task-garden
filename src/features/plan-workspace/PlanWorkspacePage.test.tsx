// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanWorkspacePage } from "./PlanWorkspacePage";
import { useEditStore } from "./editing/edit.store";

function resetEditStore() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
  });
}

beforeEach(() => {
  resetEditStore();
});
afterEach(() => {
  cleanup();
  resetEditStore();
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

    expect(screen.getByRole("alert")).toBeTruthy();
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

    // ValidationToast renders an assertive live region (role="alert" +
    // aria-live="assertive"); the footer's error variant uses role="alert"
    // with aria-live="polite", so we filter by the assertive level.
    const alerts = screen.getAllByRole("alert");
    const toast = alerts.find(
      (el) => el.getAttribute("aria-live") === "assertive",
    );
    expect(toast).toBeDefined();
    expect(toast?.textContent).toContain("Would create a cycle");
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

    // No alert region — only the (non-alert) footer is mounted.
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
