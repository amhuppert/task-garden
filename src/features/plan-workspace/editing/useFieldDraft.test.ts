// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanFn,
} from "../../../lib/plan/edit-api-client";
import { useEditStore } from "./edit.store";
import { useFieldDraft } from "./useFieldDraft";

function reset() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
    retryFn: null,
  });
}

beforeEach(() => {
  reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makePatch(value: string | null): PlanPatch {
  return {
    kind: "work_item.field",
    target: { id: "a" },
    field: "title",
    value,
  };
}

describe("useFieldDraft", () => {
  it("returns committedValue when no draft is set, and isDirty=false", () => {
    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
      }),
    );
    expect(result.current.value).toBe("Old");
    expect(result.current.isDirty).toBe(false);
  });

  it("setDraft to a different value makes the hook dirty with the new value", () => {
    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });

    expect(result.current.value).toBe("New");
    expect(result.current.isDirty).toBe(true);
    expect(useEditStore.getState().drafts.k).toBe("New");
  });

  it("setDraft to the committedValue clears the draft (idempotent revert)", () => {
    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.setDraft("Old");
    });

    expect(result.current.isDirty).toBe(false);
    expect("k" in useEditStore.getState().drafts).toBe(false);
  });

  it("commit short-circuits when not dirty and no error phase", async () => {
    const patchPlan: PatchPlanFn = vi.fn();
    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        patchPlan,
      }),
    );

    await act(async () => {
      await result.current.commit();
    });

    expect(patchPlan).not.toHaveBeenCalled();
  });

  it("commit success calls patchPlan with the patch + operationId + baseRevision, clears draft, records self op", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: true,
      operationId: "op-1",
      revision: 2,
    });

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        baseRevision: 1,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg, optsArg] = (patchPlan as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(patchArg).toEqual(makePatch("New"));
    expect(optsArg.baseRevision).toBe(1);
    expect(typeof optsArg.operationId).toBe("string");
    expect(optsArg.operationId.length).toBeGreaterThan(0);
    expect("k" in useEditStore.getState().drafts).toBe(false);
    expect(useEditStore.getState().hasSeenSelfOp(optsArg.operationId)).toBe(
      true,
    );
    expect(useEditStore.getState().lastWriteResult.phase).toBe("saved");
  });

  it("commit 422 validation_failed rolls back draft, surfaces error with mapped copy", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      error: "validation_failed",
      issues: [
        { path: ["work_items"], code: "cycle_detected", message: "cycle" },
      ],
      operationId: "op-1",
    } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect("k" in useEditStore.getState().drafts).toBe(false);
    const lwr = useEditStore.getState().lastWriteResult;
    expect(lwr.phase).toBe("error");
    if (lwr.phase === "error") {
      expect(lwr.copy.code).toBe("cycle_detected");
      expect(lwr.canRetry).toBe(false);
    }
  });

  it("commit 409 stale_revision retries once and accepts the second response", async () => {
    const patchPlan: PatchPlanFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        error: "stale_revision",
        currentRevision: 5,
        operationId: "op-1",
      } satisfies EditApiResult)
      .mockResolvedValueOnce({
        ok: true,
        operationId: "op-2",
        revision: 5,
      } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        baseRevision: 3,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(patchPlan).toHaveBeenCalledTimes(2);
    const secondCallOpts = (patchPlan as ReturnType<typeof vi.fn>).mock
      .calls[1][1];
    expect(secondCallOpts.baseRevision).toBe(5);

    expect(useEditStore.getState().lastWriteResult.phase).toBe("saved");
    expect("k" in useEditStore.getState().drafts).toBe(false);
  });

  it("commit 409 still-stale on retry surfaces an error", async () => {
    const patchPlan: PatchPlanFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        error: "stale_revision",
        currentRevision: 5,
        operationId: "op-1",
      } satisfies EditApiResult)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        error: "stale_revision",
        currentRevision: 7,
        operationId: "op-2",
      } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        baseRevision: 3,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(patchPlan).toHaveBeenCalledTimes(2);
    const lwr = useEditStore.getState().lastWriteResult;
    expect(lwr.phase).toBe("error");
    if (lwr.phase === "error") {
      expect(lwr.canRetry).toBe(true);
    }
  });

  it("commit network error preserves the draft and surfaces canRetry: true", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 0,
      error: "network",
      message: "offline",
      operationId: "op-1",
    } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(useEditStore.getState().drafts.k).toBe("New");
    const lwr = useEditStore.getState().lastWriteResult;
    expect(lwr.phase).toBe("error");
    if (lwr.phase === "error") {
      expect(lwr.canRetry).toBe(true);
      expect(lwr.copy.code).toBe("network");
    }
  });

  it("rollback clears the draft and clears the error phase", async () => {
    const patchPlan: PatchPlanFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 0,
      error: "network",
      message: "offline",
      operationId: "op-1",
    } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });
    await act(async () => {
      await result.current.commit();
    });

    expect(useEditStore.getState().lastWriteResult.phase).toBe("error");
    expect(useEditStore.getState().drafts.k).toBe("New");

    act(() => {
      result.current.rollback();
    });

    expect("k" in useEditStore.getState().drafts).toBe(false);
    expect(useEditStore.getState().lastWriteResult.phase).toBe("idle");
  });

  it("commit registers a store-level retryFn that re-invokes the commit through editStore.retry()", async () => {
    const patchPlan: PatchPlanFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      } satisfies EditApiResult)
      .mockResolvedValueOnce({
        ok: true,
        operationId: "op-2",
        revision: 3,
      } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });
    await act(async () => {
      await result.current.commit();
    });

    expect(useEditStore.getState().retryFn).not.toBeNull();
    expect(useEditStore.getState().lastWriteResult.phase).toBe("error");

    await act(async () => {
      await useEditStore.getState().retry();
    });

    expect(patchPlan).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(useEditStore.getState().lastWriteResult.phase).toBe("saved");
    });
    expect(useEditStore.getState().retryFn).toBeNull();
  });

  it("retry re-invokes commit with the current draft value", async () => {
    const patchPlan: PatchPlanFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      } satisfies EditApiResult)
      .mockResolvedValueOnce({
        ok: true,
        operationId: "op-2",
        revision: 3,
      } satisfies EditApiResult);

    const { result } = renderHook(() =>
      useFieldDraft<string>({
        key: "k",
        committedValue: "Old",
        buildPatch: makePatch,
        patchPlan,
      }),
    );

    act(() => {
      result.current.setDraft("New");
    });
    await act(async () => {
      await result.current.commit();
    });
    await act(async () => {
      await result.current.retry();
    });

    expect(patchPlan).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(useEditStore.getState().lastWriteResult.phase).toBe("saved");
    });
  });
});
