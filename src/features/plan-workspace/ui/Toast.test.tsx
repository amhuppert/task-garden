// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toast, ToastViewport } from "./Toast";
import { installRadixDomShims } from "./test/radix-dom-shims";

installRadixDomShims();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderToast(overrides?: {
  open?: boolean;
  duration?: number;
  description?: string;
}) {
  const onOpenChange = vi.fn();
  const utils = render(
    <ToastViewport>
      <Toast
        open={overrides?.open ?? true}
        onOpenChange={onOpenChange}
        title="Validation failed"
        description={overrides?.description ?? "Duplicate item id."}
        duration={overrides?.duration}
      />
    </ToastViewport>,
  );
  return { onOpenChange, ...utils };
}

function getRegion() {
  return screen.getByRole("region", { name: /notifications/i });
}

describe("ToastViewport", () => {
  it("exposes a labelled notifications region advertising the F8 hotkey", () => {
    renderToast();
    const region = getRegion();
    expect(region.getAttribute("aria-label")).toMatch(/F8/);
  });

  it("moves focus into the notifications region when F8 is pressed", () => {
    renderToast();
    fireEvent.keyDown(document, { code: "F8" });
    expect(getRegion().contains(document.activeElement)).toBe(true);
  });
});

describe("Toast", () => {
  it("renders title and description in an atomic status element inside the region", () => {
    renderToast();
    const region = getRegion();
    const toast = within(region).getByRole("status");
    expect(within(toast).getByText("Validation failed")).toBeTruthy();
    expect(within(toast).getByText("Duplicate item id.")).toBeTruthy();
    expect(toast.getAttribute("aria-atomic")).toBe("true");
    // Focusable so keyboard users can reach it from the viewport (F8).
    expect(toast.getAttribute("tabindex")).toBe("0");
  });

  it("renders no toast content when open is false", () => {
    renderToast({ open: false });
    expect(screen.queryByText("Validation failed")).toBeNull();
    expect(within(getRegion()).queryByRole("status")).toBeNull();
  });

  it("requests dismissal when the close button is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderToast();
    await user.click(
      screen.getByRole("button", { name: /close notification/i }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("requests dismissal on Escape", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderToast();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("returns focus to the viewport when Escape is pressed inside the toast", () => {
    const { onOpenChange } = renderToast();
    const close = screen.getByRole("button", { name: /close notification/i });
    act(() => close.focus());
    fireEvent.keyDown(close, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(getRegion().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(close);
  });

  it("auto-dismisses after the default 6000ms", () => {
    vi.useFakeTimers();
    const { onOpenChange } = renderToast();
    act(() => vi.advanceTimersByTime(5999));
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("respects a custom duration", () => {
    vi.useFakeTimers();
    const { onOpenChange } = renderToast({ duration: 100 });
    act(() => vi.advanceTimersByTime(100));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("pauses auto-dismiss while focus is inside the viewport and resumes on focus out", () => {
    vi.useFakeTimers();
    const { onOpenChange } = renderToast({ duration: 500 });
    const close = screen.getByRole("button", { name: /close notification/i });
    act(() => close.focus());
    act(() => vi.advanceTimersByTime(5000));
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => close.blur());
    act(() => vi.advanceTimersByTime(500));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
