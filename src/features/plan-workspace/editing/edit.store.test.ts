import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditApiResult } from "../../../lib/plan/edit-api-client";
import { useEditStore } from "./edit.store";

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

describe("useEditStore", () => {
  describe("setDraft / clearDraft", () => {
    it("setDraft stores the value under the key", () => {
      useEditStore.getState().setDraft("work_item:a:title", "New title");
      expect(useEditStore.getState().drafts["work_item:a:title"]).toBe(
        "New title",
      );
    });

    it("clearDraft removes the key", () => {
      useEditStore.getState().setDraft("work_item:a:title", "x");
      useEditStore.getState().clearDraft("work_item:a:title");
      expect("work_item:a:title" in useEditStore.getState().drafts).toBe(false);
    });
  });

  describe("beginCommit / finishCommit", () => {
    it("beginCommit sets inflight and phase saving", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      const s = useEditStore.getState();
      expect(s.inflight.k).toBe("op-1");
      expect(s.lastWriteResult).toEqual({
        phase: "saving",
        key: "k",
        operationId: "op-1",
      });
    });

    it("finishCommit success clears inflight, clears draft, sets phase saved", () => {
      useEditStore.getState().setDraft("k", "x");
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: true,
        operationId: "op-1",
        revision: 2,
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      expect("k" in s.inflight).toBe(false);
      expect("k" in s.drafts).toBe(false);
      expect(s.lastWriteResult.phase).toBe("saved");
      if (s.lastWriteResult.phase === "saved") {
        expect(s.lastWriteResult.key).toBe("k");
        expect(typeof s.lastWriteResult.at).toBe("number");
      }
    });

    it("finishCommit validation error preserves draft, sets phase error, canRetry false", () => {
      useEditStore.getState().setDraft("k", "x");
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: false,
        status: 422,
        error: "validation_failed",
        issues: [
          {
            path: ["work_items"],
            code: "cycle_detected",
            message: "cycle",
          },
        ],
        operationId: "op-1",
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      expect("k" in s.inflight).toBe(false);
      expect(s.drafts.k).toBe("x");
      expect(s.lastWriteResult.phase).toBe("error");
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.key).toBe("k");
        expect(s.lastWriteResult.canRetry).toBe(false);
        expect(s.lastWriteResult.copy.code).toBe("cycle_detected");
      }
    });

    it("finishCommit network error canRetry true with network copy", () => {
      useEditStore.getState().setDraft("k", "x");
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      expect(s.drafts.k).toBe("x");
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.canRetry).toBe(true);
        expect(s.lastWriteResult.copy.code).toBe("network");
      } else {
        throw new Error("expected error phase");
      }
    });

    it("finishCommit stale_revision is retryable", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: false,
        status: 409,
        error: "stale_revision",
        currentRevision: 5,
        operationId: "op-1",
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.canRetry).toBe(true);
      } else {
        throw new Error("expected error phase");
      }
    });

    it("finishCommit write_failed is retryable", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: false,
        status: 500,
        error: "write_failed",
        message: "disk",
        operationId: "op-1",
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.canRetry).toBe(true);
      } else {
        throw new Error("expected error phase");
      }
    });

    it("finishCommit yaml_parse is not retryable", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: false,
        status: 422,
        error: "yaml_parse",
        message: "bad",
        operationId: "op-1",
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.canRetry).toBe(false);
      } else {
        throw new Error("expected error phase");
      }
    });

    it("finishCommit target_not_found is not retryable", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      const result: EditApiResult = {
        ok: false,
        status: 422,
        error: "target_not_found",
        target: { id: "x" },
        operationId: "op-1",
      };
      useEditStore.getState().finishCommit("k", result);
      const s = useEditStore.getState();
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.canRetry).toBe(false);
      } else {
        throw new Error("expected error phase");
      }
    });
  });

  describe("rememberSelfOp / hasSeenSelfOp", () => {
    it("rememberSelfOp appends and hasSeenSelfOp finds it", () => {
      useEditStore.getState().rememberSelfOp("op-1");
      expect(useEditStore.getState().hasSeenSelfOp("op-1")).toBe(true);
      expect(useEditStore.getState().hasSeenSelfOp("other")).toBe(false);
    });

    it("rememberSelfOp ring buffer caps at 16, FIFO drops oldest", () => {
      for (let i = 0; i < 20; i++) {
        useEditStore.getState().rememberSelfOp(`op-${i}`);
      }
      const ops = useEditStore.getState().recentSelfOps;
      expect(ops).toHaveLength(16);
      expect(useEditStore.getState().hasSeenSelfOp("op-0")).toBe(false);
      expect(useEditStore.getState().hasSeenSelfOp("op-3")).toBe(false);
      expect(useEditStore.getState().hasSeenSelfOp("op-4")).toBe(true);
      expect(useEditStore.getState().hasSeenSelfOp("op-19")).toBe(true);
    });
  });

  describe("resetErrorFor", () => {
    it("resetErrorFor clears error phase for matching key", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 422,
        error: "validation_failed",
        issues: [],
        operationId: "op-1",
      });
      useEditStore.getState().resetErrorFor("k");
      expect(useEditStore.getState().lastWriteResult).toEqual({
        phase: "idle",
      });
    });

    it("resetErrorFor leaves non-matching key untouched", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 422,
        error: "validation_failed",
        issues: [],
        operationId: "op-1",
      });
      useEditStore.getState().resetErrorFor("other");
      expect(useEditStore.getState().lastWriteResult.phase).toBe("error");
    });

    it("resetErrorFor is a no-op when not in error phase", () => {
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().resetErrorFor("k");
      expect(useEditStore.getState().lastWriteResult.phase).toBe("saving");
    });
  });

  describe("registerRetry / clearRetry / retry", () => {
    it("registerRetry stores the function under retryFn", () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      expect(useEditStore.getState().retryFn).toBe(fn);
    });

    it("clearRetry sets retryFn back to null", () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().clearRetry();
      expect(useEditStore.getState().retryFn).toBeNull();
    });

    it("retry is a no-op when phase is not error", async () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      await useEditStore.getState().retry();
      expect(fn).not.toHaveBeenCalled();
    });

    it("retry is a no-op when error is not retryable", async () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 422,
        error: "yaml_parse",
        message: "bad",
        operationId: "op-1",
      } satisfies EditApiResult);
      await useEditStore.getState().retry();
      expect(fn).not.toHaveBeenCalled();
    });

    it("retry is a no-op when no retry function is registered", async () => {
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      } satisfies EditApiResult);
      await expect(useEditStore.getState().retry()).resolves.toBeUndefined();
    });

    it("retry invokes the registered function when phase is retryable error", async () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      } satisfies EditApiResult);
      await useEditStore.getState().retry();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retryFn is preserved through a retryable error finishCommit", () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 500,
        error: "write_failed",
        message: "disk",
        operationId: "op-1",
      } satisfies EditApiResult);
      expect(useEditStore.getState().retryFn).toBe(fn);
    });

    it("retryFn is cleared by a non-retryable error finishCommit", () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 422,
        error: "validation_failed",
        issues: [],
        operationId: "op-1",
      } satisfies EditApiResult);
      expect(useEditStore.getState().retryFn).toBeNull();
    });

    it("retryFn is cleared by a successful finishCommit", () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: true,
        operationId: "op-1",
        revision: 2,
      } satisfies EditApiResult);
      expect(useEditStore.getState().retryFn).toBeNull();
    });

    it("resetErrorFor clears retryFn alongside the error phase", () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      } satisfies EditApiResult);
      useEditStore.getState().resetErrorFor("k");
      expect(useEditStore.getState().retryFn).toBeNull();
    });

    it("retry calling commit twice for a double-fail keeps canRetry/retryFn populated", async () => {
      let call = 0;
      const fn = vi.fn().mockImplementation(async () => {
        call += 1;
        useEditStore.getState().beginCommit("k", `op-r${call}`);
        useEditStore.getState().finishCommit("k", {
          ok: false,
          status: 0,
          error: "network",
          message: "offline",
          operationId: `op-r${call}`,
        } satisfies EditApiResult);
      });
      useEditStore.getState().registerRetry(fn);
      useEditStore.getState().beginCommit("k", "op-1");
      useEditStore.getState().finishCommit("k", {
        ok: false,
        status: 0,
        error: "network",
        message: "offline",
        operationId: "op-1",
      } satisfies EditApiResult);
      await useEditStore.getState().retry();
      await useEditStore.getState().retry();
      expect(fn).toHaveBeenCalledTimes(2);
      const s = useEditStore.getState();
      expect(s.lastWriteResult.phase).toBe("error");
      if (s.lastWriteResult.phase === "error") {
        expect(s.lastWriteResult.canRetry).toBe(true);
      }
    });
  });
});
