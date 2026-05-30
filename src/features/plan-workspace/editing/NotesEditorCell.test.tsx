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
import { NotesEditorCell } from "./NotesEditorCell";
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

describe("NotesEditorCell", () => {
  it("renders the committed notes", () => {
    render(
      <NotesEditorCell
        workItemId="a"
        committedValue="line 1"
        baseRevision={1}
      />,
    );
    expect(screen.getByTestId("editable-notes").textContent).toBe("line 1");
  });

  it("renders empty when committedValue is null", () => {
    render(
      <NotesEditorCell workItemId="a" committedValue={null} baseRevision={1} />,
    );
    expect(screen.getByTestId("editable-notes").textContent).toBe("");
  });

  it("typing updates the draft", () => {
    render(
      <NotesEditorCell
        workItemId="a"
        committedValue="initial"
        baseRevision={1}
      />,
    );

    const el = screen.getByTestId("editable-notes");
    act(() => {
      el.focus();
      el.textContent = "updated notes";
      fireEvent.input(el);
    });

    expect(useEditStore.getState().drafts["work_item:a:notes"]).toBe(
      "updated notes",
    );
  });

  it("blur dispatches a patch with the new text", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <NotesEditorCell
        workItemId="a"
        committedValue="initial"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-notes");
    act(() => {
      el.focus();
      el.textContent = "new content";
      fireEvent.input(el);
    });

    await act(async () => {
      el.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "notes",
      value: "new content",
    });
  });

  it("blur with empty content dispatches a patch with value: null", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <NotesEditorCell
        workItemId="a"
        committedValue="initial"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-notes");
    act(() => {
      el.focus();
      el.textContent = "";
      fireEvent.input(el);
    });

    await act(async () => {
      el.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "notes",
      value: null,
    });
  });

  it("does not mutate the contentEditable DOM during the input-driven re-render (preserves caret)", async () => {
    render(
      <NotesEditorCell
        workItemId="a"
        committedValue="initial"
        baseRevision={1}
      />,
    );

    const el = screen.getByTestId("editable-notes");

    act(() => {
      el.focus();
    });

    // Simulate a real-browser keypress: append to the existing text node
    // in place instead of replacing children. In a real browser the caret
    // would sit at the end (offset 8).
    const textNode = el.firstChild as Text;
    textNode.appendData("X");

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
      await Promise.resolve();
    });

    observer.disconnect();

    expect(mutations).toEqual([]);
    expect(el.textContent).toBe("initialX");
  });

  it("Escape rolls back the draft", async () => {
    const patchPlan: PatchPlanFn = vi.fn();

    render(
      <NotesEditorCell
        workItemId="a"
        committedValue="initial"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-notes");
    act(() => {
      el.focus();
      el.textContent = "changed";
      fireEvent.input(el);
    });

    expect(useEditStore.getState().drafts["work_item:a:notes"]).toBe("changed");

    await act(async () => {
      fireEvent.keyDown(el, { key: "Escape" });
      await Promise.resolve();
    });

    expect("work_item:a:notes" in useEditStore.getState().drafts).toBe(false);
    expect(patchPlan).not.toHaveBeenCalled();
  });
});
