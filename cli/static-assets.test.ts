import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertSpaBuilt,
  handleStaticRequest,
  resolveStaticAssetsRoot,
} from "./static-assets";

let root = "";
beforeAll(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "spa-"));
  mkdirSync(path.join(root, "assets"), { recursive: true });
  writeFileSync(path.join(root, "index.html"), "<html>spa-root</html>", "utf8");
  writeFileSync(
    path.join(root, "assets", "app.js"),
    "console.log('hi');",
    "utf8",
  );
  writeFileSync(path.join(root, "assets", "style.css"), "body{}", "utf8");
  writeFileSync(path.join(root, "favicon.ico"), "icobytes", "utf8");
  writeFileSync(
    path.join(root, "site.webmanifest"),
    '{"name":"x"}',
    "utf8",
  );
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("resolveStaticAssetsRoot", () => {
  it("returns path.resolve(import.meta.dir, '..') equivalent (one level above cli/)", () => {
    const r = resolveStaticAssetsRoot();
    // The function returns one level above the directory containing this module.
    // We assert it ends in something other than '/cli' and is an absolute path.
    expect(path.isAbsolute(r)).toBe(true);
    expect(path.basename(r)).not.toBe("cli");
  });
});

describe("assertSpaBuilt", () => {
  it("returns silently when index.html exists", () => {
    expect(() => assertSpaBuilt(root)).not.toThrow();
  });

  it("throws when index.html is missing", () => {
    const empty = mkdtempSync(path.join(os.tmpdir(), "empty-"));
    try {
      expect(() => assertSpaBuilt(empty)).toThrow(/index\.html|SPA/i);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("handleStaticRequest", () => {
  it("serves index.html on /", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/"),
      root,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/text\/html/);
    expect(await res.text()).toContain("spa-root");
  });

  it("serves a JS asset under /assets/", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/assets/app.js"),
      root,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(
      /javascript|text\/javascript|application\/javascript/,
    );
    expect(await res.text()).toContain("console.log");
  });

  it("serves a CSS asset under /assets/", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/assets/style.css"),
      root,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/css/);
  });

  it("serves a top-level favicon.ico with image content-type", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/favicon.ico"),
      root,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/image\/x-icon/);
    expect(await res.text()).toBe("icobytes");
  });

  it("serves a top-level site.webmanifest with manifest content-type", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/site.webmanifest"),
      root,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(
      /application\/manifest\+json/,
    );
  });

  it("falls back to index.html for unknown route (SPA fallback)", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/some/spa/route"),
      root,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/text\/html/);
    expect(await res.text()).toContain("spa-root");
  });

  it("returns 404 for missing asset under /assets/", async () => {
    const res = await handleStaticRequest(
      new Request("http://localhost/assets/missing.js"),
      root,
    );
    expect(res.status).toBe(404);
  });
});
