// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditStore } from "./edit.store";
import { EDITING_ROLLBACK_EVENT, useEditingHotkeys } from "./editing-keyboard";

beforeEach(() => {
  // Some tests focus an <input> to verify suppression; reset focus to body
  // before each test so subsequent tests don't inherit form-tag suppression.
  if (
    document.activeElement instanceof HTMLElement &&
    document.activeElement !== document.body
  ) {
    document.activeElement.blur();
  }
});

afterEach(cleanup);

function Harness(props: {
  openNewItemForm: (init?: { lane?: string; dependsOn?: string[] }) => void;
  selectedWorkItemId: string | null;
  activeLaneScope: string | null;
  firstLaneId: string | null;
  openDetailsAndFocusTitle?: () => void;
}) {
  useEditingHotkeys(props);
  return (
    <div>
      <input data-testid="text-input" />
      <div
        data-testid="content-editable"
        contentEditable
        suppressContentEditableWarning
      >
        editable
      </div>
      <textarea data-testid="textarea" />
      <button type="button" data-testid="button">
        regular
      </button>
    </div>
  );
}

describe("useEditingHotkeys", () => {
  it("'n' opens the new-item form with the first lane prefilled when no scope is active", () => {
    const openNewItemForm = vi.fn();
    render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );

    fireEvent.keyDown(document, { key: "n", code: "KeyN" });
    expect(openNewItemForm).toHaveBeenCalledWith({ lane: "backend" });
  });

  it("'n' uses activeLaneScope when one lane filter is active", () => {
    const openNewItemForm = vi.fn();
    render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId={null}
        activeLaneScope="frontend"
        firstLaneId="backend"
      />,
    );

    fireEvent.keyDown(document, { key: "n", code: "KeyN" });
    expect(openNewItemForm).toHaveBeenCalledWith({ lane: "frontend" });
  });

  it("'n' is suppressed while focus is inside an <input>", () => {
    const openNewItemForm = vi.fn();
    const { getByTestId } = render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );
    const input = getByTestId("text-input");
    input.focus();
    fireEvent.keyDown(input, { key: "n", code: "KeyN" });
    expect(openNewItemForm).not.toHaveBeenCalled();
  });

  it("'n' is suppressed while focus is inside a contentEditable", () => {
    const openNewItemForm = vi.fn();
    const { getByTestId } = render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );
    const editable = getByTestId("content-editable");
    editable.focus();
    fireEvent.keyDown(editable, { key: "n", code: "KeyN" });
    expect(openNewItemForm).not.toHaveBeenCalled();
  });

  it("'n' is suppressed while focus is inside a <textarea>", () => {
    const openNewItemForm = vi.fn();
    const { getByTestId } = render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );
    const textarea = getByTestId("textarea");
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "n", code: "KeyN" });
    expect(openNewItemForm).not.toHaveBeenCalled();
  });

  it("'shift+n' opens the form with depends_on prefilled from selection", () => {
    const openNewItemForm = vi.fn();
    render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId="wi-1"
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );

    fireEvent.keyDown(document, { key: "N", code: "KeyN", shiftKey: true });
    expect(openNewItemForm).toHaveBeenCalledWith({ dependsOn: ["wi-1"] });
  });

  it("'shift+n' is a no-op when nothing is selected", () => {
    const openNewItemForm = vi.fn();
    render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );

    fireEvent.keyDown(document, { key: "N", code: "KeyN", shiftKey: true });
    expect(openNewItemForm).not.toHaveBeenCalled();
  });

  it("'e' invokes the openDetailsAndFocusTitle callback when something is selected", () => {
    const openNewItemForm = vi.fn();
    const openDetails = vi.fn();
    render(
      <Harness
        openNewItemForm={openNewItemForm}
        selectedWorkItemId="wi-7"
        activeLaneScope={null}
        firstLaneId="backend"
        openDetailsAndFocusTitle={openDetails}
      />,
    );

    fireEvent.keyDown(document, { key: "e", code: "KeyE" });
    expect(openDetails).toHaveBeenCalledTimes(1);
  });

  it("'e' is suppressed while focus is inside an input", () => {
    const openDetails = vi.fn();
    const { getByTestId } = render(
      <Harness
        openNewItemForm={vi.fn()}
        selectedWorkItemId="wi-7"
        activeLaneScope={null}
        firstLaneId="backend"
        openDetailsAndFocusTitle={openDetails}
      />,
    );
    const input = getByTestId("text-input");
    input.focus();
    fireEvent.keyDown(input, { key: "e", code: "KeyE" });
    expect(openDetails).not.toHaveBeenCalled();
  });

  it("'escape' dispatches a rollback event on window", () => {
    render(
      <Harness
        openNewItemForm={vi.fn()}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );

    const handler = vi.fn();
    window.addEventListener(EDITING_ROLLBACK_EVENT, handler);
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(EDITING_ROLLBACK_EVENT, handler);
  });

  it("'escape' clears all uncommitted drafts in the edit store", () => {
    useEditStore.setState({
      drafts: { "wi-1:title": "uncommitted-1", "wi-2:status": "in_progress" },
      inflight: {},
      lastWriteResult: { phase: "idle" },
      recentSelfOps: [],
    });

    render(
      <Harness
        openNewItemForm={vi.fn()}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(useEditStore.getState().drafts).toEqual({});
  });

  it("'escape' preserves in-flight drafts so concurrent commits remain coherent", () => {
    useEditStore.setState({
      drafts: {
        "wi-1:title": "saving-value",
        "wi-2:status": "rollback-me",
      },
      inflight: { "wi-1:title": "op-pending" },
      lastWriteResult: {
        phase: "saving",
        key: "wi-1:title",
        operationId: "op-pending",
      },
      recentSelfOps: [],
    });

    render(
      <Harness
        openNewItemForm={vi.fn()}
        selectedWorkItemId={null}
        activeLaneScope={null}
        firstLaneId="backend"
      />,
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    const drafts = useEditStore.getState().drafts;
    expect(drafts["wi-1:title"]).toBe("saving-value");
    expect(drafts["wi-2:status"]).toBeUndefined();
  });
});
