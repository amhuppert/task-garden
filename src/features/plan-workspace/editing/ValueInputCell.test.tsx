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
import { ValueInputCell } from "./ValueInputCell";
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

describe("ValueInputCell", () => {
  it("renders the current value", () => {
    render(
      <ValueInputCell workItemId="a" committedValue={60} baseRevision={1} />,
    );

    expect((screen.getByTestId("value-input") as HTMLInputElement).value).toBe(
      "60",
    );
  });

  it("commits a numeric value patch on blur", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    render(
      <ValueInputCell
        workItemId="a"
        committedValue={60}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const input = screen.getByTestId("value-input") as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: "85" } });
      fireEvent.blur(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.value",
      target: { id: "a" },
      value: 85,
    });
  });
});
