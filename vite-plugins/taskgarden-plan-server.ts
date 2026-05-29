import { readFileSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Connect, Plugin, ViteDevServer } from "vite";
import { startPlanWatcher } from "../cli/file-watcher";
import { type AsyncMutex, createMutex } from "../cli/mutex";
import { type PlanState, createPlanState } from "../cli/plan-state";
import { planWriter } from "../cli/plan-writer";
import { type RouteCtx, handleRequest } from "../cli/routes";
import { toFetchRequest, writeFetchResponse } from "./connect-adapter";

const API_PATHS = new Set(["/api/plan", "/api/events", "/api/document"]);

export function taskGardenPlanServerPlugin(opts: {
  planAbsPath: string;
  planState?: PlanState;
}): Plugin {
  const planAbsPath = path.resolve(opts.planAbsPath);
  const planDir = path.dirname(planAbsPath);
  const externalPlanState = opts.planState ?? null;

  let planState: PlanState | null = externalPlanState;
  let watcher: { close: () => Promise<void> } | null = null;
  let stopped = false;
  const mutexMap = new Map<string, AsyncMutex>();
  const mutexFor = (key: string): AsyncMutex => {
    let mutex = mutexMap.get(key);
    if (!mutex) {
      mutex = createMutex();
      mutexMap.set(key, mutex);
    }
    return mutex;
  };

  const stopAllResources = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    const w = watcher;
    watcher = null;
    if (w) {
      try {
        await w.close();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[task-garden] watcher close failed:", err);
      }
    }
  };

  return {
    name: "task-garden-plan-server",

    configResolved() {
      if (planState != null) return;
      planState = createPlanState(planAbsPath);
      try {
        const text = readFileSync(planAbsPath, "utf8");
        planState.setSource(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn(`[task-garden] failed to read plan file: ${message}`);
        planState.setError(message, false);
      }
    },

    configureServer(server: ViteDevServer) {
      // When no external planState was provided, the plugin owns the watcher.
      // (Production CLI provides the watcher externally because timers and
      // fs.watch callbacks registered inside Vite's plugin lifecycle under bun
      // do not fire — a known interaction between bun's event loop and Vite's
      // plugin initialization.)
      if (externalPlanState == null && planState != null && watcher == null) {
        watcher = startPlanWatcher(planAbsPath, planState);
      }

      const middleware: Connect.NextHandleFunction = (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathname = rawUrl.split("?")[0] ?? "";
        if (!API_PATHS.has(pathname)) {
          next();
          return;
        }
        if (planState == null) {
          next();
          return;
        }

        const host = req.headers.host ?? "localhost";
        const ctx: RouteCtx = {
          planState,
          planDir,
          planAbsPath,
          staticAssetsRoot: "",
          hostAllowList: new Set([host]),
          planWriter,
          mutexFor,
          writeFile: (p, data) => writeFile(p, data, "utf8"),
          readFile: (p) => readFile(p, "utf8"),
          rename,
          now: () => Date.now(),
        };

        const abort = new AbortController();
        const fetchReq = toFetchRequest(req, host, abort.signal);

        Promise.resolve()
          .then(async () => {
            const fetchRes = await handleRequest(fetchReq, ctx);
            await writeFetchResponse(res, fetchRes, abort);
          })
          .catch((err: unknown) => {
            // eslint-disable-next-line no-console
            console.error("[task-garden] middleware error:", err);
            try {
              if (!res.headersSent) res.statusCode = 500;
              res.end();
            } catch {
              // already closed
            }
          });
      };
      server.middlewares.use(middleware);

      server.httpServer?.on("close", () => {
        void stopAllResources();
      });

      return () => {
        void stopAllResources();
      };
    },
  };
}
