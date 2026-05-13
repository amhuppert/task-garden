import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type WatcherFactory, startPlanWatcher } from "./file-watcher";
import { createPlanState } from "./plan-state";

type EventCb = () => void;
type FakeWatcher = {
  emit: (ev: "change" | "add" | "unlink") => void;
  on: (ev: "change" | "add" | "unlink", cb: EventCb) => void;
  close: () => Promise<void>;
  closed: boolean;
};

function makeFakeWatcher(): {
  factory: WatcherFactory;
  controller: FakeWatcher;
} {
  const listeners: Record<string, EventCb[]> = {
    change: [],
    add: [],
    unlink: [],
  };
  const controller: FakeWatcher = {
    closed: false,
    on(ev, cb) {
      listeners[ev].push(cb);
    },
    emit(ev) {
      for (const cb of listeners[ev]) cb();
    },
    async close() {
      controller.closed = true;
    },
  };
  const factory: WatcherFactory = () => controller;
  return { factory, controller };
}

let tmpDir = "";
let goodPath = "";
let missingPath = "";

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "watcher-"));
  goodPath = path.join(tmpDir, "plan.yaml");
  missingPath = path.join(tmpDir, "does-not-exist.yaml");
  writeFileSync(goodPath, "version: 1\n", "utf8");
});
afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// Wait for the async read inside the watcher event handler to settle.
const flush = () => new Promise<void>((r) => setTimeout(r, 20));

describe("startPlanWatcher", () => {
  it("reads and stores source on 'change' for a real file", async () => {
    const state = createPlanState(goodPath);
    const { factory, controller } = makeFakeWatcher();
    const handle = startPlanWatcher(goodPath, state, {
      createWatcher: factory,
    });
    controller.emit("change");
    await flush();
    expect(state.get().source).toBe("version: 1\n");
    expect(state.get().sourceError).toBeNull();
    await handle.close();
  });

  it("stores source on 'add' for a real file", async () => {
    const state = createPlanState(goodPath);
    const { factory, controller } = makeFakeWatcher();
    const handle = startPlanWatcher(goodPath, state, {
      createWatcher: factory,
    });
    controller.emit("add");
    await flush();
    expect(state.get().source).toBe("version: 1\n");
    await handle.close();
  });

  it("sets sourceError when reading a missing file on 'change'", async () => {
    const state = createPlanState(missingPath);
    const { factory, controller } = makeFakeWatcher();
    const handle = startPlanWatcher(missingPath, state, {
      createWatcher: factory,
    });
    controller.emit("change");
    await flush();
    expect(state.get().sourceError).not.toBeNull();
    await handle.close();
  });

  it("preserves last good source on a failed read after a successful one", async () => {
    const state = createPlanState(goodPath);
    state.setSource("previous: content");
    const prevRev = state.get().revision;
    // Point the watcher at a path that doesn't exist to force read failure.
    const { factory, controller } = makeFakeWatcher();
    const handle = startPlanWatcher(missingPath, state, {
      createWatcher: factory,
    });
    controller.emit("change");
    await flush();
    expect(state.get().source).toBe("previous: content");
    expect(state.get().sourceError).not.toBeNull();
    expect(state.get().revision).toBe(prevRev + 1);
    await handle.close();
  });

  it("sets missing state on 'unlink'", async () => {
    const state = createPlanState(goodPath);
    state.setSource("a: 1");
    const { factory, controller } = makeFakeWatcher();
    const handle = startPlanWatcher(goodPath, state, {
      createWatcher: factory,
    });
    controller.emit("unlink");
    await flush();
    expect(state.get().source).toBeNull();
    expect(state.get().sourceError).not.toBeNull();
    await handle.close();
  });

  it("close() invokes the underlying watcher close", async () => {
    const state = createPlanState(goodPath);
    const { factory, controller } = makeFakeWatcher();
    const handle = startPlanWatcher(goodPath, state, {
      createWatcher: factory,
    });
    await handle.close();
    expect(controller.closed).toBe(true);
  });
});
