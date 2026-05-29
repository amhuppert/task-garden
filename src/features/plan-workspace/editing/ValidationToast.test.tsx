// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationToast } from "./ValidationToast";
import { useEditStore } from "./edit.store";
import { resolveValidationCopy } from "./validation-copy";

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

describe("ValidationToast", () => {
  it("renders nothing when phase is idle", () => {
    const { container } = render(<ValidationToast />);
    expect(container.textContent).toBe("");
  });

  it("renders nothing when error is non-validation (network)", () => {
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("network"),
        canRetry: true,
      },
    });
    const { container } = render(<ValidationToast />);
    expect(container.textContent).toBe("");
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
    render(<ValidationToast />);
    expect(screen.getByText(/would create a cycle/i)).toBeTruthy();
    expect(
      screen.getByText(/adding this dependency closes a loop/i),
    ).toBeTruthy();
    expect(screen.getByText(/cycle_detected/i)).toBeTruthy();
  });

  it("dismisses on close button click and calls resetErrorFor", () => {
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("cycle_detected"),
        canRetry: false,
      },
    });
    render(<ValidationToast />);
    const close = screen.getByRole("button", { name: /close/i });
    close.click();
    expect(useEditStore.getState().lastWriteResult.phase).toBe("idle");
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
    render(<ValidationToast />);
    expect(screen.getByText(/would create a cycle/i)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(useEditStore.getState().lastWriteResult.phase).toBe("idle");
  });
});
