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
import { StatusPickerCell } from "./StatusPickerCell";
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

describe("StatusPickerCell", () => {
  it("renders the current status label", () => {
    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
      />,
    );

    expect(screen.getByTestId("status-picker-chip").textContent).toContain(
      "Ready",
    );
  });

  it("clicking the chip opens the popover and lists all statuses", () => {
    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("status-picker-chip"));
    });

    const listbox = screen.getByRole("listbox", { name: /set status/i });
    expect(listbox).toBeTruthy();
    expect(screen.getByRole("option", { name: /in progress/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /done/i })).toBeTruthy();
  });

  it("selecting an option commits the patch and closes the popover", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("status-picker-chip"));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /in progress/i }));
      // commit is queued in microtask
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "status",
      value: "in_progress",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
