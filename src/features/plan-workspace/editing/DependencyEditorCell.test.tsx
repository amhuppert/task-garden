// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import { createPlanAnalysisEngine } from "../../../lib/graph/plan-analysis-engine";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type {
  TaskGardenPlan,
  TaskGardenWorkItem,
} from "../../../lib/plan/task-garden-plan.schema";
import { DependencyEditorCell } from "./DependencyEditorCell";
import { useEditStore } from "./edit.store";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

function reset() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
  });
}

beforeEach(reset);
afterEach(cleanup);

function makeWorkItem(
  id: string,
  depends_on: string[] = [],
): TaskGardenWorkItem {
  return {
    id,
    title: `Title ${id}`,
    summary: `Summary ${id}`,
    lane: "lane-1",
    status: "planned",
    priority: "p1",
    depends_on,
    tags: [],
    deliverables: [],
    reuse_candidates: [],
    links: [],
  };
}

function makePlan(items: TaskGardenWorkItem[]): TaskGardenPlan {
  return {
    version: 1,
    plan_id: "test-plan",
    title: "Test",
    last_updated: "2024-01-01",
    summary: "Test plan",
    references: [],
    lanes: [{ id: "lane-1", label: "Lane 1" }],
    work_items: items,
  };
}

function snapshotOf(items: TaskGardenWorkItem[]) {
  return createPlanAnalysisEngine().build(makePlan(items));
}

function okPatch(): PatchPlanFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    operationId: "op-1",
    revision: 2,
  });
}

describe("DependencyEditorCell (upstream)", () => {
  const items = [makeWorkItem("a"), makeWorkItem("b"), makeWorkItem("c")];

  it("typeahead filters the candidate list by id and title", () => {
    const patchPlan = vi.fn();
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={[]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={patchPlan as PatchPlanFn}
      />,
    );

    fireEvent.click(screen.getByTestId("dep-editor-open-picker"));

    const search = screen.getByTestId("dep-picker-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "b" } });

    expect(screen.getByTestId("dep-candidate-b")).toBeTruthy();
    expect(screen.queryByTestId("dep-candidate-c")).toBeNull();
  });

  it("clicking self in the picker blocks the commit and shows the self_dependency copy", async () => {
    const patchPlan = vi.fn();
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={[]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={patchPlan as PatchPlanFn}
      />,
    );

    fireEvent.click(screen.getByTestId("dep-editor-open-picker"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("dep-candidate-a"));
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("dep-editor-error").textContent).toContain(
      "depend on itself",
    );
  });

  it("clicking a duplicate dependency blocks the commit and shows the duplicate_dependency copy", async () => {
    const patchPlan = vi.fn();
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={["b"]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={patchPlan as PatchPlanFn}
      />,
    );

    fireEvent.click(screen.getByTestId("dep-editor-open-picker"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("dep-candidate-b"));
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("dep-editor-error").textContent).toContain(
      "Duplicate dependency",
    );
  });

  it("blocks a candidate that would create a cycle with the cycle_detected copy", async () => {
    // a depends_on b ; b depends_on c. Editor for 'c': c -> a closes a cycle.
    const cycleItems = [
      makeWorkItem("a", ["b"]),
      makeWorkItem("b", ["c"]),
      makeWorkItem("c"),
    ];
    const patchPlan = vi.fn();
    render(
      <DependencyEditorCell
        workItemId="c"
        committedValue={[]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={cycleItems}
        snapshot={snapshotOf(cycleItems)}
        patchPlan={patchPlan as PatchPlanFn}
      />,
    );

    fireEvent.click(screen.getByTestId("dep-editor-open-picker"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("dep-candidate-a"));
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("dep-editor-error").textContent).toContain(
      "Would create a cycle",
    );
  });

  it("accepts a valid candidate and commits the new array", async () => {
    const patchPlan = okPatch();
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={[]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("dep-editor-open-picker"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("dep-candidate-b"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.depends_on",
      target: { id: "a" },
      value: ["b"],
    });
  });

  it("× removes an existing dependency and commits the reduced array", async () => {
    const patchPlan = okPatch();
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={["b"]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Unlink b"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.depends_on",
      target: { id: "a" },
      value: [],
    });
  });
});

describe("DependencyEditorCell (dependents)", () => {
  const items = [makeWorkItem("a"), makeWorkItem("b", ["a"])];

  it("renders dependents with no remove affordance", () => {
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={["b"]}
        baseRevision={1}
        mode="dependents"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
      />,
    );

    expect(screen.getByText("b")).toBeTruthy();
    expect(screen.queryByLabelText("Unlink b")).toBeNull();
  });

  it("invokes onBranchNewDependent when the branch button is clicked", () => {
    const onBranch = vi.fn();
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={["b"]}
        baseRevision={1}
        mode="dependents"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        onBranchNewDependent={onBranch}
      />,
    );

    fireEvent.click(screen.getByTestId("dep-branch-new-dependent"));
    expect(onBranch).toHaveBeenCalledTimes(1);
  });
});
