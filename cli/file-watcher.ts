import { readFile } from "node:fs/promises";
import chokidar from "chokidar";
import type { PlanState } from "./plan-state";

export type WatcherEvent = "change" | "add" | "unlink";

export type Watcher = {
  on(ev: WatcherEvent, cb: () => void): void;
  close(): Promise<void>;
};

export type WatcherFactory = (absPath: string) => Watcher;

const defaultCreateWatcher: WatcherFactory = (absPath) => {
  const w = chokidar.watch(absPath, {
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    ignoreInitial: true,
  });
  return {
    on(ev, cb) {
      w.on(ev, cb);
    },
    async close() {
      await w.close();
    },
  };
};

export function startPlanWatcher(
  absPath: string,
  planState: PlanState,
  deps?: { createWatcher?: WatcherFactory },
): { close: () => Promise<void> } {
  const createWatcher = deps?.createWatcher ?? defaultCreateWatcher;
  const watcher = createWatcher(absPath);

  const reload = async () => {
    try {
      const text = await readFile(absPath, "utf8");
      planState.setSourceFromWatcher(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      planState.setError(message, true);
    }
  };

  watcher.on("change", () => {
    void reload();
  });
  watcher.on("add", () => {
    void reload();
  });
  watcher.on("unlink", () => {
    planState.setMissing();
  });

  return {
    close: () => watcher.close(),
  };
}
