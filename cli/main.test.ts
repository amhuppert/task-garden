import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type MainDeps, main } from "./main";

let tmpDir = "";
let planPath = "";

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "tg-main-"));
  planPath = path.join(tmpDir, "plan.yaml");
  writeFileSync(planPath, "version: 1\n", "utf8");
});
afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeDeps(overrides: Partial<MainDeps> = {}): {
  deps: MainDeps;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const deps: MainDeps = {
    stdout: (s) => stdout.push(s),
    stderr: (s) => stderr.push(s),
    assertSpaBuilt: () => {
      /* no-op for tests */
    },
    resolveStaticAssetsRoot: () => "/fake/dist",
    startServer: () => ({
      url: "http://localhost:4173",
      stop: () => {
        /* noop */
      },
    }),
    startPlanWatcher: () => ({
      close: async () => {
        /* noop */
      },
    }),
    openBrowser: () => Promise.resolve(),
    registerSignalHandlers: () => {
      /* tests don't wait on signals */
    },
    awaitShutdown: () => Promise.resolve(),
    ...overrides,
  };
  return { deps, stdout, stderr };
}

describe("main", () => {
  it("--help returns 0 and prints usage", async () => {
    const { deps, stdout } = makeDeps();
    const code = await main(["--help"], deps);
    expect(code).toBe(0);
    expect(stdout.join("")).toMatch(/taskgarden/i);
  });

  it("-h returns 0", async () => {
    const { deps } = makeDeps();
    expect(await main(["-h"], deps)).toBe(0);
  });

  it("--version returns 0 and prints a version", async () => {
    const { deps, stdout } = makeDeps();
    const code = await main(["--version"], deps);
    expect(code).toBe(0);
    expect(stdout.join("")).toMatch(/\d+\.\d+\.\d+/);
  });

  it("missing positional returns 2 with usage to stderr", async () => {
    const { deps, stderr } = makeDeps();
    const code = await main([], deps);
    expect(code).toBe(2);
    expect(stderr.join("")).toMatch(/usage|taskgarden/i);
  });

  it("bad --port returns 2", async () => {
    const { deps } = makeDeps();
    const code = await main([planPath, "--port", "not-a-number"], deps);
    expect(code).toBe(2);
  });

  it("unknown flag returns 2", async () => {
    const { deps } = makeDeps();
    const code = await main([planPath, "--bogus"], deps);
    expect(code).toBe(2);
  });

  it("nonexistent plan file returns 1 with stderr message", async () => {
    const { deps, stderr } = makeDeps();
    const missing = path.join(tmpDir, "does-not-exist.yaml");
    const code = await main([missing], deps);
    expect(code).toBe(1);
    expect(stderr.join("")).toMatch(/Plan file not found/);
    expect(stderr.join("")).toContain(missing);
  });

  it("assertSpaBuilt failure returns 1", async () => {
    const { deps, stderr } = makeDeps({
      assertSpaBuilt: () => {
        throw new Error(
          "Built SPA not found at /fake/dist. Did 'bun run build' succeed?",
        );
      },
    });
    const code = await main([planPath], deps);
    expect(code).toBe(1);
    expect(stderr.join("")).toMatch(/Built SPA not found/);
  });

  it("port-in-use (EADDRINUSE) returns 1 with helpful message", async () => {
    const err = Object.assign(new Error("listen EADDRINUSE"), {
      code: "EADDRINUSE",
    });
    const { deps, stderr } = makeDeps({
      startServer: () => {
        throw err;
      },
    });
    const code = await main([planPath, "--port", "4173"], deps);
    expect(code).toBe(1);
    expect(stderr.join("")).toMatch(/4173/);
    expect(stderr.join("")).toMatch(/in use|--port/);
  });

  it("happy path returns 0 (with awaitShutdown stubbed to resolve)", async () => {
    const { deps, stdout } = makeDeps();
    const code = await main([planPath, "--no-open"], deps);
    expect(code).toBe(0);
    expect(stdout.join("")).toMatch(/http:\/\/localhost/);
    expect(stdout.join("")).toContain(planPath);
  });

  it("signal handler awaits watcher.close() and server.stop() before resolving", async () => {
    const order: string[] = [];
    let releaseWatcherClose: (() => void) | null = null;
    let registeredHandler: (() => Promise<void> | void) | null = null;
    let shutdownResolved = false;

    const { deps } = makeDeps({
      startServer: () => ({
        url: "http://localhost:4173",
        stop: () => {
          order.push("server.stop");
        },
      }),
      startPlanWatcher: () => ({
        close: () =>
          new Promise<void>((resolve) => {
            releaseWatcherClose = () => {
              order.push("watcher.close");
              resolve();
            };
          }),
      }),
      registerSignalHandlers: (handler) => {
        registeredHandler = handler;
      },
      awaitShutdown: () =>
        new Promise<void>((resolve) => {
          // Resolve only when the simulated signal-driven shutdown completes.
          const tick = setInterval(() => {
            if (shutdownResolved) {
              clearInterval(tick);
              resolve();
            }
          }, 1);
        }),
    });

    const mainPromise = main([planPath, "--no-open"], deps);

    // Wait for register() to be called.
    while (!registeredHandler) await new Promise((r) => setTimeout(r, 1));

    // Fire the "signal" — handler should return a promise that does not resolve
    // until releaseWatcherClose is called.
    const handlerPromise = Promise.resolve(
      (registeredHandler as () => Promise<void> | void)(),
    );

    // The handler must NOT have stopped the server yet because watcher.close
    // is still pending.
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual([]);

    // Release the watcher close; now the handler should run server.stop after it.
    (releaseWatcherClose as unknown as () => void)();
    await handlerPromise;
    expect(order).toEqual(["watcher.close", "server.stop"]);

    // Unblock main()'s awaitShutdown so the test cleans up.
    shutdownResolved = true;
    expect(await mainPromise).toBe(0);
  });
});
