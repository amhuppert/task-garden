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
import { SummaryEditorCell } from "./SummaryEditorCell";
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

describe("SummaryEditorCell", () => {
  it("renders the committed summary", () => {
    render(
      <SummaryEditorCell
        workItemId="a"
        committedValue="Initial summary"
        baseRevision={1}
      />,
    );
    expect(screen.getByTestId("editable-summary").textContent).toBe(
      "Initial summary",
    );
  });

  it("typing updates the draft", () => {
    render(
      <SummaryEditorCell
        workItemId="a"
        committedValue="Initial"
        baseRevision={1}
      />,
    );

    const el = screen.getByTestId("editable-summary");
    act(() => {
      el.focus();
      el.textContent = "Updated text";
      fireEvent.input(el);
    });

    expect(useEditStore.getState().drafts["work_item:a:summary"]).toBe(
      "Updated text",
    );
  });

  it("blur commits the patch", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <SummaryEditorCell
        workItemId="a"
        committedValue="Initial"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-summary");
    act(() => {
      el.focus();
      el.textContent = "Updated";
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
      field: "summary",
      value: "Updated",
    });
  });

  it("Escape rolls back the draft without dispatching", async () => {
    const patchPlan: PatchPlanFn = vi.fn();

    render(
      <SummaryEditorCell
        workItemId="a"
        committedValue="Initial"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const el = screen.getByTestId("editable-summary");
    act(() => {
      el.focus();
      el.textContent = "Updated";
      fireEvent.input(el);
    });
    expect(useEditStore.getState().drafts["work_item:a:summary"]).toBe(
      "Updated",
    );

    await act(async () => {
      fireEvent.keyDown(el, { key: "Escape" });
      await Promise.resolve();
    });

    expect("work_item:a:summary" in useEditStore.getState().drafts).toBe(false);
    expect(patchPlan).not.toHaveBeenCalled();
  });
});
