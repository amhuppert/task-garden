import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMutex } from "./mutex";
import { createPlanState } from "./plan-state";
import type { PlanWriter, PlanWriterResult } from "./plan-writer";
import { type RouteCtx, handleRequest } from "./routes";
import type { PlanPatch } from "./shared/patch-schema";

let planDir = "";

beforeAll(() => {
  planDir = mkdtempSync(path.join(os.tmpdir(), "routes-"));
  writeFileSync(path.join(planDir, "doc.md"), "# A document\n", "utf8");
});
afterAll(() => {
  rmSync(planDir, { recursive: true, force: true });
});

function ctxFor(
  opts: {
    hostAllowList?: ReadonlySet<string>;
    planAbsPath?: string;
    planWriter?: PlanWriter;
    writeFile?: RouteCtx["writeFile"];
    readFile?: RouteCtx["readFile"];
    rename?: RouteCtx["rename"];
    now?: RouteCtx["now"];
  } = {},
): {
  ctx: RouteCtx;
  planState: ReturnType<typeof createPlanState>;
  trackedSubscriberCount: () => number;
} {
  const planAbsPath = opts.planAbsPath ?? path.join(planDir, "plan.yaml");
  const planState = createPlanState(planAbsPath);
  let subs = 0;
  const originalSubscribe = planState.subscribe.bind(planState);
  planState.subscribe = (fn) => {
    subs++;
    const u = originalSubscribe(fn);
    return () => {
      subs--;
      u();
    };
  };
  const sharedMutex = createMutex();
  const defaultWriter: PlanWriter = {
    apply: (_src: string, _patch: PlanPatch): PlanWriterResult => ({
      ok: true,
      nextSource: "next: source",
    }),
  };
  let nowCounter = 0;
  const ctx: RouteCtx = {
    planState,
    planDir,
    planAbsPath,
    staticAssetsRoot: "",
    hostAllowList:
      opts.hostAllowList ?? new Set(["localhost:4173", "127.0.0.1:4173"]),
    planWriter: opts.planWriter ?? defaultWriter,
    mutexFor: () => sharedMutex,
    writeFile: opts.writeFile ?? (async () => undefined),
    readFile: opts.readFile ?? (async () => "version: 1\n"),
    rename: opts.rename ?? (async () => undefined),
    now: opts.now ?? (() => ++nowCounter),
  };
  return { ctx, planState, trackedSubscriberCount: () => subs };
}

function reqWithHost(
  url: string,
  host = "localhost:4173",
  init: RequestInit = {},
): Request {
  return new Request(url, {
    ...init,
    headers: { host, ...(init.headers ?? {}) },
  });
}

describe("handleRequest", () => {
  it("returns 403 on bad Host header", async () => {
    const { ctx } = ctxFor();
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/api/plan", "evil.example.com"),
      ctx,
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "host_not_allowed" });
  });

  it("returns 200 JSON snapshot at /api/plan", async () => {
    const { ctx, planState } = ctxFor();
    planState.setSource("hello: world");
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/api/plan"),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/json/);
    const body = (await res.json()) as {
      source: string | null;
      sourceError: { message: string } | null;
      revision: number;
      planFileName: string;
    };
    expect(body.source).toBe("hello: world");
    expect(body.sourceError).toBeNull();
    expect(typeof body.revision).toBe("number");
    expect(typeof body.planFileName).toBe("string");
  });

  it("returns 200 markdown at /api/document?path=doc.md", async () => {
    const { ctx } = ctxFor();
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/api/document?path=doc.md"),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/text\/markdown/);
    expect(await res.text()).toContain("# A document");
  });

  it("returns 400 unsafe_path at /api/document with absolute path", async () => {
    const { ctx } = ctxFor();
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/api/document?path=%2Fetc%2Fpasswd"),
      ctx,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "unsafe_path" });
  });

  it("returns 404 document_not_found for missing doc", async () => {
    const { ctx } = ctxFor();
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/api/document?path=missing.md"),
      ctx,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "document_not_found" });
  });

  it("returns 400 when /api/document is missing path query", async () => {
    const { ctx } = ctxFor();
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/api/document"),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown path with no staticAssetsRoot", async () => {
    const { ctx } = ctxFor();
    const res = await handleRequest(
      reqWithHost("http://localhost:4173/whatever"),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("PATCH /api/plan dispatches to handleEditRequest and returns 200 with revision", async () => {
    const writeFile = vi.fn(async () => undefined);
    const rename = vi.fn(async () => undefined);
    const writer: PlanWriter = {
      apply: (_src, _patch): PlanWriterResult => ({
        ok: true,
        nextSource: "patched: yes",
      }),
    };
    const { ctx, planState } = ctxFor({
      planWriter: writer,
      writeFile,
      rename,
      readFile: async () => "version: 1\n",
    });
    planState.setSource("initial");
    const revBefore = planState.get().revision;

    const patch: PlanPatch = {
      kind: "plan.field",
      field: "title",
      value: "Patched Title",
    };
    const req = reqWithHost(
      "http://localhost:4173/api/plan",
      "localhost:4173",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operationId: "op-patch", patch }),
      },
    );

    const res = await handleRequest(req, ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      operationId: string;
      revision: number;
    };
    expect(body).toEqual({
      ok: true,
      operationId: "op-patch",
      revision: revBefore + 1,
    });
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(planState.get().source).toBe("patched: yes");
  });

  it("SSE: streams initial plan-state event, subsequent update, and releases subscription on abort", async () => {
    const { ctx, planState, trackedSubscriberCount } = ctxFor();
    planState.setSource("v: 1");

    const abort = new AbortController();
    const req = new Request("http://localhost:4173/api/events", {
      headers: { host: "localhost:4173" },
      signal: abort.signal,
    });
    const res = await handleRequest(req, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/text\/event-stream/);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Read until we observe the initial plan-state event.
    let buf = "";
    const readUntil = async (predicate: (s: string) => boolean) => {
      while (!predicate(buf)) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
      }
    };

    await readUntil(
      (s) => s.includes("event: plan-state") && s.includes('"revision":1'),
    );
    expect(buf).toContain("event: plan-state");
    expect(buf).toMatch(/data: \{.*"revision":1.*\}/);
    expect(trackedSubscriberCount()).toBe(1);

    // Trigger an update; expect another plan-state event with revision 2.
    buf = "";
    planState.setSource("v: 2");
    await readUntil((s) => s.includes('"revision":2'));
    expect(buf).toContain("event: plan-state");
    expect(buf).toMatch(/"revision":2/);

    abort.abort();
    // After abort the reader should report done (allow a tick).
    await new Promise<void>((r) => setTimeout(r, 10));
    expect(trackedSubscriberCount()).toBe(0);
  });
});
