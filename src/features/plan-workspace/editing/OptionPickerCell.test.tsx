// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import type { SelectOption } from "../ui/Select";
import { installRadixDomShims } from "../ui/test/radix-dom-shims";
import { OptionPickerCell } from "./OptionPickerCell";
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

const OPTIONS: SelectOption[] = [
  {
    value: "core",
    label: "Core Domain",
    swatchColor: "#111",
    swatchShape: "bar",
  },
  {
    value: "infra",
    label: "Infrastructure",
    swatchColor: "#222",
    swatchShape: "bar",
  },
  {
    value: "ui",
    label: "User Interface",
    swatchColor: "#333",
    swatchShape: "bar",
  },
];

function renderCell(
  overrides: Partial<Parameters<typeof OptionPickerCell>[0]> = {},
) {
  render(
    <OptionPickerCell
      workItemId="a"
      field="lane"
      label="Lane"
      ariaLabel="Set lane"
      testId="lane-picker-chip"
      options={OPTIONS}
      committedValue="core"
      baseRevision={1}
      {...overrides}
    />,
  );
}

describe("OptionPickerCell", () => {
  it("renders the kicker label and a trigger stamped with testId showing the selected option", () => {
    renderCell();

    expect(screen.getByText("Lane")).toBeTruthy();
    const trigger = screen.getByTestId("lane-picker-chip");
    expect(trigger).toBe(screen.getByRole("combobox", { name: "Lane" }));
    expect(trigger.textContent).toContain("Core Domain");
  });

  it("normalizes an unknown committed value to the first option before the Select", () => {
    renderCell({ committedValue: "deleted-lane" });

    expect(screen.getByTestId("lane-picker-chip").textContent).toContain(
      "Core Domain",
    );
  });

  it("selecting an option commits a work_item.field patch for the given field", async () => {
    const user = userEvent.setup();
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });
    renderCell({ patchPlan });

    await user.click(screen.getByTestId("lane-picker-chip"));
    await user.click(
      await screen.findByRole("option", { name: "Infrastructure" }),
    );

    await waitFor(() => {
      expect(patchPlan).toHaveBeenCalledTimes(1);
    });
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.field",
      target: { id: "a" },
      field: "lane",
      value: "infra",
    });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  it("marks the field as having unsaved changes while the commit is in flight", async () => {
    const user = userEvent.setup();
    const patchPlan: PatchPlanFn = vi
      .fn()
      .mockReturnValue(new Promise(() => {}));
    renderCell({ patchPlan });

    expect(screen.queryByText("unsaved changes")).toBeNull();

    await user.click(screen.getByTestId("lane-picker-chip"));
    await user.click(
      await screen.findByRole("option", { name: "Infrastructure" }),
    );

    await waitFor(() => {
      expect(screen.getByText("unsaved changes")).toBeTruthy();
    });
  });

  it("shows the save indicator once the commit succeeds", async () => {
    const user = userEvent.setup();
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });
    renderCell({ patchPlan });

    await user.click(screen.getByTestId("lane-picker-chip"));
    await user.click(
      await screen.findByRole("option", { name: "Infrastructure" }),
    );

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeTruthy();
    });
    expect(screen.queryByText("unsaved changes")).toBeNull();
  });
});
