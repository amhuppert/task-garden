// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
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
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FieldSaveIndicator", () => {
  it("renders nothing in idle phase for this key", () => {
    const { container } = render(<FieldSaveIndicator stateKey="k" />);
    expect(container.textContent).toBe("");
  });

  it("renders Saving when this key is in the saving phase", () => {
    useEditStore.setState({
      lastWriteResult: { phase: "saving", key: "k", operationId: "op-1" },
    });
    render(<FieldSaveIndicator stateKey="k" />);
    expect(screen.getByText(/saving/i)).toBeTruthy();
  });

  it("does not render Saving when a different key is in the saving phase", () => {
    useEditStore.setState({
      lastWriteResult: { phase: "saving", key: "other", operationId: "op-1" },
    });
    const { container } = render(<FieldSaveIndicator stateKey="k" />);
    expect(container.textContent).toBe("");
  });

  it("renders Saved when this key just saved, and auto-clears at 1.4s", () => {
    vi.useFakeTimers();
    useEditStore.setState({
      lastWriteResult: { phase: "saved", key: "k", at: Date.now() },
    });
    const { container } = render(<FieldSaveIndicator stateKey="k" />);
    expect(screen.getByText(/saved/i)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(container.textContent).toBe("");
  });
});
