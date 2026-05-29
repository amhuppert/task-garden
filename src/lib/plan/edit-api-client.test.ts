import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlanPatch } from "../../../cli/shared/patch-schema";
import { patchPlan } from "./edit-api-client";

const samplePatch: PlanPatch = {
  kind: "work_item.field",
  target: { id: "work-1" },
  field: "title",
  value: "New title",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("patchPlan", () => {
  it("POSTs PATCH /api/plan with operationId, baseRevision, and patch in JSON body", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, operationId: "op-1", revision: 7 }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    await patchPlan(samplePatch, { operationId: "op-1", baseRevision: 6 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/plan");
    expect(init?.method).toBe("PATCH");
    const headers = init?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      operationId: "op-1",
      baseRevision: 6,
      patch: samplePatch,
    });
  });

  it("forwards an AbortSignal when provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, operationId: "op-1", revision: 1 }),
          { status: 200 },
        ),
      );
    const controller = new AbortController();

    await patchPlan(samplePatch, {
      operationId: "op-1",
      signal: controller.signal,
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });

  it("parses a 200 success response into EditApiSuccess", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, operationId: "op-1", revision: 12 }),
        { status: 200 },
      ),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({ ok: true, operationId: "op-1", revision: 12 });
  });

  it("maps 409 stale_revision to EditApiError with currentRevision", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "stale_revision",
          currentRevision: 9,
          operationId: "op-1",
        }),
        { status: 409 },
      ),
    );

    const result = await patchPlan(samplePatch, {
      operationId: "op-1",
      baseRevision: 8,
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "stale_revision",
      currentRevision: 9,
      operationId: "op-1",
    });
  });

  it("maps 422 validation_failed to EditApiError with issues", async () => {
    const issues = [
      { path: ["work_items"], code: "cycle_detected", message: "Cycle" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "validation_failed",
          issues,
          operationId: "op-1",
        }),
        { status: 422 },
      ),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: "validation_failed",
      issues,
      operationId: "op-1",
    });
  });

  it("maps 422 yaml_parse to EditApiError with message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "yaml_parse",
          message: "bad yaml",
          operationId: "op-1",
        }),
        { status: 422 },
      ),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: "yaml_parse",
      message: "bad yaml",
      operationId: "op-1",
    });
  });

  it("maps 422 target_not_found to EditApiError with target", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "target_not_found",
          target: { id: "missing" },
          operationId: "op-1",
        }),
        { status: 422 },
      ),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({
      ok: false,
      status: 422,
      error: "target_not_found",
      target: { id: "missing" },
      operationId: "op-1",
    });
  });

  it("maps 400 invalid_patch to EditApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_patch",
          zodIssues: [{ path: ["kind"], message: "bad" }],
          operationId: "op-1",
        }),
        { status: 400 },
      ),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "invalid_patch",
      zodIssues: [{ path: ["kind"], message: "bad" }],
      operationId: "op-1",
    });
  });

  it("maps 400 missing_operation_id to EditApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "missing_operation_id" }), {
        status: 400,
      }),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "missing_operation_id",
    });
  });

  it("maps 405 method_not_allowed to EditApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
        status: 405,
      }),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toMatchObject({
      ok: false,
      status: 405,
      error: "method_not_allowed",
    });
  });

  it("maps 500 write_failed to EditApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "write_failed",
          message: "disk full",
          operationId: "op-1",
        }),
        { status: 500 },
      ),
    );

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "write_failed",
      message: "disk full",
      operationId: "op-1",
    });
  });

  it("returns a network error when fetch rejects, without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));

    const result = await patchPlan(samplePatch, { operationId: "op-1" });

    expect(result).toEqual({
      ok: false,
      status: 0,
      error: "network",
      message: "offline",
      operationId: "op-1",
    });
  });
});
