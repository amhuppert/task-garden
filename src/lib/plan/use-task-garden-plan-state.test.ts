// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanStateSnapshot } from "./plan-api-client";
import { useTaskGardenPlanState } from "./use-task-garden-plan-state";

type SubscribeFn = (
  onEvent: (snapshot: PlanStateSnapshot) => void,
  onReconnect: () => void,
) => () => void;

describe("useTaskGardenPlanState", () => {
  it("starts in loading phase and transitions to ready after the initial fetch", async () => {
    const snapshot: PlanStateSnapshot = {
      revision: 1,
      source: "yaml",
      sourceError: null,
      planFileName: "p.yaml",
    };
    const fetchPlanState = vi.fn().mockResolvedValue(snapshot);
    const subscribePlanState = vi.fn(() => () => {}) as SubscribeFn;

    const { result } = renderHook(() =>
      useTaskGardenPlanState({ fetchPlanState, subscribePlanState }),
    );

    expect(result.current).toEqual({ phase: "loading" });

    await waitFor(() => {
      expect(result.current).toEqual({ phase: "ready", snapshot });
    });
  });

  it("updates the snapshot on an SSE event with a higher revision", async () => {
    const initial: PlanStateSnapshot = {
      revision: 3,
      source: "yaml-v1",
      sourceError: null,
      planFileName: "p.yaml",
    };
    const newer: PlanStateSnapshot = {
      revision: 4,
      source: "yaml-v2",
      sourceError: null,
      planFileName: "p.yaml",
    };

    let emitEvent: (s: PlanStateSnapshot) => void = () => {};
    const fetchPlanState = vi.fn().mockResolvedValue(initial);
    const subscribePlanState: SubscribeFn = vi.fn((onEvent) => {
      emitEvent = onEvent;
      return () => {};
    });

    const { result } = renderHook(() =>
      useTaskGardenPlanState({ fetchPlanState, subscribePlanState }),
    );

    await waitFor(() => {
      if (result.current.phase !== "ready") {
        throw new Error("still loading");
      }
    });

    act(() => {
      emitEvent(newer);
    });

    expect(result.current).toEqual({ phase: "ready", snapshot: newer });
  });

  it("ignores SSE events whose revision is not greater than the last applied", async () => {
    const initial: PlanStateSnapshot = {
      revision: 5,
      source: "yaml-original",
      sourceError: null,
      planFileName: "p.yaml",
    };
    const duplicateRevision: PlanStateSnapshot = {
      revision: 5,
      source: "yaml-should-be-ignored",
      sourceError: null,
      planFileName: "p.yaml",
    };
    const olderRevision: PlanStateSnapshot = {
      revision: 4,
      source: "yaml-stale",
      sourceError: null,
      planFileName: "p.yaml",
    };

    let emitEvent: (s: PlanStateSnapshot) => void = () => {};
    const fetchPlanState = vi.fn().mockResolvedValue(initial);
    const subscribePlanState: SubscribeFn = vi.fn((onEvent) => {
      emitEvent = onEvent;
      return () => {};
    });

    const { result } = renderHook(() =>
      useTaskGardenPlanState({ fetchPlanState, subscribePlanState }),
    );

    await waitFor(() => {
      if (result.current.phase !== "ready") {
        throw new Error("still loading");
      }
    });

    act(() => {
      emitEvent(duplicateRevision);
    });
    expect(result.current).toEqual({ phase: "ready", snapshot: initial });

    act(() => {
      emitEvent(olderRevision);
    });
    expect(result.current).toEqual({ phase: "ready", snapshot: initial });
  });

  it("re-fetches and applies the new snapshot on reconnect", async () => {
    const initial: PlanStateSnapshot = {
      revision: 1,
      source: "yaml-v1",
      sourceError: null,
      planFileName: "p.yaml",
    };
    const afterReconnect: PlanStateSnapshot = {
      revision: 7,
      source: "yaml-after-reconnect",
      sourceError: null,
      planFileName: "p.yaml",
    };

    let triggerReconnect: () => void = () => {};
    const fetchPlanState = vi
      .fn()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(afterReconnect);
    const subscribePlanState: SubscribeFn = vi.fn((_onEvent, onReconnect) => {
      triggerReconnect = onReconnect;
      return () => {};
    });

    const { result } = renderHook(() =>
      useTaskGardenPlanState({ fetchPlanState, subscribePlanState }),
    );

    await waitFor(() => {
      if (result.current.phase !== "ready") {
        throw new Error("still loading");
      }
    });
    expect(fetchPlanState).toHaveBeenCalledTimes(1);

    act(() => {
      triggerReconnect();
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        phase: "ready",
        snapshot: afterReconnect,
      });
    });
    expect(fetchPlanState).toHaveBeenCalledTimes(2);
  });

  it("unsubscribes on unmount", async () => {
    const snapshot: PlanStateSnapshot = {
      revision: 1,
      source: "yaml",
      sourceError: null,
      planFileName: "p.yaml",
    };
    const unsubscribe = vi.fn();
    const fetchPlanState = vi.fn().mockResolvedValue(snapshot);
    const subscribePlanState: SubscribeFn = vi.fn(() => unsubscribe);

    const { unmount } = renderHook(() =>
      useTaskGardenPlanState({ fetchPlanState, subscribePlanState }),
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
