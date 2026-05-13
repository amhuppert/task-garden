import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
  request as httpRequest,
} from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import {
  bridgeSseResponse,
  toFetchRequest,
  writeFetchResponse,
} from "./connect-adapter";

type Listener = (req: IncomingMessage, res: ServerResponse) => unknown;

async function listenServer(
  handler: Listener,
): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("test handler error", err);
      try {
        res.statusCode = 500;
        res.end();
      } catch {
        // ignore
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return { server, port };
}

function closeServer(server: Server): Promise<void> {
  return new Promise<void>((resolve) => {
    // node 18+
    (
      server as Server & { closeAllConnections?: () => void }
    ).closeAllConnections?.();
    server.close(() => resolve());
  });
}

describe("connect-adapter", () => {
  it("round-trips a JSON response via toFetchRequest + writeFetchResponse", async () => {
    const { server, port } = await listenServer(async (req, res) => {
      const fetchReq = toFetchRequest(req, `127.0.0.1:${port}`);
      expect(new URL(fetchReq.url).pathname).toBe("/api/plan");
      expect(fetchReq.method).toBe("GET");
      expect(fetchReq.headers.get("host")).toBe(`127.0.0.1:${port}`);

      const fetchRes = new Response(
        JSON.stringify({ revision: 7, source: "hi" }),
        {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
      await writeFetchResponse(res, fetchRes);
    });

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/plan`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type") ?? "").toMatch(
        /application\/json/,
      );
      const body = await response.json();
      expect(body).toEqual({ revision: 7, source: "hi" });
    } finally {
      await closeServer(server);
    }
  });

  it("bridges an SSE response and aborts the controller when the client closes", async () => {
    const captured: { abort: AbortController | null } = { abort: null };
    let resolveAborted: (() => void) | null = null;
    const abortedPromise = new Promise<void>((resolve) => {
      resolveAborted = resolve;
    });

    const { server, port } = await listenServer(async (req, res) => {
      const abort = new AbortController();
      captured.abort = abort;
      abort.signal.addEventListener("abort", () => resolveAborted?.());

      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode("event: plan-state\ndata: hello\n\n"),
          );
          abort.signal.addEventListener("abort", () => {
            try {
              controller.close();
            } catch {
              // already closed
            }
          });
        },
      });
      const fetchRes = new Response(body, {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });

      void bridgeSseResponse(res, fetchRes, abort);
      void toFetchRequest(req, `127.0.0.1:${port}`);
    });

    try {
      const firstChunk = await new Promise<string>((resolve, reject) => {
        const req = httpRequest(
          {
            host: "127.0.0.1",
            port,
            path: "/api/events",
            method: "GET",
            headers: { accept: "text/event-stream" },
          },
          (response) => {
            response.once("data", (chunk: Buffer) => {
              resolve(chunk.toString("utf8"));
              // Force-disconnect to trigger 'close' on the server.
              req.destroy();
            });
            response.on("error", reject);
          },
        );
        req.on("error", reject);
        req.end();
      });

      expect(firstChunk).toContain("event: plan-state");
      expect(firstChunk).toContain("hello");

      await abortedPromise;
      expect(captured.abort?.signal.aborted).toBe(true);
    } finally {
      await closeServer(server);
    }
  });
});
