// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import { installRadixDomShims } from "../ui/test/radix-dom-shims";
import { LanePickerCell } from "./LanePickerCell";
import { useEditStore } from "./edit.store";

installRadixDomShims();

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

function okPatchPlan(): PatchPlanFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    operationId: "op-1",
    revision: 2,
  });
}

function lastPatchArg(patchPlan: PatchPlanFn): unknown {
  return (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

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

  it("falls back to the first lane when the committed lane id is unknown", () => {
    render(
      <LanePickerCell
        workItemId="a"
        committedValue="deleted-lane"
        baseRevision={1}
        lanes={lanes}
      />,
    );

    expect(screen.getByTestId("lane-picker-chip").textContent).toContain(
      "Core Domain",
    );
  });

  it("clicking the chip opens the listbox listing all lanes from props", async () => {
    const user = userEvent.setup();
    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
      />,
    );

    await user.click(screen.getByTestId("lane-picker-chip"));

    expect(
      await screen.findByRole("listbox", { name: /set lane/i }),
    ).toBeTruthy();
    expect(screen.getByRole("option", { name: /Infrastructure/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /User Interface/ })).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selecting an option commits the patch with the chosen lane id", async () => {
    const user = userEvent.setup();
    const patchPlan = okPatchPlan();

    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
        patchPlan={patchPlan}
      />,
    );

    await user.click(screen.getByTestId("lane-picker-chip"));
    await user.click(
      await screen.findByRole("option", { name: /Infrastructure/ }),
    );

    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    expect(lastPatchArg(patchPlan)).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "lane",
      value: "infra",
    });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  it("opens from the keyboard, moves with arrows, and commits with Enter", async () => {
    const user = userEvent.setup();
    const patchPlan = okPatchPlan();

    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
        patchPlan={patchPlan}
      />,
    );

    screen.getByTestId("lane-picker-chip").focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /Infrastructure/ }),
      );
    });

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    expect(lastPatchArg(patchPlan)).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "lane",
      value: "infra",
    });
  });

  it("jumps to a lane via typeahead and commits it", async () => {
    const user = userEvent.setup();
    const patchPlan = okPatchPlan();

    render(
      <LanePickerCell
        workItemId="a"
        committedValue="core"
        baseRevision={1}
        lanes={lanes}
        patchPlan={patchPlan}
      />,
    );

    await user.click(screen.getByTestId("lane-picker-chip"));
    await screen.findByRole("listbox");

    await user.keyboard("u");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /User Interface/ }),
      );
    });

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    expect(lastPatchArg(patchPlan)).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "lane",
      value: "ui",
    });
  });
});
