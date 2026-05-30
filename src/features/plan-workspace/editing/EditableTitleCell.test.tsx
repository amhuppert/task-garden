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
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import { EditableTitleCell } from "./EditableTitleCell";
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

describe("EditableTitleCell", () => {
  it("renders the committed title", () => {
    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
      />,
    );
    expect(screen.getByTestId("editable-title").textContent).toBe("Original");
  });

  it("typing into the cell updates the draft and shows the dirty dot", () => {
    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
      />,
    );

    const el = screen.getByTestId("editable-title");
    act(() => {
      el.focus();
      el.textContent = "Edited";
      fireEvent.input(el);
    });

    expect(useEditStore.getState().drafts["work_item:a:title"]).toBe("Edited");
    expect(screen.getByTestId("title-dirty-dot")).toBeTruthy();
  });

  it("blur dispatches a PATCH with the new value", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-title");
    act(() => {
      el.focus();
      el.textContent = "Renamed";
      fireEvent.input(el);
    });

    await act(async () => {
      el.blur();
      // give the commit promise time to resolve
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "title",
      value: "Renamed",
    });
  });

  it("Enter commits and blurs", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-title");
    act(() => {
      el.focus();
      el.textContent = "Renamed";
      fireEvent.input(el);
    });

    await act(async () => {
      fireEvent.keyDown(el, { key: "Enter" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
  });

  it("Escape rolls back the draft and does not commit", async () => {
    const patchPlan: PatchPlanFn = vi.fn();

    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-title");
    act(() => {
      el.focus();
      el.textContent = "Renamed";
      fireEvent.input(el);
    });

    expect(useEditStore.getState().drafts["work_item:a:title"]).toBe("Renamed");

    await act(async () => {
      fireEvent.keyDown(el, { key: "Escape" });
      await Promise.resolve();
    });

    expect("work_item:a:title" in useEditStore.getState().drafts).toBe(false);
    expect(patchPlan).not.toHaveBeenCalled();
  });

  it("does not mutate the contentEditable DOM during the input-driven re-render (preserves caret)", async () => {
    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
      />,
    );

    const el = screen.getByTestId("editable-title");

    act(() => {
      el.focus();
    });

    // Simulate a real-browser keypress in a contentEditable: the browser
    // appends to the existing text node in place — it does not replace
    // children. Cursor would naturally land at offset 9 (end of text).
    const textNode = el.firstChild as Text;
    textNode.appendData("X");

    // Watch for any DOM writes during the React re-render triggered by
    // setDraft. In a real browser, *any* characterData/childList write
    // on this subtree collapses the caret to offset 0 — that is the
    // user-visible bug.
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => {
      mutations.push(...records);
    });
    observer.observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    await act(async () => {
      fireEvent.input(el);
      // Flush MutationObserver microtask
      await Promise.resolve();
    });

    observer.disconnect();

    expect(mutations).toEqual([]);
    expect(el.textContent).toBe("OriginalX");
  });

  it("shows the saved indicator after a successful save", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <EditableTitleCell
        workItemId="a"
        committedValue="Original"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-title");
    act(() => {
      el.focus();
      el.textContent = "Renamed";
      fireEvent.input(el);
    });

    await act(async () => {
      el.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/saved/i)).toBeTruthy();
  });
});
