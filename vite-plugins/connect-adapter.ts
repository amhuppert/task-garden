import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

const CONNECTION_SPECIFIC_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export function toFetchRequest(
  req: IncomingMessage,
  originHost: string,
  signal?: AbortSignal,
): Request {
  const url = `http://${originHost}${req.url ?? "/"}`;

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (CONNECTION_SPECIFIC_HEADERS.has(name.toLowerCase())) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else {
      headers.set(name, value);
    }
  }

  const method = (req.method ?? "GET").toUpperCase();
  const init: RequestInit & { duplex?: "half" } = { method, headers };
  if (signal) init.signal = signal;

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }

  return new Request(url, init);
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export async function writeFetchResponse(
  res: ServerResponse,
  fetchRes: Response,
  abort?: AbortController,
): Promise<void> {
  const contentType = fetchRes.headers.get("content-type");
  if (contentType?.startsWith("text/event-stream")) {
    await bridgeSseResponse(res, fetchRes, abort ?? new AbortController());
    return;
  }

  res.writeHead(fetchRes.status, headersToObject(fetchRes.headers));
  if (fetchRes.body == null) {
    res.end();
    return;
  }
  const buf = Buffer.from(await fetchRes.arrayBuffer());
  res.end(buf);
}

export async function bridgeSseResponse(
  res: ServerResponse,
  fetchRes: Response,
  abort: AbortController,
): Promise<void> {
  res.writeHead(fetchRes.status || 200, headersToObject(fetchRes.headers));
  res.flushHeaders?.();

  const onClose = () => abort.abort();
  res.on("close", onClose);

  const body = fetchRes.body;
  if (!body) {
    res.off("close", onClose);
    try {
      res.end();
    } catch {
      // already closed
    }
    return;
  }

  const reader = body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value == null) continue;
      const ok = res.write(value);
      if (!ok) {
        await new Promise<void>((resolve) => res.once("drain", resolve));
      }
    }
  } finally {
    res.off("close", onClose);
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
    try {
      res.end();
    } catch {
      // ignore
    }
  }
}
