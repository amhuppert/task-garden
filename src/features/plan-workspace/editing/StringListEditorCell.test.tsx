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
import { StringListEditorCell } from "./StringListEditorCell";
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

function okPatch(): PatchPlanFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    operationId: "op-1",
    revision: 2,
  });
}

describe("StringListEditorCell", () => {
  it("renders existing items", () => {
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one", "two"]}
        baseRevision={1}
        field="deliverables"
      />,
    );

    const inputs = screen.getAllByTestId(
      /string-list-item-/,
    ) as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe("one");
    expect(inputs[1].value).toBe("two");
  });

  it("Add → type → blur commits the appended array", async () => {
    const patchPlan = okPatch();
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one"]}
        baseRevision={1}
        field="deliverables"
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("string-list-add"));

    const inputs = screen.getAllByTestId(
      /string-list-item-/,
    ) as HTMLInputElement[];
    const newInput = inputs[1];

    await act(async () => {
      newInput.focus();
      fireEvent.change(newInput, { target: { value: "two" } });
      newInput.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.string_list",
      target: { id: "a" },
      field: "deliverables",
      value: ["one", "two"],
    });
  });

  it("× removes an item", async () => {
    const patchPlan = okPatch();
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one", "two"]}
        baseRevision={1}
        field="deliverables"
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove item one"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.string_list",
      target: { id: "a" },
      field: "deliverables",
      value: ["two"],
    });
  });

  it("moves focus to the previous row's remove button after removing a later item", async () => {
    const patchPlan = okPatch();
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one", "two"]}
        baseRevision={1}
        field="deliverables"
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove item two"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(
      screen.getByLabelText("Remove item one"),
    );
  });

  it("moves focus to the next row's remove button after removing the first item", async () => {
    const patchPlan = okPatch();
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one", "two"]}
        baseRevision={1}
        field="deliverables"
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove item one"));
      await Promise.resolve();
      await Promise.resolve();
    });

    // The surviving row slides into the removed row's place; focus must land
    // on its remove control, not skip past the list to the Add button.
    // (Looked up via the row container: the fixture's committedValue restores
    // both rows once the ok-commit resolves, so value-based labels shift.)
    const firstRow = screen.getByTestId("string-list-row-0");
    const rowButtons = firstRow.querySelectorAll("button");
    expect(document.activeElement).toBe(rowButtons[rowButtons.length - 1]);
  });

  it("moves focus to the Add button after removing the only item", async () => {
    const patchPlan = okPatch();
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one"]}
        baseRevision={1}
        field="deliverables"
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove item one"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(screen.getByTestId("string-list-add"));
  });

  it("filters whitespace-only entries before commit", async () => {
    const patchPlan = okPatch();
    render(
      <StringListEditorCell
        workItemId="a"
        committedValue={["one"]}
        baseRevision={1}
        field="reuse_candidates"
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("string-list-add"));
    fireEvent.click(screen.getByTestId("string-list-add"));

    const inputs = screen.getAllByTestId(
      /string-list-item-/,
    ) as HTMLInputElement[];
    expect(inputs).toHaveLength(3);
    const blank = inputs[1];
    const filled = inputs[2];

    await act(async () => {
      blank.focus();
      fireEvent.change(blank, { target: { value: "   " } });
      filled.focus();
      fireEvent.change(filled, { target: { value: "valid" } });
      filled.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.string_list",
      target: { id: "a" },
      field: "reuse_candidates",
      value: ["one", "valid"],
    });
  });
});
