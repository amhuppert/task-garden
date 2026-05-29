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
import { TagEditorCell } from "./TagEditorCell";
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

describe("TagEditorCell", () => {
  it("renders existing tags as chips", () => {
    render(
      <TagEditorCell
        workItemId="a"
        committedValue={["schema", "validation"]}
        baseRevision={1}
      />,
    );
    expect(screen.getByText("#schema")).toBeTruthy();
    expect(screen.getByText("#validation")).toBeTruthy();
  });

  it("Enter adds a tag and commits the appended array", async () => {
    const patchPlan = okPatch();
    render(
      <TagEditorCell
        workItemId="a"
        committedValue={["schema"]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const input = screen.getByTestId("tag-editor-input") as HTMLInputElement;

    await act(async () => {
      input.focus();
      fireEvent.change(input, { target: { value: "validation" } });
      fireEvent.keyDown(input, { key: "Enter" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.tags",
      target: { id: "a" },
      value: ["schema", "validation"],
    });
  });

  it("× removes a chip and commits the reduced array", async () => {
    const patchPlan = okPatch();
    render(
      <TagEditorCell
        workItemId="a"
        committedValue={["schema", "validation"]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      const removeBtn = screen.getByLabelText("Remove tag schema");
      fireEvent.click(removeBtn);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.tags",
      target: { id: "a" },
      value: ["validation"],
    });
  });

  it("Backspace on empty input removes trailing chip", async () => {
    const patchPlan = okPatch();
    render(
      <TagEditorCell
        workItemId="a"
        committedValue={["schema", "validation"]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const input = screen.getByTestId("tag-editor-input") as HTMLInputElement;

    await act(async () => {
      input.focus();
      fireEvent.keyDown(input, { key: "Backspace" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.tags",
      target: { id: "a" },
      value: ["schema"],
    });
  });

  it("invalid tag input shows error and does not commit", async () => {
    const patchPlan = vi.fn();
    render(
      <TagEditorCell
        workItemId="a"
        committedValue={["schema"]}
        baseRevision={1}
        patchPlan={patchPlan as PatchPlanFn}
      />,
    );

    const input = screen.getByTestId("tag-editor-input") as HTMLInputElement;

    await act(async () => {
      input.focus();
      fireEvent.change(input, { target: { value: "INVALID TAG!" } });
      fireEvent.keyDown(input, { key: "Enter" });
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("tag-editor-error")).toBeTruthy();
    expect(input.value).toBe("INVALID TAG!");
  });
});
