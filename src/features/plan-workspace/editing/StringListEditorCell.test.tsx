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
import { StringListEditorCell } from "./StringListEditorCell";
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
