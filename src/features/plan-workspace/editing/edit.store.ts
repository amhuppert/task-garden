import { create } from "zustand";
import type { EditApiResult } from "../../../lib/plan/edit-api-client";
import { type ValidationCopy, resolveValidationCopy } from "./validation-copy";

export type DraftKey = string;

export type LastWriteResult =
  | { phase: "idle" }
  | { phase: "saving"; key: DraftKey; operationId: string }
  | { phase: "saved"; key: DraftKey; at: number }
  | {
      phase: "error";
      key: DraftKey;
      copy: ValidationCopy;
      canRetry: boolean;
    };

export interface SelfOpRecord {
  operationId: string;
  at: number;
}

export type RetryFn = () => Promise<void>;

export interface EditStateValue {
  drafts: Record<DraftKey, unknown>;
  inflight: Record<DraftKey, string>;
  lastWriteResult: LastWriteResult;
  recentSelfOps: SelfOpRecord[];
  retryFn: RetryFn | null;
}

interface EditActions {
  setDraft(key: DraftKey, value: unknown): void;
  clearDraft(key: DraftKey): void;
  rollbackAll(): void;
  beginCommit(key: DraftKey, operationId: string): void;
  finishCommit(key: DraftKey, result: EditApiResult): void;
  rememberSelfOp(operationId: string): void;
  hasSeenSelfOp(operationId: string): boolean;
  resetErrorFor(key: DraftKey): void;
  registerRetry(fn: RetryFn): void;
  clearRetry(): void;
  retry(): Promise<void>;
}

type EditStore = EditStateValue & EditActions;

const SELF_OP_RING_SIZE = 16;

const defaultState: EditStateValue = {
  drafts: {},
  inflight: {},
  lastWriteResult: { phase: "idle" },
  recentSelfOps: [],
  retryFn: null,
};

function omitKey<V>(record: Record<string, V>, key: string): Record<string, V> {
  if (!(key in record)) return record;
  const { [key]: _omit, ...rest } = record;
  return rest;
}

function copyForErrorResult(
  result: Extract<EditApiResult, { ok: false }>,
): ValidationCopy {
  switch (result.error) {
    case "validation_failed": {
      const firstIssue = result.issues[0];
      return resolveValidationCopy(firstIssue?.code);
    }
    case "yaml_parse":
      return resolveValidationCopy("yaml_parse");
    case "target_not_found":
      return resolveValidationCopy("target_not_found");
    case "stale_revision":
      return resolveValidationCopy("write_failed");
    case "network":
      return resolveValidationCopy("network");
    case "write_failed":
      return resolveValidationCopy("write_failed");
    case "invalid_patch":
    case "missing_operation_id":
    case "method_not_allowed":
      return resolveValidationCopy(undefined);
  }
}

function canRetryError(result: Extract<EditApiResult, { ok: false }>): boolean {
  switch (result.error) {
    case "network":
    case "stale_revision":
    case "write_failed":
      return true;
    default:
      return false;
  }
}

export const useEditStore = create<EditStore>((set, get) => ({
  ...defaultState,

  setDraft(key, value) {
    set((s) => ({ drafts: { ...s.drafts, [key]: value } }));
  },

  clearDraft(key) {
    set((s) => ({ drafts: omitKey(s.drafts, key) }));
  },

  rollbackAll() {
    set((s) => {
      const inflightKeys = Object.keys(s.inflight);
      const clearingError = s.lastWriteResult.phase === "error";
      if (inflightKeys.length === 0) {
        return {
          drafts: {},
          lastWriteResult: clearingError
            ? { phase: "idle" }
            : s.lastWriteResult,
          retryFn: clearingError ? null : s.retryFn,
        };
      }
      const preservedDrafts: Record<DraftKey, unknown> = {};
      for (const key of inflightKeys) {
        if (key in s.drafts) preservedDrafts[key] = s.drafts[key];
      }
      return {
        drafts: preservedDrafts,
        lastWriteResult: clearingError ? { phase: "idle" } : s.lastWriteResult,
        retryFn: clearingError ? null : s.retryFn,
      };
    });
  },

  beginCommit(key, operationId) {
    set((s) => ({
      inflight: { ...s.inflight, [key]: operationId },
      lastWriteResult: { phase: "saving", key, operationId },
    }));
  },

  finishCommit(key, result) {
    set((s) => {
      const inflight = omitKey(s.inflight, key);
      if (result.ok) {
        return {
          inflight,
          drafts: omitKey(s.drafts, key),
          lastWriteResult: { phase: "saved", key, at: Date.now() },
          retryFn: null,
        };
      }
      const canRetry = canRetryError(result);
      return {
        inflight,
        lastWriteResult: {
          phase: "error",
          key,
          copy: copyForErrorResult(result),
          canRetry,
        },
        retryFn: canRetry ? s.retryFn : null,
      };
    });
  },

  rememberSelfOp(operationId) {
    set((s) => {
      const next = [...s.recentSelfOps, { operationId, at: Date.now() }];
      if (next.length > SELF_OP_RING_SIZE) {
        next.splice(0, next.length - SELF_OP_RING_SIZE);
      }
      return { recentSelfOps: next };
    });
  },

  hasSeenSelfOp(operationId) {
    return get().recentSelfOps.some((r) => r.operationId === operationId);
  },

  resetErrorFor(key) {
    set((s) => {
      if (s.lastWriteResult.phase !== "error") return {};
      if (s.lastWriteResult.key !== key) return {};
      return { lastWriteResult: { phase: "idle" }, retryFn: null };
    });
  },

  registerRetry(fn) {
    set({ retryFn: fn });
  },

  clearRetry() {
    set({ retryFn: null });
  },

  async retry() {
    const state = get();
    if (state.lastWriteResult.phase !== "error") return;
    if (!state.lastWriteResult.canRetry) return;
    const fn = state.retryFn;
    if (!fn) return;
    await fn();
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const useEditDraft = (key: DraftKey): unknown =>
  useEditStore((s) => s.drafts[key]);

export const useEditInflight = (key: DraftKey): string | undefined =>
  useEditStore((s) => s.inflight[key]);

export const useLastWriteResult = (): LastWriteResult =>
  useEditStore((s) => s.lastWriteResult);

export const useHasError = (key: DraftKey): boolean =>
  useEditStore(
    (s) => s.lastWriteResult.phase === "error" && s.lastWriteResult.key === key,
  );

export const useEditStorePendingRetry = (): RetryFn | null =>
  useEditStore((s) => s.retryFn);

export const useEditStoreRetry = (): (() => Promise<void>) =>
  useEditStore((s) => s.retry);
