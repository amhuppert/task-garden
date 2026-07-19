// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "../ui/Toast";
import { installRadixDomShims } from "../ui/test/radix-dom-shims";
import { ValidationToast } from "./ValidationToast";
import { useEditStore } from "./edit.store";
import { resolveValidationCopy } from "./validation-copy";

installRadixDomShims();

function reset() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
  });
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ValidationToast must render inside ToastViewport (mounted once in
// PlanWorkspacePage); this test renders the component standalone, so it
// provides its own viewport.
function renderToast() {
  return render(
    <ToastViewport>
      <ValidationToast />
    </ToastViewport>,
  );
}

describe("ValidationToast", () => {
  it("renders no toast when phase is idle", () => {
    renderToast();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders no toast when error is non-validation (network)", () => {
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("network"),
        canRetry: true,
      },
    });
    renderToast();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders title, detail, and mono kicker code for a validation error", () => {
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("cycle_detected"),
        canRetry: false,
      },
    });
    renderToast();
    expect(screen.getByText(/would create a cycle/i)).toBeTruthy();
    expect(
      screen.getByText(/adding this dependency closes a loop/i),
    ).toBeTruthy();
    expect(screen.getByText(/cycle_detected/i)).toBeTruthy();
  });

  it("dismisses on close button click and calls resetErrorFor", async () => {
    const user = userEvent.setup();
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("cycle_detected"),
        canRetry: false,
      },
    });
    renderToast();
    await user.click(
      screen.getByRole("button", { name: /close notification/i }),
    );
    expect(useEditStore.getState().lastWriteResult.phase).toBe("idle");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("auto-dismisses after 6 seconds", () => {
    vi.useFakeTimers();
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("cycle_detected"),
        canRetry: false,
      },
    });
    renderToast();
    expect(screen.getByText(/would create a cycle/i)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(useEditStore.getState().lastWriteResult.phase).toBe("error");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(useEditStore.getState().lastWriteResult.phase).toBe("idle");
  });
});
