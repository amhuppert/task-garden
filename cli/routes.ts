import { resolveDocument } from "./document-resolver";
import type { PlanState, PlanStateSnapshot } from "./plan-state";
import { handleStaticRequest } from "./static-assets";

export type RouteCtx = {
  planState: PlanState;
  planDir: string;
  staticAssetsRoot: string;
  hostAllowList: ReadonlySet<string>;
};

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

function snapshotEvent(snapshot: PlanStateSnapshot): string {
  return `event: plan-state\ndata: ${JSON.stringify(snapshot)}\n\n`;
}

function createSseResponse(req: Request, planState: PlanState): Response {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (unsubscribe) unsubscribe();
    if (keepalive) clearInterval(keepalive);
    unsubscribe = null;
    keepalive = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          // Stream already closed; ignore.
        }
      };

      enqueue(snapshotEvent(planState.get()));
      unsubscribe = planState.subscribe((snap) => {
        enqueue(snapshotEvent(snap));
      });
      keepalive = setInterval(() => {
        enqueue(":keepalive\n\n");
      }, 25_000);

      if (req.signal.aborted) {
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
      } else {
        req.signal.addEventListener(
          "abort",
          () => {
            cleanup();
            try {
              controller.close();
            } catch {
              // ignore
            }
          },
          { once: true },
        );
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      ...SECURITY_HEADERS,
    },
  });
}

export async function handleRequest(
  req: Request,
  ctx: RouteCtx,
): Promise<Response> {
  const host = req.headers.get("host");
  if (!host || !ctx.hostAllowList.has(host)) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === "/api/plan") {
    return jsonResponse(ctx.planState.get());
  }

  if (pathname === "/api/events") {
    return createSseResponse(req, ctx.planState);
  }

  if (pathname === "/api/document") {
    const raw = url.searchParams.get("path");
    if (raw == null || raw.length === 0) {
      return jsonResponse({ error: "unsafe_path" }, 400);
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return jsonResponse({ error: "unsafe_path" }, 400);
    }
    const result = await resolveDocument(ctx.planDir, decoded);
    if (result.ok) {
      return new Response(result.content, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          ...SECURITY_HEADERS,
        },
      });
    }
    return jsonResponse({ error: result.code }, result.status);
  }

  if (ctx.staticAssetsRoot.length > 0) {
    return handleStaticRequest(req, ctx.staticAssetsRoot);
  }

  return jsonResponse({ error: "not_found" }, 404);
}
