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
import { EstimateStepperCell } from "./EstimateStepperCell";
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

describe("EstimateStepperCell", () => {
  it("renders the committed value formatted to one decimal", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );
    expect(screen.getByTestId("estimate-value").textContent).toBe("2.0");
  });

  it("renders an em dash when the committed value is null", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={null}
        estimateUnit="days"
        baseRevision={1}
      />,
    );
    expect(screen.getByTestId("estimate-value").textContent).toBe("—");
  });

  it("clicking minus three times decrements draft by 0.5 each click", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const minus = screen.getByRole("button", { name: /decrease estimate/i });
    act(() => fireEvent.click(minus));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(1.5);
    act(() => fireEvent.click(minus));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(1.0);
    act(() => fireEvent.click(minus));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(0.5);
  });

  it("clicking plus increments draft by 0.5", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={1}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const plus = screen.getByRole("button", { name: /increase estimate/i });
    act(() => fireEvent.click(plus));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(1.5);
  });

  it("on blur, commits the patch with the numeric value", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const minus = screen.getByRole("button", { name: /decrease estimate/i });
    act(() => fireEvent.click(minus));

    await act(async () => {
      // Blur the button with no relatedTarget inside the container
      fireEvent.blur(minus, { relatedTarget: document.body });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.estimate",
      target: { id: "a" },
      value: 1.5,
    });
  });

  it("when the value reaches 0, commits with value: null", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={0.5}
        estimateUnit="days"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const minus = screen.getByRole("button", { name: /decrease estimate/i });
    act(() => fireEvent.click(minus));

    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(0);

    await act(async () => {
      fireEvent.blur(minus, { relatedTarget: document.body });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.estimate",
      target: { id: "a" },
      value: null,
    });
  });
});
