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
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import { LanePickerCell } from "./LanePickerCell";
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

const lanes: TaskGardenLane[] = [
  { id: "core", label: "Core Domain" },
  { id: "infra", label: "Infrastructure" },
  { id: "ui", label: "User Interface" },
];

describe("LanePickerCell", () => {
  it("renders the current lane label", () => {
    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
      />,
    );
    expect(screen.getByTestId("lane-picker-chip").textContent).toContain(
      "Core Domain",
    );
  });

  it("clicking the chip opens the popover listing all lanes from props", () => {
    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("lane-picker-chip"));
    });

    expect(screen.getByRole("listbox", { name: /set lane/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Infrastructure/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /User Interface/ })).toBeTruthy();
  });

  it("selecting an option commits the patch with the chosen lane id", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
        patchPlan={patchPlan}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("lane-picker-chip"));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Infrastructure/ }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "lane",
      value: "infra",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
