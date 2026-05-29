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
import { usePlanExplorerStore } from "../plan-explorer.store";
import { NewItemForm } from "./NewItemForm";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

const LANES: readonly TaskGardenLane[] = [
  { id: "backend", label: "Backend" },
  { id: "frontend", label: "Frontend" },
];

function okPatch(): PatchPlanFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    operationId: "op-1",
    revision: 2,
  });
}

function resetExplorer() {
  usePlanExplorerStore.setState({ selectedWorkItemId: null });
}

beforeEach(resetExplorer);
afterEach(cleanup);

describe("NewItemForm", () => {
  it("disables the primary button when the draft is invalid (empty id/title)", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    const primary = screen.getByTestId(
      "create-bar-primary",
    ) as HTMLButtonElement;
    expect(primary.disabled).toBe(true);
  });

  it("enables the primary button once required fields are filled", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    const idInput = screen.getByTestId("nif-id") as HTMLInputElement;
    const titleInput = screen.getByTestId("nif-title") as HTMLInputElement;
    const summary = screen.getByTestId("nif-summary") as HTMLTextAreaElement;
    fireEvent.change(idInput, { target: { value: "ship-it" } });
    fireEvent.change(titleInput, { target: { value: "Ship the thing" } });
    fireEvent.change(summary, { target: { value: "Tighten the bolts." } });

    const primary = screen.getByTestId(
      "create-bar-primary",
    ) as HTMLButtonElement;
    expect(primary.disabled).toBe(false);
  });

  it("dispatches a work_item.create patch and selects the new item on success", async () => {
    const patchPlan = okPatch();
    const onClose = vi.fn();
    render(
      <NewItemForm
        open
        onClose={onClose}
        lanes={LANES}
        baseRevision={4}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.change(screen.getByTestId("nif-id"), {
      target: { value: "ship-it" },
    });
    fireEvent.change(screen.getByTestId("nif-title"), {
      target: { value: "Ship the thing" },
    });
    fireEvent.change(screen.getByTestId("nif-summary"), {
      target: { value: "Tighten the bolts." },
    });
    fireEvent.change(screen.getByTestId("nif-lane"), {
      target: { value: "frontend" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-bar-primary"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg, opts] = (patchPlan as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(patchArg).toMatchObject({
      kind: "work_item.create",
      value: {
        id: "ship-it",
        title: "Ship the thing",
        summary: "Tighten the bolts.",
        lane: "frontend",
      },
    });
    expect(opts.baseRevision).toBe(4);
    expect(typeof opts.operationId).toBe("string");
    expect(opts.operationId.length).toBeGreaterThan(0);

    expect(usePlanExplorerStore.getState().selectedWorkItemId).toBe("ship-it");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("populates the lane select from the prefill", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
        prefill={{ lane: "frontend" }}
      />,
    );

    const lane = screen.getByTestId("nif-lane") as HTMLSelectElement;
    expect(lane.value).toBe("frontend");
  });

  it("renders depends_on chips when prefill carries dependencies", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
        prefill={{ dependsOn: ["upstream-a", "upstream-b"] }}
      />,
    );

    const list = screen.getByTestId("nif-depends-on");
    expect(list.textContent).toContain("upstream-a");
    expect(list.textContent).toContain("upstream-b");
  });

  it("surfaces a validation_failed error message when the server rejects the create", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      error: "validation_failed",
      issues: [
        {
          code: "duplicate_id",
          path: ["work_items", 0, "id"],
          message: "duplicate",
        },
      ],
      operationId: "op-2",
    });
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.change(screen.getByTestId("nif-id"), {
      target: { value: "ship-it" },
    });
    fireEvent.change(screen.getByTestId("nif-title"), {
      target: { value: "Ship" },
    });
    fireEvent.change(screen.getByTestId("nif-summary"), {
      target: { value: "Tighten the bolts." },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-bar-primary"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("nif-error").textContent).toMatch(
      /shares that slug/i,
    );
    expect(usePlanExplorerStore.getState().selectedWorkItemId).toBeNull();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <NewItemForm
        open={false}
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );
    expect(container.querySelector('[data-testid="new-item-form"]')).toBeNull();
  });
});
