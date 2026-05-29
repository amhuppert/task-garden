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
import { PriorityPickerCell } from "./PriorityPickerCell";
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

describe("PriorityPickerCell", () => {
  it("renders the current priority label", () => {
    render(
      <PriorityPickerCell
        workItemId="a"
        committedValue="p1"
        baseRevision={1}
      />,
    );
    expect(screen.getByTestId("priority-picker-chip").textContent).toContain(
      "P1",
    );
  });

  it("clicking the chip opens the popover and lists all priorities", () => {
    render(
      <PriorityPickerCell
        workItemId="a"
        committedValue="p1"
        baseRevision={1}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("priority-picker-chip"));
    });

    expect(screen.getByRole("listbox", { name: /set priority/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /P0/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Nice to Have/ })).toBeTruthy();
  });

  it("selecting an option commits the patch and closes the popover", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <PriorityPickerCell
        workItemId="a"
        committedValue="p1"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("priority-picker-chip"));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /P0/ }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "priority",
      value: "p0",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
