import { useCallback, useRef } from "react";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import {
  type PatchPlanFn,
  patchPlan as defaultPatchPlan,
} from "../../../lib/plan/edit-api-client";
import {
  type DraftKey,
  useEditDraft,
  useEditStore,
  useLastWriteResult,
} from "./edit.store";

export interface UseFieldDraftOptions<T> {
  key: DraftKey;
  committedValue: T;
  buildPatch: (value: T) => PlanPatch;
  baseRevision?: number;
  patchPlan?: PatchPlanFn;
}

export interface UseFieldDraftReturn<T> {
  value: T;
  isDirty: boolean;
  setDraft: (next: T) => void;
  commit: () => Promise<void>;
  rollback: () => void;
  retry: () => Promise<void>;
}

function generateOperationId(): string {
  return crypto.randomUUID();
}

export function useFieldDraft<T>(
  opts: UseFieldDraftOptions<T>,
): UseFieldDraftReturn<T> {
  const { key, committedValue } = opts;

  const draftEntry = useEditDraft(key);
  const lastWriteResult = useLastWriteResult();

  const hasDraft = draftEntry !== undefined;
  const draftValue = hasDraft ? (draftEntry as T) : committedValue;
  const isDirty = hasDraft && !Object.is(draftValue, committedValue);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const setDraft = useCallback(
    (next: T) => {
      const store = useEditStore.getState();
      if (Object.is(next, optsRef.current.committedValue)) {
        store.clearDraft(key);
      } else {
        store.setDraft(key, next);
      }
    },
    [key],
  );

  const performCommit = useCallback(
    async (overrideBaseRevision?: number): Promise<void> => {
      const current = optsRef.current;
      const patchFn = current.patchPlan ?? defaultPatchPlan;
      const store = useEditStore.getState();
      const liveDraft = store.drafts[key];
      if (liveDraft === undefined) return;
      const valueToCommit = liveDraft as T;

      store.registerRetry(async () => {
        await performCommit();
      });

      const operationId = generateOperationId();
      store.beginCommit(key, operationId, valueToCommit);
      const patch = current.buildPatch(valueToCommit);
      let revisionForRequest = overrideBaseRevision ?? current.baseRevision;
      let result = await patchFn(patch, {
        operationId,
        baseRevision: revisionForRequest,
      });

      if (!result.ok && result.error === "stale_revision") {
        const retryOperationId = generateOperationId();
        revisionForRequest = result.currentRevision;
        result = await patchFn(patch, {
          operationId: retryOperationId,
          baseRevision: revisionForRequest,
        });
        if (result.ok) {
          useEditStore.getState().rememberSelfOp(retryOperationId);
          useEditStore.getState().finishCommit(key, result);
          return;
        }
      }

      if (result.ok) {
        useEditStore.getState().rememberSelfOp(operationId);
        useEditStore.getState().finishCommit(key, result);
        return;
      }

      const shouldRollback =
        result.error === "validation_failed" ||
        result.error === "yaml_parse" ||
        result.error === "target_not_found" ||
        result.error === "invalid_patch";

      if (shouldRollback) {
        // Roll back only the rejected value — a newer draft typed while the
        // request was in flight must survive.
        const latestDraft = useEditStore.getState().drafts[key];
        if (Object.is(latestDraft, valueToCommit)) {
          useEditStore.getState().clearDraft(key);
        }
      }
      useEditStore.getState().finishCommit(key, result);
    },
    [key],
  );

  const commit = useCallback(async (): Promise<void> => {
    const currentResult = useEditStore.getState().lastWriteResult;
    const store = useEditStore.getState();
    const hasLiveDraft = key in store.drafts;
    if (!hasLiveDraft && currentResult.phase !== "error") return;
    if (!hasLiveDraft) return;
    await performCommit();
  }, [key, performCommit]);

  const rollback = useCallback(() => {
    const store = useEditStore.getState();
    store.clearDraft(key);
    store.resetErrorFor(key);
  }, [key]);

  const retry = useCallback(async (): Promise<void> => {
    const store = useEditStore.getState();
    if (!(key in store.drafts)) return;
    await performCommit();
  }, [key, performCommit]);

  // Reference suppression — the hook intentionally uses the latest lastWriteResult
  // only to short-circuit commit; the subscription is still needed so callers
  // re-render when phase changes.
  void lastWriteResult;

  return {
    value: draftValue,
    isDirty,
    setDraft,
    commit,
    rollback,
    retry,
  };
}
