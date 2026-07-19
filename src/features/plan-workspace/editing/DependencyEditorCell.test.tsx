// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlanAnalysisEngine } from "../../../lib/graph/plan-analysis-engine";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type {
  TaskGardenPlan,
  TaskGardenWorkItem,
} from "../../../lib/plan/task-garden-plan.schema";
import { DependencyEditorCell } from "./DependencyEditorCell";
import { useEditStore } from "./edit.store";

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
    value: 60,
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
    estimate_unit: "days",
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

  it("moves focus to the previous chip's unlink button after removing a later dependency", async () => {
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={["b", "c"]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={okPatch()}
      />,
    );

    await act(async () => {
      const unlink = screen.getByLabelText("Unlink c");
      unlink.focus();
      fireEvent.click(unlink);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(screen.getByLabelText("Unlink b"));
  });

  it("moves focus to the link-dependency trigger after removing the first chip", async () => {
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={["b", "c"]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={okPatch()}
      />,
    );

    await act(async () => {
      const unlink = screen.getByLabelText("Unlink b");
      unlink.focus();
      fireEvent.click(unlink);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Removing the focused button must not drop focus to <body>.
    expect(document.activeElement).toBe(
      screen.getByTestId("dep-editor-open-picker"),
    );
  });

  it("collapsed trigger exposes disclosure semantics for the picker", () => {
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={[]}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={vi.fn() as PatchPlanFn}
      />,
    );

    const trigger = screen.getByTestId("dep-editor-open-picker");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("DependencyEditorCell picker combobox (APG)", () => {
  const items = [makeWorkItem("a"), makeWorkItem("b"), makeWorkItem("c")];

  function renderAndOpen(
    patchPlan: PatchPlanFn,
    committedValue: string[] = [],
  ) {
    render(
      <DependencyEditorCell
        workItemId="a"
        committedValue={committedValue}
        baseRevision={1}
        mode="upstream"
        allWorkItems={items}
        snapshot={snapshotOf(items)}
        patchPlan={patchPlan}
      />,
    );
    fireEvent.click(screen.getByTestId("dep-editor-open-picker"));
    return screen.getByTestId("dep-picker-search") as HTMLInputElement;
  }

  it("exposes combobox roles: expanded input controlling a listbox of options", () => {
    const search = renderAndOpen(vi.fn() as PatchPlanFn);

    expect(search.getAttribute("role")).toBe("combobox");
    expect(search.getAttribute("aria-expanded")).toBe("true");
    expect(search.getAttribute("aria-autocomplete")).toBe("list");

    const listbox = screen.getByRole("listbox");
    expect(search.getAttribute("aria-controls")).toBe(listbox.id);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("keeps options out of the tab sequence — DOM focus stays on the combobox input", () => {
    renderAndOpen(vi.fn() as PatchPlanFn);

    for (const option of screen.getAllByRole("option")) {
      expect(option.getAttribute("tabindex")).toBe("-1");
    }
  });

  it("renders the no-results message outside the listbox, in a status region", () => {
    const search = renderAndOpen(vi.fn() as PatchPlanFn);

    fireEvent.change(search, { target: { value: "zzz-no-such-item" } });

    // role=listbox may only own option children; the message must live
    // elsewhere and be announced to the aria-activedescendant user.
    const listbox = screen.getByRole("listbox");
    expect(listbox.textContent).toBe("");
    expect(screen.queryAllByRole("option")).toHaveLength(0);

    // Several persistent status regions exist in the cell (dirty state, save
    // indicator), so locate the message by text and verify its region.
    const message = screen.getByText("No matches");
    expect(listbox.contains(message)).toBe(false);
    expect(message.closest("output")).not.toBeNull();
  });

  it("marks blocked candidates aria-disabled and leaves valid ones enabled", () => {
    const search = renderAndOpen(vi.fn() as PatchPlanFn, ["b"]);
    expect(search).toBeTruthy();

    expect(
      screen.getByTestId("dep-candidate-a").getAttribute("aria-disabled"),
    ).toBe("true"); // self
    expect(
      screen.getByTestId("dep-candidate-b").getAttribute("aria-disabled"),
    ).toBe("true"); // duplicate
    expect(
      screen.getByTestId("dep-candidate-c").getAttribute("aria-disabled"),
    ).toBeNull();
  });

  it("ArrowDown/ArrowUp move aria-activedescendant through the options, wrapping", () => {
    const search = renderAndOpen(vi.fn() as PatchPlanFn);

    expect(search.getAttribute("aria-activedescendant")).toBeNull();

    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search.getAttribute("aria-activedescendant")).toBe(
      screen.getByTestId("dep-candidate-a").id,
    );

    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search.getAttribute("aria-activedescendant")).toBe(
      screen.getByTestId("dep-candidate-b").id,
    );

    fireEvent.keyDown(search, { key: "ArrowUp" });
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(search.getAttribute("aria-activedescendant")).toBe(
      screen.getByTestId("dep-candidate-c").id,
    );
  });

  it("Enter on the active valid option commits it, closes the picker, and returns focus to the trigger", async () => {
    const patchPlan = okPatch();
    const search = renderAndOpen(patchPlan);

    fireEvent.change(search, { target: { value: "b" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });

    await act(async () => {
      fireEvent.keyDown(search, { key: "Enter" });
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
    expect(screen.queryByTestId("dep-picker")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByTestId("dep-editor-open-picker"),
    );
  });

  it("Enter on a blocked active option shows the error and keeps the picker open", async () => {
    const patchPlan = vi.fn();
    const search = renderAndOpen(patchPlan as PatchPlanFn);

    fireEvent.keyDown(search, { key: "ArrowDown" }); // self candidate "a"

    await act(async () => {
      fireEvent.keyDown(search, { key: "Enter" });
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("dep-picker")).toBeTruthy();
    expect(screen.getByTestId("dep-editor-error").textContent).toContain(
      "depend on itself",
    );
    expect(search.getAttribute("aria-describedby")).toBe(
      screen.getByTestId("dep-editor-error").id,
    );
  });

  it("the error line renders inside a persistent role=alert live region", () => {
    const search = renderAndOpen(vi.fn() as PatchPlanFn);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("");

    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(screen.getByRole("alert")).toBe(alert);
    expect(alert.textContent).toContain("depend on itself");
  });

  it("Escape closes the picker, clears the query, and returns focus to the trigger", () => {
    const search = renderAndOpen(vi.fn() as PatchPlanFn);
    fireEvent.change(search, { target: { value: "b" } });

    fireEvent.keyDown(search, { key: "Escape" });

    expect(screen.queryByTestId("dep-picker")).toBeNull();
    const trigger = screen.getByTestId("dep-editor-open-picker");
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    expect(
      (screen.getByTestId("dep-picker-search") as HTMLInputElement).value,
    ).toBe("");
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
