import { readFile } from "node:fs/promises";
import path from "node:path";

export type DocResult =
  | { ok: true; content: string }
  | {
      ok: false;
      status: 400 | 404 | 500;
      code: "unsafe_path" | "document_not_found" | "document_read_failed";
    };

export async function resolveDocument(
  planDir: string,
  requestedPath: string,
): Promise<DocResult> {
  if (typeof requestedPath !== "string" || requestedPath.length === 0) {
    return { ok: false, status: 400, code: "unsafe_path" };
  }

  if (isAbsoluteCrossPlatform(requestedPath)) {
    return { ok: false, status: 400, code: "unsafe_path" };
  }

  const normalized = path.normalize(requestedPath);
  const segments = normalized.split(/[\\/]/);
  if (segments.some((seg) => seg === "..")) {
    return { ok: false, status: 400, code: "unsafe_path" };
  }

  const resolved = path.resolve(planDir, requestedPath);
  const rel = path.relative(planDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return { ok: false, status: 400, code: "unsafe_path" };
  }

  try {
    const content = await readFile(resolved, "utf8");
    return { ok: true, content };
  } catch (err) {
    if (isNotFound(err)) {
      return { ok: false, status: 404, code: "document_not_found" };
    }
    return { ok: false, status: 500, code: "document_read_failed" };
  }
}

function isAbsoluteCrossPlatform(p: string): boolean {
  if (path.isAbsolute(p)) return true;
  // Windows-specific checks for cross-platform safety when running on POSIX.
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true; // C:\foo or C:/foo
  if (/^[\\/]{2}/.test(p)) return true; // UNC \\server\share
  return false;
}

function isNotFound(err: unknown): boolean {
  if (err && typeof err === "object") {
    const code = (err as { code?: unknown }).code;
    if (code === "ENOENT") return true;
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && /ENOENT|no such file/i.test(message))
      return true;
  }
  return false;
}
