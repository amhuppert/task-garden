import { readFile } from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import type { PlanState } from "./plan-state";

export type WatcherEvent = "change" | "add" | "unlink";

export type Watcher = {
  on(ev: WatcherEvent, cb: () => void): void;
  close(): Promise<void>;
};

export type WatcherFactory = (absPath: string) => Watcher;

const defaultCreateWatcher: WatcherFactory = (absPath) => {
  // Stat-polling, not inotify. The editing write path replaces the plan
  // atomically via tmp+rename, which swaps the file's inode — a single-file
  // inotify watch is silently orphaned by that and never fires again. (And
  // chokidar's directory watching delivers no events at all under bun.)
  // Polling one file every 250ms is cheap and survives inode swaps.
  const w = chokidar.watch(path.resolve(absPath), {
    usePolling: true,
    interval: 250,
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
