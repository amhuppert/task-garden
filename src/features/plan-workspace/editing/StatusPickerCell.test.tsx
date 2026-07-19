// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { installRadixDomShims } from "../ui/test/radix-dom-shims";
import { StatusPickerCell } from "./StatusPickerCell";
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

  it("clicking the chip opens the listbox and lists all statuses", async () => {
    const user = userEvent.setup();
    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
      />,
    );

    await user.click(screen.getByTestId("status-picker-chip"));

    const listbox = await screen.findByRole("listbox", {
      name: /set status/i,
    });
    expect(listbox).toBeTruthy();
    expect(screen.getByRole("option", { name: /in progress/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /done/i })).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(6);
  });

  it("selecting an option commits the patch and closes the listbox", async () => {
    const user = userEvent.setup();
    const patchPlan = okPatchPlan();

    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    await user.click(screen.getByTestId("status-picker-chip"));
    await user.click(
      await screen.findByRole("option", { name: /in progress/i }),
    );

    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    expect(lastPatchArg(patchPlan)).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "status",
      value: "in_progress",
    });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  it("opens from the keyboard, moves with arrows, and commits with Enter", async () => {
    const user = userEvent.setup();
    const patchPlan = okPatchPlan();

    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    screen.getByTestId("status-picker-chip").focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");

    // Schema order: planned, ready, blocked, ... — one down from Ready is Blocked.
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /blocked/i }),
      );
    });

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    expect(lastPatchArg(patchPlan)).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "status",
      value: "blocked",
    });
  });

  it("jumps to a status via typeahead and commits it", async () => {
    const user = userEvent.setup();
    const patchPlan = okPatchPlan();

    render(
      <StatusPickerCell
        workItemId="a"
        committedValue="ready"
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    await user.click(screen.getByTestId("status-picker-chip"));
    await screen.findByRole("listbox");

    await user.keyboard("d");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /done/i }),
      );
    });

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    expect(lastPatchArg(patchPlan)).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "status",
      value: "done",
    });
  });
});
