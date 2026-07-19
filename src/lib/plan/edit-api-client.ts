import type { PlanPatch } from "../../../cli/shared/patch-schema";
import type { ValidationIssue } from "./task-garden-plan.schema";

export type EditApiSuccess = {
  ok: true;
  operationId: string;
  revision: number;
};

export type EditApiError =
  | {
      ok: false;
      status: 400;
      error: "missing_operation_id";
      operationId?: string;
    }
  | {
      ok: false;
      status: 400;
      error: "invalid_patch";
      zodIssues?: unknown;
      operationId: string;
    }
  | {
      ok: false;
      status: 405;
      error: "method_not_allowed";
      operationId?: string;
    }
  | {
      ok: false;
      status: 409;
      error: "stale_revision";
      currentRevision: number;
      operationId: string;
    }
  | {
      ok: false;
      status: 422;
      error: "validation_failed";
      issues: readonly ValidationIssue[];
      operationId: string;
    }
  | {
      ok: false;
      status: 422;
      error: "yaml_parse";
      message: string;
      operationId: string;
    }
  | {
      ok: false;
      status: 422;
      error: "target_not_found";
      target: unknown;
      operationId: string;
    }
  | {
      ok: false;
      status: 500;
      error: "write_failed";
      message: string;
      operationId: string;
    }
  | {
      ok: false;
      status: 0;
      error: "network";
      message: string;
      operationId: string;
    };

export type EditApiResult = EditApiSuccess | EditApiError;

export interface PatchPlanOptions {
  operationId: string;
  baseRevision?: number;
  signal?: AbortSignal;
}

// Signature of patchPlan, for components that accept an injectable override.
export type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

interface ApiErrorBody {
  error?: string;
  operationId?: string;
  message?: string;
  currentRevision?: number;
  issues?: readonly ValidationIssue[];
  target?: unknown;
  zodIssues?: unknown;
}

function buildError(
  status: number,
  body: ApiErrorBody,
  operationId: string,
): EditApiError {
  const opId = body.operationId ?? operationId;

  switch (body.error) {
    case "stale_revision":
      return {
        ok: false,
        status: 409,
        error: "stale_revision",
        currentRevision: body.currentRevision ?? 0,
        operationId: opId,
      };
    case "validation_failed":
      return {
        ok: false,
        status: 422,
        error: "validation_failed",
        issues: body.issues ?? [],
        operationId: opId,
      };
    case "yaml_parse":
      return {
        ok: false,
        status: 422,
        error: "yaml_parse",
        message: body.message ?? "",
        operationId: opId,
      };
    case "target_not_found":
      return {
        ok: false,
        status: 422,
        error: "target_not_found",
        target: body.target,
        operationId: opId,
      };
    case "invalid_patch":
      return {
        ok: false,
        status: 400,
        error: "invalid_patch",
        zodIssues: body.zodIssues,
        operationId: opId,
      };
    case "missing_operation_id":
      return {
        ok: false,
        status: 400,
        error: "missing_operation_id",
        operationId: opId,
      };
    case "method_not_allowed":
      return {
        ok: false,
        status: 405,
        error: "method_not_allowed",
        operationId: opId,
      };
    case "write_failed":
      return {
        ok: false,
        status: 500,
        error: "write_failed",
        message: body.message ?? "",
        operationId: opId,
      };
  }

  if (status === 405) {
    return {
      ok: false,
      status: 405,
      error: "method_not_allowed",
      operationId: opId,
    };
  }
  return {
    ok: false,
    status: 500,
    error: "write_failed",
    message: body.message ?? `Unexpected status ${status}`,
    operationId: opId,
  };
}

export async function patchPlan(
  patch: PlanPatch,
  opts: PatchPlanOptions,
): Promise<EditApiResult> {
  const { operationId, baseRevision, signal } = opts;
  const body = JSON.stringify({ operationId, baseRevision, patch });

  let res: Response;
  try {
    res = await fetch("/api/plan", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body,
      signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      error: "network",
      message,
      operationId,
    };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = {};
  }

  if (res.status === 200) {
    const data = parsed as { operationId?: string; revision?: number };
    return {
      ok: true,
      operationId: data.operationId ?? operationId,
      revision: data.revision ?? 0,
    };
  }

  return buildError(res.status, (parsed as ApiErrorBody) ?? {}, operationId);
}
