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
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import { LaneInlineEditor } from "./LaneInlineEditor";
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

const baseLane: TaskGardenLane = {
  id: "lane-1",
  label: "Backend",
  description: "Server-side work",
  color: "#aabbcc",
};

describe("LaneInlineEditor", () => {
  it("commits a label edit on blur", async () => {
    const patchPlan = okPatch();
    render(
      <LaneInlineEditor
        laneId="lane-1"
        committedLane={baseLane}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const input = screen.getByTestId("lane-label-input") as HTMLInputElement;
    await act(async () => {
      input.focus();
      fireEvent.change(input, { target: { value: "Backend Tier" } });
      input.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "lane.field",
      target: { id: "lane-1" },
      field: "label",
      value: "Backend Tier",
    });
  });

  it("sends null when description is cleared to empty", async () => {
    const patchPlan = okPatch();
    render(
      <LaneInlineEditor
        laneId="lane-1"
        committedLane={baseLane}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const input = screen.getByTestId(
      "lane-description-input",
    ) as HTMLInputElement;
    await act(async () => {
      input.focus();
      fireEvent.change(input, { target: { value: "" } });
      input.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "lane.field",
      target: { id: "lane-1" },
      field: "description",
      value: null,
    });
  });

  it("sends null when color is cleared to empty", async () => {
    const patchPlan = okPatch();
    render(
      <LaneInlineEditor
        laneId="lane-1"
        committedLane={baseLane}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const input = screen.getByTestId("lane-color-input") as HTMLInputElement;
    await act(async () => {
      input.focus();
      fireEvent.change(input, { target: { value: "" } });
      input.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "lane.field",
      target: { id: "lane-1" },
      field: "color",
      value: null,
    });
  });
});
