// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogClose } from "./Dialog";

afterEach(() => {
  cleanup();
});

function renderTriggered(props?: { description?: string }) {
  return render(
    <Dialog
      trigger={<button type="button">Open help</button>}
      title="Plan help"
      description={props?.description}
    >
      <p>Body copy</p>
      <button type="button">Body action</button>
    </Dialog>,
  );
}

/** Radix arms its outside-press listeners on a timeout after open. */
async function outsideListenersArmed() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function ControlledHarness({
  disableOutsideClose,
}: {
  disableOutsideClose?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      title="New work item"
      open={open}
      onOpenChange={setOpen}
      disableOutsideClose={disableOutsideClose}
      width="lg"
    >
      <p>Form body</p>
    </Dialog>
  );
}

function TriggerlessHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Invoke
      </button>
      <Dialog title="Triggerless" open={open} onOpenChange={setOpen} width="lg">
        <p>Form body</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("returns focus to the invoking element on close when fully controlled with no trigger", async () => {
    const user = userEvent.setup();
    render(<TriggerlessHarness />);
    const invoker = screen.getByRole("button", { name: "Invoke" });

    await user.click(invoker);
    const dialog = screen.getByRole("dialog", { name: "Triggerless" });
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    // Without a Radix Trigger there is no triggerRef; the primitive must
    // restore the element that was focused when `open` flipped true instead
    // of dropping focus to <body>.
    await waitFor(() => expect(document.activeElement).toBe(invoker));
  });

  it("stays closed until the trigger is activated, then opens a modal dialog named by its title", async () => {
    const user = userEvent.setup();
    renderTriggered();

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open help" }));

    const dialog = screen.getByRole("dialog", { name: "Plan help" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    // Title is always visible, not just an aria-label.
    expect(screen.getByText("Plan help")).toBeTruthy();
    expect(screen.getByText("Body copy")).toBeTruthy();
  });

  it("omits aria-describedby when no description is given", async () => {
    const user = userEvent.setup();
    renderTriggered();

    await user.click(screen.getByRole("button", { name: "Open help" }));

    expect(
      screen.getByRole("dialog").getAttribute("aria-describedby"),
    ).toBeNull();
  });

  it("wires aria-describedby to the visible description when given", async () => {
    const user = userEvent.setup();
    renderTriggered({ description: "Explains the plan sections." });

    await user.click(screen.getByRole("button", { name: "Open help" }));

    const dialog = screen.getByRole("dialog");
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy ?? "");
    expect(description?.textContent).toBe("Explains the plan sections.");
  });

  it("moves focus into the dialog on open and returns it to the trigger on Escape close", async () => {
    const user = userEvent.setup();
    renderTriggered();
    const trigger = screen.getByRole("button", { name: "Open help" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    // Focus return is deferred a tick by the focus scope.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("traps focus: Tab from the last tabbable wraps to the first, Shift+Tab wraps back", async () => {
    const user = userEvent.setup();
    renderTriggered();

    await user.click(screen.getByRole("button", { name: "Open help" }));
    const closeButton = screen.getByRole("button", { name: "Close" });
    const bodyAction = screen.getByRole("button", { name: "Body action" });

    bodyAction.focus();
    fireEvent.keyDown(bodyAction, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(bodyAction);
  });

  it("closes via its built-in Close button", async () => {
    const user = userEvent.setup();
    renderTriggered();

    await user.click(screen.getByRole("button", { name: "Open help" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on outside pointer down by default", async () => {
    render(<ControlledHarness />);
    expect(screen.getByRole("dialog", { name: "New work item" })).toBeTruthy();
    await outsideListenersArmed();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("disableOutsideClose keeps the dialog open on outside press while Escape still closes", async () => {
    render(<ControlledHarness disableOutsideClose />);
    const dialog = screen.getByRole("dialog", { name: "New work item" });
    await outsideListenersArmed();

    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("in controlled mode reports state through onOpenChange instead of closing itself", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog title="Controlled" open onOpenChange={onOpenChange}>
        <p>Body</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Controlled" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Parent ignored the request, so the controlled dialog stays open.
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("DialogClose closes the dialog through a bespoke button that keeps its own name", async () => {
    const user = userEvent.setup();
    render(
      <Dialog
        trigger={<button type="button">Open form</button>}
        title="New work item"
        width="lg"
      >
        <DialogClose>
          <button type="button">Cancel</button>
        </DialogClose>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Open form" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
