// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { EstimateStepperCell } from "./EstimateStepperCell";
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

function getInput(): HTMLInputElement {
  return screen.getByTestId("estimate-value") as HTMLInputElement;
}

describe("EstimateStepperCell", () => {
  it("renders a native number input with the committed value and stepper attrs", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );
    const input = getInput();
    expect(input.type).toBe("number");
    expect(input.getAttribute("step")).toBe("0.5");
    expect(input.getAttribute("min")).toBe("0");
    expect(input.value).toBe("2");
    expect(screen.getByLabelText("Estimate")).toBe(input);
  });

  it("renders an empty input with an em-dash placeholder when the committed value is null", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={null}
        estimateUnit="days"
        baseRevision={1}
      />,
    );
    const input = getInput();
    expect(input.value).toBe("");
    expect(input.getAttribute("placeholder")).toBe("—");
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

  it("at 0 the minus button stays focusable (aria-disabled) and clicking it is a no-op", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={null}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const minus = screen.getByRole("button", { name: /decrease estimate/i });
    // Native disabled would drop focus to <body> when the value reaches 0
    // mid-interaction; aria-disabled + click guard keeps the control live.
    expect(minus.getAttribute("aria-disabled")).toBe("true");
    expect(minus.hasAttribute("disabled")).toBe(false);

    act(() => minus.focus());
    act(() => fireEvent.click(minus));
    expect(
      useEditStore.getState().drafts["work_item:a:estimate"],
    ).toBeUndefined();
    expect(document.activeElement).toBe(minus);
  });

  it("keeps both stepper buttons out of the tab sequence (input arrows cover keyboard stepping)", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const minus = screen.getByRole("button", { name: /decrease estimate/i });
    const plus = screen.getByRole("button", { name: /increase estimate/i });
    expect(minus.getAttribute("tabindex")).toBe("-1");
    expect(plus.getAttribute("tabindex")).toBe("-1");
  });

  it("clicking plus increments draft by 0.5 and announces unsaved changes", () => {
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
    expect(screen.getByText("unsaved changes")).toBeTruthy();
  });

  it("ArrowUp and ArrowDown on the input step the draft by 0.5", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const input = getInput();
    act(() => fireEvent.keyDown(input, { key: "ArrowUp" }));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(2.5);
    act(() => fireEvent.keyDown(input, { key: "ArrowDown" }));
    act(() => fireEvent.keyDown(input, { key: "ArrowDown" }));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(1.5);
  });

  it("ArrowUp from a null estimate drafts 0.5; ArrowDown clamps at 0", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={null}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const input = getInput();
    act(() => fireEvent.keyDown(input, { key: "ArrowDown" }));
    expect(
      useEditStore.getState().drafts["work_item:a:estimate"],
    ).toBeUndefined();
    act(() => fireEvent.keyDown(input, { key: "ArrowUp" }));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(0.5);
    expect(input.value).toBe("0.5");
  });

  it("typing a value updates the draft; negatives clamp to 0", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const input = getInput();
    act(() => fireEvent.change(input, { target: { value: "3.5" } }));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(3.5);
    act(() => fireEvent.change(input, { target: { value: "-1" } }));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(0);
  });

  it("clearing the input drafts 0 (committed as null)", () => {
    render(
      <EstimateStepperCell
        workItemId="a"
        committedValue={2}
        estimateUnit="days"
        baseRevision={1}
      />,
    );

    const input = getInput();
    act(() => fireEvent.change(input, { target: { value: "" } }));
    expect(useEditStore.getState().drafts["work_item:a:estimate"]).toBe(0);
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

  it("does not commit when focus moves between controls inside the stepper", async () => {
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

    const input = getInput();
    act(() => fireEvent.change(input, { target: { value: "3" } }));

    const plus = screen.getByRole("button", { name: /increase estimate/i });
    await act(async () => {
      fireEvent.blur(input, { relatedTarget: plus });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
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
