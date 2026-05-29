import { describe, expect, test, vi } from "vitest";
import { type EditRouteCtx, handleEditRequest } from "./edit-routes";
import { type AsyncMutex, createMutex } from "./mutex";
import { createPlanState } from "./plan-state";
import type { PlanWriter, PlanWriterResult } from "./plan-writer";
import type { PlanPatch } from "./shared/patch-schema";

const PLAN_ABS_PATH = "/tmp/edit-routes-test/plan.yaml";

const VALID_PATCH: PlanPatch = {
  kind: "plan.field",
  field: "title",
  value: "New Title",
};

function okWriter(nextSource = "next: source"): PlanWriter {
  return {
    apply: vi.fn(
      (_src: string, _patch: PlanPatch): PlanWriterResult => ({
        ok: true,
        nextSource,
      }),
    ),
  };
}

function failingWriter(failure: PlanWriterResult): PlanWriter {
  return {
    apply: vi.fn(
      (_src: string, _patch: PlanPatch): PlanWriterResult => failure,
    ),
  };
}

type CtxOverrides = Partial<EditRouteCtx>;

function makeCtx(overrides: CtxOverrides = {}): {
  ctx: EditRouteCtx;
  planState: ReturnType<typeof createPlanState>;
} {
  const planState = overrides.planState ?? createPlanState(PLAN_ABS_PATH);
  const sharedMutex: AsyncMutex = createMutex();
  let nowCounter = 0;
  const ctx: EditRouteCtx = {
    planAbsPath: overrides.planAbsPath ?? PLAN_ABS_PATH,
    planState,
    planWriter: overrides.planWriter ?? okWriter(),
    mutexFor: overrides.mutexFor ?? (() => sharedMutex),
    writeFile: overrides.writeFile ?? vi.fn(async () => undefined),
    readFile: overrides.readFile ?? vi.fn(async () => "version: 1\n"),
    rename: overrides.rename ?? vi.fn(async () => undefined),
    now: overrides.now ?? (() => ++nowCounter),
  };
  return { ctx, planState };
}

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/plan", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("handleEditRequest", () => {
  test("200 happy path: writes atomically, marks self write, returns revision", async () => {
    const writer = okWriter("written: yes");
    const writeFile = vi.fn(async () => undefined);
    const rename = vi.fn(async () => undefined);
    const { ctx, planState } = makeCtx({
      planWriter: writer,
      writeFile,
      rename,
      now: () => 1234,
    });
    planState.setSource("initial");
    const markSpy = vi.spyOn(planState, "markSelfWrite");
    const revBefore = planState.get().revision;

    const res = await handleEditRequest(
      patchReq({ operationId: "op-1", patch: VALID_PATCH }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/json/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = (await res.json()) as {
      ok: boolean;
      operationId: string;
      revision: number;
    };
    expect(body.ok).toBe(true);
    expect(body.operationId).toBe("op-1");
    expect(body.revision).toBe(revBefore + 1);

    expect(markSpy).toHaveBeenCalledTimes(1);
    expect(markSpy).toHaveBeenCalledWith("written: yes");

    expect(writeFile).toHaveBeenCalledTimes(1);
    const writeCall = writeFile.mock.calls[0] as unknown as [string, string];
    const tmpPath = writeCall[0];
    expect(tmpPath.startsWith(`${PLAN_ABS_PATH}.tmp-`)).toBe(true);
    expect(tmpPath).toContain("1234");
    expect(writeCall[1]).toBe("written: yes");

    expect(rename).toHaveBeenCalledWith(tmpPath, PLAN_ABS_PATH);
  });

  test("405 on GET", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/api/plan", { method: "GET" });
    const res = await handleEditRequest(req, ctx);
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({
      ok: false,
      error: "method_not_allowed",
    });
  });

  test("405 on POST/DELETE/PUT", async () => {
    for (const method of ["POST", "DELETE", "PUT"]) {
      const { ctx } = makeCtx();
      const req = new Request("http://localhost/api/plan", { method });
      const res = await handleEditRequest(req, ctx);
      expect(res.status).toBe(405);
      expect(await res.json()).toEqual({
        ok: false,
        error: "method_not_allowed",
      });
    }
  });

  test("400 missing_operation_id when operationId is absent", async () => {
    const { ctx } = makeCtx();
    const res = await handleEditRequest(patchReq({ patch: VALID_PATCH }), ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_operation_id" });
  });

  test("400 missing_operation_id when operationId is empty string", async () => {
    const { ctx } = makeCtx();
    const res = await handleEditRequest(
      patchReq({ operationId: "", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_operation_id" });
  });

  test("400 missing_operation_id when operationId is longer than 64 chars", async () => {
    const { ctx } = makeCtx();
    const res = await handleEditRequest(
      patchReq({ operationId: "x".repeat(65), patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_operation_id" });
  });

  test("400 missing_operation_id when operationId is not a string", async () => {
    const { ctx } = makeCtx();
    const res = await handleEditRequest(
      patchReq({ operationId: 42, patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_operation_id" });
  });

  test("400 invalid_patch echoes zodIssues when patch fails schema", async () => {
    const { ctx } = makeCtx();
    const res = await handleEditRequest(
      patchReq({
        operationId: "op-x",
        patch: { kind: "not_a_real_kind" },
      }),
      ctx,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      zodIssues: unknown[];
      operationId: string;
    };
    expect(body.error).toBe("invalid_patch");
    expect(Array.isArray(body.zodIssues)).toBe(true);
    expect(body.zodIssues.length).toBeGreaterThan(0);
    expect(body.operationId).toBe("op-x");
  });

  test("409 stale_revision with currentRevision when baseRevision < current", async () => {
    const { ctx, planState } = makeCtx();
    planState.setSource("a");
    planState.setSource("b");
    const currentRevision = planState.get().revision;
    expect(currentRevision).toBeGreaterThan(0);

    const res = await handleEditRequest(
      patchReq({
        operationId: "op-stale",
        baseRevision: currentRevision - 1,
        patch: VALID_PATCH,
      }),
      ctx,
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "stale_revision",
      currentRevision,
      operationId: "op-stale",
    });
  });

  test("baseRevision === currentRevision is not stale", async () => {
    const { ctx, planState } = makeCtx();
    planState.setSource("a");
    const currentRevision = planState.get().revision;

    const res = await handleEditRequest(
      patchReq({
        operationId: "op-eq",
        baseRevision: currentRevision,
        patch: VALID_PATCH,
      }),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  test("422 yaml_parse when planWriter returns yaml_parse failure", async () => {
    const writer = failingWriter({
      ok: false,
      failure: { type: "yaml_parse", message: "bad yaml" },
    });
    const { ctx } = makeCtx({ planWriter: writer });
    const res = await handleEditRequest(
      patchReq({ operationId: "op-y", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "yaml_parse",
      message: "bad yaml",
      operationId: "op-y",
    });
  });

  test("422 validation_failed when planWriter returns validation failure", async () => {
    const issues = [
      {
        path: ["work_items", 0, "depends_on", 0],
        code: "self_dependency",
        message: "boom",
      },
    ];
    const writer = failingWriter({
      ok: false,
      failure: { type: "validation", issues },
    });
    const { ctx } = makeCtx({ planWriter: writer });
    const res = await handleEditRequest(
      patchReq({ operationId: "op-v", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual({
      error: "validation_failed",
      issues,
      operationId: "op-v",
    });
  });

  test("422 target_not_found when planWriter returns target_not_found failure", async () => {
    const target = { kind: "work_item", id: "ghost" };
    const writer = failingWriter({
      ok: false,
      failure: { type: "target_not_found", target },
    });
    const { ctx } = makeCtx({ planWriter: writer });
    const res = await handleEditRequest(
      patchReq({ operationId: "op-t", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "target_not_found",
      target,
      operationId: "op-t",
    });
  });

  test("400 invalid_patch when planWriter returns invalid_patch failure (defensive)", async () => {
    const writer = failingWriter({
      ok: false,
      failure: { type: "invalid_patch", message: "weird internal state" },
    });
    const { ctx } = makeCtx({ planWriter: writer });
    const res = await handleEditRequest(
      patchReq({ operationId: "op-ip", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "invalid_patch",
      message: "weird internal state",
      operationId: "op-ip",
    });
  });

  test("500 write_failed when writeFile rejects", async () => {
    const writeFile = vi.fn(async () => {
      throw new Error("disk full");
    });
    const { ctx } = makeCtx({ writeFile });
    const res = await handleEditRequest(
      patchReq({ operationId: "op-w", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "write_failed",
      message: "disk full",
      operationId: "op-w",
    });
  });

  test("500 write_failed when rename rejects", async () => {
    const rename = vi.fn(async () => {
      throw new Error("rename failed");
    });
    const { ctx } = makeCtx({ rename });
    const res = await handleEditRequest(
      patchReq({ operationId: "op-r", patch: VALID_PATCH }),
      ctx,
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "write_failed",
      message: "rename failed",
      operationId: "op-r",
    });
  });

  test("reads currentSource from disk (not planState) before applying patch", async () => {
    const readFile = vi.fn(async () => "disk: contents");
    const writer = {
      apply: vi.fn(
        (src: string, _patch: PlanPatch): PlanWriterResult => ({
          ok: true,
          nextSource: `from-disk:${src}`,
        }),
      ),
    };
    const { ctx, planState } = makeCtx({ readFile, planWriter: writer });
    planState.setSource("stale: state");

    const res = await handleEditRequest(
      patchReq({ operationId: "op-read", patch: VALID_PATCH }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(readFile).toHaveBeenCalledWith(PLAN_ABS_PATH);
    expect(writer.apply).toHaveBeenCalledWith("disk: contents", VALID_PATCH);
  });

  test("mutex serializes simultaneous PATCHes and tmp filenames do not collide", async () => {
    const sharedMutex = createMutex();
    let inFlight = 0;
    let maxInFlight = 0;
    const writes: string[] = [];
    let nowCounter = 1000;

    const writeFile = vi.fn(async (path: string) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      writes.push(path);
      await new Promise<void>((r) => setTimeout(r, 10));
      inFlight--;
    });

    const writer = okWriter("next");
    const { ctx } = makeCtx({
      planWriter: writer,
      writeFile,
      mutexFor: () => sharedMutex,
      now: () => ++nowCounter,
    });

    const p1 = handleEditRequest(
      patchReq({ operationId: "op-a", patch: VALID_PATCH }),
      ctx,
    );
    const p2 = handleEditRequest(
      patchReq({ operationId: "op-b", patch: VALID_PATCH }),
      ctx,
    );

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(maxInFlight).toBe(1);
    expect(writes.length).toBe(2);
    expect(writes[0]).not.toBe(writes[1]);
  });
});
