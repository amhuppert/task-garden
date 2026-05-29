import type { AsyncMutex } from "./mutex";
import type { PlanState } from "./plan-state";
import type { PlanWriter } from "./plan-writer";
import { PlanPatchSchema } from "./shared/patch-schema";

export interface EditRouteCtx {
  planAbsPath: string;
  planState: PlanState;
  planWriter: PlanWriter;
  mutexFor: (planAbsPath: string) => AsyncMutex;
  writeFile: (path: string, data: string) => Promise<unknown>;
  readFile: (path: string) => Promise<string>;
  rename: (oldPath: string, newPath: string) => Promise<unknown>;
  now: () => number;
}

const SECURITY_HEADERS = { "x-content-type-options": "nosniff" } as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
    },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function handleEditRequest(
  req: Request,
  ctx: EditRouteCtx,
): Promise<Response> {
  if (req.method !== "PATCH") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonResponse({ error: "missing_operation_id" }, 400);
  }

  if (parsedBody == null || typeof parsedBody !== "object") {
    return jsonResponse({ error: "missing_operation_id" }, 400);
  }

  const body = parsedBody as {
    operationId?: unknown;
    baseRevision?: unknown;
    patch?: unknown;
  };

  if (
    typeof body.operationId !== "string" ||
    body.operationId.length === 0 ||
    body.operationId.length > 64
  ) {
    return jsonResponse({ error: "missing_operation_id" }, 400);
  }
  const operationId = body.operationId;

  const patchParse = PlanPatchSchema.safeParse(body.patch);
  if (!patchParse.success) {
    return jsonResponse(
      {
        error: "invalid_patch",
        zodIssues: patchParse.error.issues,
        operationId,
      },
      400,
    );
  }
  const patch = patchParse.data;

  const baseRevision =
    typeof body.baseRevision === "number" ? body.baseRevision : undefined;

  const mutex = ctx.mutexFor(ctx.planAbsPath);
  return mutex.runExclusive(async () => {
    const currentSource = await ctx.readFile(ctx.planAbsPath);

    if (
      baseRevision !== undefined &&
      baseRevision < ctx.planState.get().revision
    ) {
      return jsonResponse(
        {
          error: "stale_revision",
          currentRevision: ctx.planState.get().revision,
          operationId,
        },
        409,
      );
    }

    const result = ctx.planWriter.apply(currentSource, patch);
    if (!result.ok) {
      switch (result.failure.type) {
        case "yaml_parse":
          return jsonResponse(
            {
              error: "yaml_parse",
              message: result.failure.message,
              operationId,
            },
            422,
          );
        case "validation":
          return jsonResponse(
            {
              error: "validation_failed",
              issues: result.failure.issues,
              operationId,
            },
            422,
          );
        case "target_not_found":
          return jsonResponse(
            {
              error: "target_not_found",
              target: result.failure.target,
              operationId,
            },
            422,
          );
        case "invalid_patch":
          return jsonResponse(
            {
              error: "invalid_patch",
              message: result.failure.message,
              operationId,
            },
            400,
          );
      }
    }

    const tmp = `${ctx.planAbsPath}.tmp-${process.pid}-${ctx.now()}`;
    try {
      await ctx.writeFile(tmp, result.nextSource);
      await ctx.rename(tmp, ctx.planAbsPath);
    } catch (err) {
      return jsonResponse(
        {
          error: "write_failed",
          message: errorMessage(err),
          operationId,
        },
        500,
      );
    }

    ctx.planState.markSelfWrite(result.nextSource);

    return jsonResponse({
      ok: true,
      operationId,
      revision: ctx.planState.get().revision,
    });
  });
}
