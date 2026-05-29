import type { AsyncMutex } from "./mutex";
import type { PlanState } from "./plan-state";
import type { PlanWriter } from "./plan-writer";
import { type RouteCtx, handleRequest } from "./routes";

export type StartServerOptions = {
  port: number;
  planState: PlanState;
  planDir: string;
  planAbsPath: string;
  staticAssetsRoot: string;
  planWriter: PlanWriter;
  mutexFor: (planAbsPath: string) => AsyncMutex;
  writeFile: (path: string, data: string) => Promise<unknown>;
  readFile: (path: string) => Promise<string>;
  rename: (oldPath: string, newPath: string) => Promise<unknown>;
  now: () => number;
};

export type ServerHandle = {
  url: string;
  stop: () => void;
};

declare const Bun: {
  serve: (opts: {
    hostname: string;
    port: number;
    fetch: (req: Request) => Response | Promise<Response>;
    error?: (err: Error) => Response | Promise<Response>;
  }) => { stop: () => void };
};

export function startServer(opts: StartServerOptions): ServerHandle {
  const ctx: RouteCtx = {
    planState: opts.planState,
    planDir: opts.planDir,
    planAbsPath: opts.planAbsPath,
    staticAssetsRoot: opts.staticAssetsRoot,
    hostAllowList: new Set([
      `localhost:${opts.port}`,
      `127.0.0.1:${opts.port}`,
    ]),
    planWriter: opts.planWriter,
    mutexFor: opts.mutexFor,
    writeFile: opts.writeFile,
    readFile: opts.readFile,
    rename: opts.rename,
    now: opts.now,
  };

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: opts.port,
    fetch: (req) => handleRequest(req, ctx),
    error: (err) => {
      console.error("[task-garden] request error:", err);
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  return {
    url: `http://localhost:${opts.port}`,
    stop: () => server.stop(),
  };
}
