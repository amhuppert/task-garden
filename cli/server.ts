import type { PlanState } from "./plan-state";
import { type RouteCtx, handleRequest } from "./routes";

export type StartServerOptions = {
  port: number;
  planState: PlanState;
  planDir: string;
  staticAssetsRoot: string;
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
    staticAssetsRoot: opts.staticAssetsRoot,
    hostAllowList: new Set([
      `localhost:${opts.port}`,
      `127.0.0.1:${opts.port}`,
    ]),
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
