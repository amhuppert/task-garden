import { readFileSync } from "node:fs";
import path from "node:path";
import type { Connect, Plugin, ViteDevServer } from "vite";
import { startPlanWatcher } from "../cli/file-watcher";
import { type PlanState, createPlanState } from "../cli/plan-state";
import { type RouteCtx, handleRequest } from "../cli/routes";
import { toFetchRequest, writeFetchResponse } from "./connect-adapter";

const API_PATHS = new Set(["/api/plan", "/api/events", "/api/document"]);

export function taskGardenPlanServerPlugin(opts: {
  planAbsPath: string;
}): Plugin {
  const planAbsPath = path.resolve(opts.planAbsPath);
  const planDir = path.dirname(planAbsPath);

  let planState: PlanState | null = null;
  let watcher: { close: () => Promise<void> } | null = null;
  let stopped = false;

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
      watcher = startPlanWatcher(planAbsPath, planState);
    },

    configureServer(server: ViteDevServer) {
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
          staticAssetsRoot: "",
          hostAllowList: new Set([host]),
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
