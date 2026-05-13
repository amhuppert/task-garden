import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveDocument } from "./document-resolver";

let planDir = "";
beforeAll(() => {
  planDir = mkdtempSync(path.join(os.tmpdir(), "doc-resolver-"));
  mkdirSync(path.join(planDir, "subdir"), { recursive: true });
  writeFileSync(path.join(planDir, "doc.md"), "# Top-level doc\n", "utf8");
  writeFileSync(
    path.join(planDir, "subdir", "nested.md"),
    "# Nested\n",
    "utf8",
  );
});
afterAll(() => {
  rmSync(planDir, { recursive: true, force: true });
});

describe("resolveDocument", () => {
  it("rejects POSIX absolute path", async () => {
    const r = await resolveDocument(planDir, "/etc/passwd");
    expect(r).toEqual({ ok: false, status: 400, code: "unsafe_path" });
  });

  it("rejects Windows-style absolute path (drive letter)", async () => {
    const r = await resolveDocument(planDir, "C:\\foo");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.code).toBe("unsafe_path");
    }
  });

  it("rejects Windows UNC path", async () => {
    const r = await resolveDocument(planDir, "\\\\server\\share\\foo");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects path with .. segment after normalize", async () => {
    const r = await resolveDocument(planDir, "foo/../../etc");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.code).toBe("unsafe_path");
    }
  });

  it("rejects URL-decoded traversal form (post-decode .. segments)", async () => {
    // route layer decodes; we test the decoded form
    const r = await resolveDocument(planDir, "../foo");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unsafe_path");
  });

  it("reads file in planDir (happy path)", async () => {
    const r = await resolveDocument(planDir, "doc.md");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toBe("# Top-level doc\n");
  });

  it("reads nested subdir file", async () => {
    const r = await resolveDocument(planDir, "subdir/nested.md");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toBe("# Nested\n");
  });

  it("returns 404 for nonexistent file inside planDir", async () => {
    const r = await resolveDocument(planDir, "missing.md");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(404);
      expect(r.code).toBe("document_not_found");
    }
  });

  it("rejects path that escapes planDir after resolve", async () => {
    const r = await resolveDocument(planDir, "subdir/../../outside.md");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.code).toBe("unsafe_path");
    }
  });
});
