// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Popover } from "./Popover";
import { installRadixDomShims } from "./test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

function renderPopover(props?: Partial<Parameters<typeof Popover>[0]>) {
  return render(
    <Popover
      trigger={<button type="button">Open panel</button>}
      ariaLabel="Plan details"
      {...props}
    >
      <p>Panel body</p>
      <button type="button">Inside action</button>
    </Popover>,
  );
}

describe("Popover", () => {
  it("closed: renders only the trigger, marked as a collapsed dialog trigger", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Open panel" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Panel body")).toBeNull();
  });

  it("open: panel is a named non-modal dialog wired to the trigger", async () => {
    const user = userEvent.setup();
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Open panel" });
    await user.click(trigger);

    const panel = await screen.findByRole("dialog", { name: "Plan details" });
    expect(panel.textContent).toContain("Panel body");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    // Non-modal: the rest of the page is not aria-hidden
    expect(trigger.closest("[aria-hidden='true']")).toBeNull();
  });

  it("moves focus into the panel on open", async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole("button", { name: "Open panel" }));

    const panel = await screen.findByRole("dialog", { name: "Plan details" });
    await waitFor(() => {
      expect(panel.contains(document.activeElement)).toBe(true);
    });
  });

  it("Escape closes the panel and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Open panel" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Plan details" });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("light-dismisses on outside interaction", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <Popover
          trigger={<button type="button">Open panel</button>}
          ariaLabel="Plan details"
        >
          <p>Panel body</p>
        </Popover>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    await screen.findByRole("dialog", { name: "Plan details" });

    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    await user.click(elsewhere);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    // A pointer dismissal leaves focus where the user clicked — only
    // keyboard-driven closes return focus to the trigger.
    expect(document.activeElement).toBe(elsewhere);
  });

  it("returns focus to the trigger when focus moves out of the panel (tab-out close)", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Popover
          trigger={<button type="button">Open panel</button>}
          ariaLabel="Plan details"
        >
          <button type="button">Inside action</button>
        </Popover>
        <button type="button">After</button>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Open panel" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Plan details" });
    screen.getByRole("button", { name: "Inside action" }).focus();

    // Tabbing past the panel's last element lands outside the layer; the
    // portal sits at the end of <body>, so without an explicit focus return
    // the user would be stranded after the document.
    screen.getByRole("button", { name: "After" }).focus();

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("controlled mode: open follows the prop and dismissal reports through onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Popover
          trigger={<button type="button">Open panel</button>}
          ariaLabel="Plan details"
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        >
          <p>Panel body</p>
        </Popover>
      );
    }
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open panel" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await screen.findByRole("dialog", { name: "Plan details" });

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("keeps interactive content inside the panel usable", async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole("button", { name: "Open panel" }));
    await screen.findByRole("dialog", { name: "Plan details" });

    const inside = screen.getByRole("button", { name: "Inside action" });
    inside.focus();
    expect(document.activeElement).toBe(inside);
    // Interacting inside must not dismiss the panel
    await user.click(inside);
    expect(screen.getByRole("dialog", { name: "Plan details" })).toBeTruthy();
  });
});
