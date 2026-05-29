// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WriteThroughStatusFooter } from "./WriteThroughStatusFooter";
import { useEditStore } from "./edit.store";
import { resolveValidationCopy } from "./validation-copy";

function reset() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
    retryFn: null,
  });
}

beforeEach(reset);
afterEach(cleanup);

describe("WriteThroughStatusFooter", () => {
  it("renders Synced in idle phase", () => {
    render(<WriteThroughStatusFooter />);
    expect(screen.getByText(/synced/i)).toBeTruthy();
  });

  it("renders Saving when phase is saving", () => {
    useEditStore.setState({
      lastWriteResult: { phase: "saving", key: "k", operationId: "op-1" },
    });
    render(<WriteThroughStatusFooter />);
    expect(screen.getByText(/saving/i)).toBeTruthy();
  });

  it("renders Saved when phase is saved", () => {
    useEditStore.setState({
      lastWriteResult: { phase: "saved", key: "k", at: Date.now() },
    });
    render(<WriteThroughStatusFooter />);
    expect(screen.getByText(/saved/i)).toBeTruthy();
  });

  it("renders the validation copy title when phase is error (validation)", () => {
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("cycle_detected"),
        canRetry: false,
      },
    });
    render(<WriteThroughStatusFooter />);
    expect(screen.getByText(/would create a cycle/i)).toBeTruthy();
  });

  it("renders CLI offline + Retry button when phase is error (network) and a retry is registered", () => {
    const retryFn = vi.fn().mockResolvedValue(undefined);
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("network"),
        canRetry: true,
      },
      retryFn,
    });
    render(<WriteThroughStatusFooter />);
    expect(screen.getByText(/cli offline/i)).toBeTruthy();
    const button = screen.getByRole("button", { name: /retry/i });
    expect(button).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(false);
    button.click();
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it("disables Retry when no retry function is registered in the store", () => {
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("network"),
        canRetry: true,
      },
      retryFn: null,
    });
    render(<WriteThroughStatusFooter />);
    const button = screen.getByRole("button", { name: /retry/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables Retry when canRetry is false even if a retry function is registered", () => {
    const retryFn = vi.fn().mockResolvedValue(undefined);
    useEditStore.setState({
      lastWriteResult: {
        phase: "error",
        key: "k",
        copy: resolveValidationCopy("network"),
        canRetry: false,
      },
      retryFn,
    });
    render(<WriteThroughStatusFooter />);
    const button = screen.getByRole("button", { name: /retry/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
