// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanPatch } from "../../../cli/shared/patch-schema";
import type { PlanAnalysisSnapshot } from "../../lib/graph/plan-analysis-engine";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../lib/plan/edit-api-client";
import type { ReferenceClassificationResult } from "../../lib/plan/reference-resolver";
import { PlanDetailsPanel } from "./PlanDetailsPanel";
import { useEditStore } from "./editing/edit.store";

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

const snapshot: PlanAnalysisSnapshot = {
  plan: {
    version: 1,
    plan_id: "test",
    title: "Test",
    last_updated: "2026-04-01",
    summary: "Test.",
    estimate_unit: "days",
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
        estimate: 3,
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
      estimate: 3,
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

type ExplorerArg = Parameters<typeof PlanDetailsPanel>[0]["explorer"];

const selectedExplorer = {
  selectedWorkItemId: "item-a",
} as unknown as ExplorerArg;

const emptyExplorer = {
  selectedWorkItemId: null,
} as unknown as ExplorerArg;

function resetEditStore() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
  });
}

describe("PlanDetailsPanel — link rendering (static)", () => {
  it("renders task link labels from authored data", () => {
    const html = renderToStaticMarkup(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
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
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
      />,
    );
    expect(html).toContain('data-icon="file"');
    expect(html).toContain('data-icon="github"');
  });
});

describe("PlanDetailsPanel — selection states", () => {
  beforeEach(() => {
    resetEditStore();
  });
  afterEach(() => {
    cleanup();
    resetEditStore();
  });

  it("renders the neutral fallback when no work item is selected", () => {
    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={emptyExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
      />,
    );

    // Neutral state copy is visible
    expect(
      screen.getByText("Select a work item in the graph to see its details"),
    ).toBeTruthy();
    // None of the editable surfaces are mounted
    expect(screen.queryByTestId("editable-title")).toBeNull();
    expect(screen.queryByTestId("editable-summary")).toBeNull();
    expect(screen.queryByTestId("status-picker-chip")).toBeNull();
  });

  it("falls back to neutral when the selected id points to a missing item", () => {
    const missingExplorer = {
      selectedWorkItemId: "does-not-exist",
    } as unknown as ExplorerArg;

    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={missingExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
      />,
    );

    expect(
      screen.getByText("Select a work item in the graph to see its details"),
    ).toBeTruthy();
  });

  it("renders all editable cells when a work item is selected", () => {
    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
      />,
    );

    expect(screen.getByTestId("editable-title")).toBeTruthy();
    expect(screen.getByTestId("editable-summary")).toBeTruthy();
    expect(screen.getByTestId("status-picker-chip")).toBeTruthy();
    expect(screen.getByTestId("lane-picker-chip")).toBeTruthy();
    expect(screen.getByTestId("priority-picker-chip")).toBeTruthy();
    expect(screen.getByTestId("estimate-value")).toBeTruthy();
    expect(screen.getByTestId("editable-notes")).toBeTruthy();

    // Committed values render inside their editable surfaces
    expect(screen.getByTestId("editable-title").textContent).toBe("Item A");
    expect(screen.getByTestId("editable-summary").textContent).toBe("First.");
  });

  it("renders TagEditorCell, StringListEditorCell (deliverables/reuse), and LinksEditorCell as editable surfaces", () => {
    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
      />,
    );

    // Tag editor input is always present (even with empty tags)
    expect(screen.getByTestId("tag-editor-input")).toBeTruthy();
    // String list "Add" button rendered for both deliverables and reuse_candidates
    expect(screen.getAllByTestId("string-list-add").length).toBe(2);
    // Links editor "Add link" button is present and existing rows render via link-href-N inputs
    expect(screen.getByTestId("link-add")).toBeTruthy();
    expect(screen.getByTestId("link-href-0")).toBeTruthy();
    expect(screen.getByTestId("link-href-1")).toBeTruthy();
  });
});

describe("PlanDetailsPanel — hover affordance", () => {
  beforeEach(() => {
    resetEditStore();
  });
  afterEach(() => {
    cleanup();
    resetEditStore();
  });

  it("renders the dashed hover-border affordance class on the title cell when unfocused", () => {
    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
      />,
    );

    // The hover affordance is expressed as a Tailwind hover utility on the
    // editable surface. Asserting on the class is the cheapest way to verify
    // that the visual hover-state hint exists; CSS :hover doesn't activate
    // under happy-dom.
    const title = screen.getByTestId("editable-title");
    expect(title.className).toMatch(/hover:border-dashed/);

    // And the focused-state class is not yet applied
    expect(title.className).not.toMatch(/border-moss/);
  });
});

describe("PlanDetailsPanel — edit dispatch integration", () => {
  beforeEach(() => {
    resetEditStore();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    resetEditStore();
  });

  it("focus → type → blur on the title cell dispatches a PATCH via the injected patchPlan", async () => {
    const patchPlanMock = vi
      .fn<
        (patch: PlanPatch, opts: PatchPlanOptions) => Promise<EditApiResult>
      >()
      .mockResolvedValue({
        ok: true,
        operationId: "op-1",
        revision: 2,
      });

    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
        patchPlan={patchPlanMock}
      />,
    );

    const titleEl = screen.getByTestId("editable-title");

    // Focus the contentEditable, edit its textContent, then dispatch input + blur.
    await act(async () => {
      fireEvent.focus(titleEl);
      titleEl.textContent = "Item A — edited";
      fireEvent.input(titleEl, {});
      fireEvent.blur(titleEl);
      // Allow the commit microtask + the awaited patchPlan promise to settle.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlanMock).toHaveBeenCalledTimes(1);
    const [patchArg, optsArg] = patchPlanMock.mock.calls[0];
    expect(patchArg).toMatchObject({
      kind: "work_item.field",
      target: { id: "item-a" },
      field: "title",
      value: "Item A — edited",
    });
    expect(optsArg.baseRevision).toBe(1);
    expect(typeof optsArg.operationId).toBe("string");
  });

  it("shows the Saved indicator on the title field after a successful commit", async () => {
    const patchPlanMock = vi
      .fn<
        (patch: PlanPatch, opts: PatchPlanOptions) => Promise<EditApiResult>
      >()
      .mockResolvedValue({
        ok: true,
        operationId: "op-2",
        revision: 2,
      });

    render(
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={selectedExplorer}
        baseRevision={1}
        classify={stubClassify}
        selectedNodeFilteredOut={false}
        patchPlan={patchPlanMock}
      />,
    );

    const titleEl = screen.getByTestId("editable-title");

    await act(async () => {
      fireEvent.focus(titleEl);
      titleEl.textContent = "Item A — edited again";
      fireEvent.input(titleEl, {});
      fireEvent.blur(titleEl);
      await Promise.resolve();
      await Promise.resolve();
    });

    // FieldSaveIndicator should now render the "Saved" microchip
    expect(screen.getByText("Saved")).toBeTruthy();

    // Auto-clears after the timeout — verify it disappears
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
