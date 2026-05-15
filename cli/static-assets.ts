import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = (() => {
  const bunDir = (import.meta as { dir?: string }).dir;
  if (typeof bunDir === "string" && bunDir.length > 0) return bunDir;
  return path.dirname(fileURLToPath(import.meta.url));
})();

export function resolveStaticAssetsRoot(): string {
  return path.resolve(moduleDir, "..");
}

export function assertSpaBuilt(root: string): void {
  const indexPath = path.join(root, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error(
      `Built SPA not found at ${root}. Did 'bun run build' succeed?`,
    );
  }
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

async function readFileResponse(
  filePath: string,
  status = 200,
): Promise<Response | null> {
  try {
    const buf = await readFile(filePath);
    return new Response(new Uint8Array(buf), {
      status,
      headers: {
        "content-type": contentTypeFor(filePath),
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return null;
  }
}

export async function handleStaticRequest(
  req: Request,
  root: string,
): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const indexPath = path.join(root, "index.html");

  if (pathname === "/" || pathname === "/index.html") {
    const r = await readFileResponse(indexPath);
    return r ?? new Response("Not Found", { status: 404 });
  }

  if (pathname.startsWith("/assets/")) {
    const rel = pathname.slice("/".length);
    const filePath = path.resolve(root, rel);
    const assetsDir = path.join(root, "assets");
    const relCheck = path.relative(assetsDir, filePath);
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      return new Response("Forbidden", { status: 403 });
    }
    try {
      const s = await stat(filePath);
      if (!s.isFile()) return new Response("Not Found", { status: 404 });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
    const r = await readFileResponse(filePath);
    return r ?? new Response("Not Found", { status: 404 });
  }

  // Serve top-level static files (favicon.ico, site.webmanifest, etc.)
  // when the request maps to a real file at the SPA root. Falls through
  // to index.html for unmatched paths so client-side routing still works.
  if (pathname !== "/" && !pathname.endsWith("/")) {
    const rel = pathname.slice("/".length);
    const filePath = path.resolve(root, rel);
    const relCheck = path.relative(root, filePath);
    if (
      !relCheck.startsWith("..") &&
      !path.isAbsolute(relCheck) &&
      path.dirname(relCheck) === "."
    ) {
      try {
        const s = await stat(filePath);
        if (s.isFile()) {
          const r = await readFileResponse(filePath);
          if (r) return r;
        }
      } catch {
        // fall through to SPA fallback
      }
    }
  }

  const r = await readFileResponse(indexPath);
  return r ?? new Response("Not Found", { status: 404 });
}
