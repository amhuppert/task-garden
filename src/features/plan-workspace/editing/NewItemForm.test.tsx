// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EditApiResult,
  PatchPlanFn,
} from "../../../lib/plan/edit-api-client";
import type { TaskGardenLane } from "../../../lib/plan/task-garden-plan.schema";
import { usePlanExplorerStore } from "../plan-explorer.store";
import { NewItemForm } from "./NewItemForm";

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

function fillRequiredFields() {
  fireEvent.change(screen.getByTestId("nif-id"), {
    target: { value: "ship-it" },
  });
  fireEvent.change(screen.getByTestId("nif-title"), {
    target: { value: "Ship the thing" },
  });
  fireEvent.change(screen.getByTestId("nif-summary"), {
    target: { value: "Tighten the bolts." },
  });
}

/** Radix arms its outside-press listeners on a timeout after open. */
async function outsideListenersArmed() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function resetExplorer() {
  usePlanExplorerStore.setState({ selectedWorkItemId: null });
}

beforeEach(resetExplorer);
afterEach(cleanup);

describe("NewItemForm", () => {
  it("renders a modal dialog whose visible title names it", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "New work item" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("New work item")).toBeTruthy();
  });

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

  it("announces the unresolved-fields hint through a status live region", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    const hint = screen.getByTestId("nif-validity");
    const region = hint.closest('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });

  it("associates field errors with their inputs via aria-describedby and aria-invalid", () => {
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    const idInput = screen.getByTestId("nif-id");
    // Errors only surface after the field is touched.
    expect(idInput.getAttribute("aria-invalid")).toBeNull();
    expect(idInput.getAttribute("aria-describedby")).toBeNull();

    fireEvent.blur(idInput);

    const error = screen.getByTestId("nif-id-error");
    expect(error.textContent).not.toBe("");
    expect(idInput.getAttribute("aria-invalid")).toBe("true");
    expect(idInput.getAttribute("aria-describedby")).toBe(error.id);

    // A valid entry clears the invalid state and the association.
    fireEvent.change(idInput, { target: { value: "ship-it" } });
    expect(idInput.getAttribute("aria-invalid")).toBeNull();
    expect(idInput.getAttribute("aria-describedby")).toBeNull();
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

    fillRequiredFields();

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

    fillRequiredFields();
    // fireEvent.change on the native lane <select> must keep working.
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

  it("marks the primary button busy while the create is in flight", async () => {
    let resolvePatch: (result: EditApiResult) => void = () => {};
    const patchPlan: PatchPlanFn = vi.fn(
      () =>
        new Promise<EditApiResult>((resolve) => {
          resolvePatch = resolve;
        }),
    );
    render(
      <NewItemForm
        open
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByTestId("create-bar-primary"));

    const primary = screen.getByTestId(
      "create-bar-primary",
    ) as HTMLButtonElement;
    expect(primary.getAttribute("aria-busy")).toBe("true");
    expect(primary.textContent).toBe("Saving…");
    expect(primary.disabled).toBe(true);

    await act(async () => {
      resolvePatch({ ok: true, operationId: "op-1", revision: 2 });
      await Promise.resolve();
    });
    expect(primary.getAttribute("aria-busy")).toBeNull();
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

    fillRequiredFields();

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

  it("does not close on outside pointer press", async () => {
    const onClose = vi.fn();
    render(
      <NewItemForm
        open
        onClose={onClose}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );
    await outsideListenersArmed();

    fireEvent.pointerDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "New work item" })).toBeTruthy();
  });

  it("requests close on Escape", () => {
    const onClose = vi.fn();
    render(
      <NewItemForm
        open
        onClose={onClose}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exposes a header close control whose accessible name matches its purpose", () => {
    const onClose = vi.fn();
    render(
      <NewItemForm
        open
        onClose={onClose}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("requests close via the Cancel secondary action", () => {
    const onClose = vi.fn();
    render(
      <NewItemForm
        open
        onClose={onClose}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );

    fireEvent.click(screen.getByTestId("create-bar-secondary"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when open is false", () => {
    render(
      <NewItemForm
        open={false}
        onClose={vi.fn()}
        lanes={LANES}
        baseRevision={1}
        patchPlan={okPatch()}
      />,
    );
    expect(screen.queryByTestId("new-item-form")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
