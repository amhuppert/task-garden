import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { startPlanWatcher } from "./file-watcher";
import { createPlanState } from "./plan-state";
import { startServer } from "./server";
import { assertSpaBuilt, resolveStaticAssetsRoot } from "./static-assets";

export type MainDeps = {
  startServer?: typeof startServer;
  startPlanWatcher?: typeof startPlanWatcher;
  assertSpaBuilt?: typeof assertSpaBuilt;
  resolveStaticAssetsRoot?: () => string;
  openBrowser?: (url: string) => Promise<unknown> | unknown;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  registerSignalHandlers?: (handler: () => Promise<void> | void) => void;
  awaitShutdown?: () => Promise<void>;
};

const USAGE = [
  "Usage: taskgarden <plan-file> [--port <n>] [--no-open] [--help] [--version]",
  "",
  "Arguments:",
  "  <plan-file>          Path to a YAML plan file (required).",
  "",
  "Options:",
  "  --port <n>           TCP port (default 4173).",
  "  --no-open            Skip auto-opening the browser.",
  "  -h, --help           Print this help and exit.",
  "  -v, --version        Print version and exit.",
].join("\n");

function readPackageVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(here, "..", "package.json"),
      path.resolve(here, "..", "..", "package.json"),
      path.resolve(here, "..", "..", "..", "package.json"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        const pkg = JSON.parse(readFileSync(p, "utf8")) as { version?: string };
        if (typeof pkg.version === "string") return pkg.version;
      }
    }
  } catch {
    // fall through
  }
  return "0.0.0";
}

export async function main(
  argv: string[],
  deps: MainDeps = {},
): Promise<number> {
  const stdout = deps.stdout ?? ((s: string) => process.stdout.write(`${s}\n`));
  const stderr = deps.stderr ?? ((s: string) => process.stderr.write(`${s}\n`));

  let parsed: {
    values: {
      port?: string;
      "no-open"?: boolean;
      help?: boolean;
      version?: boolean;
    };
    positionals: string[];
  };
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        port: { type: "string" },
        "no-open": { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    stderr(err instanceof Error ? err.message : String(err));
    stderr(USAGE);
    return 2;
  }

  if (parsed.values.help) {
    stdout(USAGE);
    return 0;
  }
  if (parsed.values.version) {
    stdout(readPackageVersion());
    return 0;
  }

  if (parsed.positionals.length === 0) {
    stderr(USAGE);
    return 2;
  }

  let port = 4173;
  if (parsed.values.port != null) {
    const n = Number(parsed.values.port);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 65535) {
      stderr(`Invalid --port value: ${parsed.values.port}`);
      stderr(USAGE);
      return 2;
    }
    port = n;
  }

  const planArg = parsed.positionals[0]!;
  const planAbsPath = path.resolve(process.cwd(), planArg);

  if (!existsSync(planAbsPath)) {
    stderr(`Plan file not found: ${planAbsPath}`);
    return 1;
  }

  const resolveRoot = deps.resolveStaticAssetsRoot ?? resolveStaticAssetsRoot;
  const assertBuilt = deps.assertSpaBuilt ?? assertSpaBuilt;
  const staticAssetsRoot = resolveRoot();
  try {
    assertBuilt(staticAssetsRoot);
  } catch (err) {
    stderr(err instanceof Error ? err.message : String(err));
    return 1;
  }

  let initialSource: string;
  try {
    initialSource = await readFile(planAbsPath, "utf8");
  } catch (err) {
    stderr(
      `Failed to read plan file: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  }

  const planState = createPlanState(planAbsPath);
  planState.setSource(initialSource);

  const planDir = path.dirname(planAbsPath);
  const watcherStart = deps.startPlanWatcher ?? startPlanWatcher;
  const watcher = watcherStart(planAbsPath, planState);

  let server: { url: string; stop: () => void };
  try {
    const serverStart = deps.startServer ?? startServer;
    server = serverStart({ port, planState, planDir, staticAssetsRoot });
  } catch (err) {
    await watcher.close();
    const code = (err as { code?: string }).code;
    if (code === "EADDRINUSE") {
      stderr(
        `Port ${port} is in use. Pass --port <other> to use a different port.`,
      );
      return 1;
    }
    stderr(
      `Failed to start server: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  }

  stdout(`Task Garden running at ${server.url}`);
  stdout(`Plan: ${planAbsPath}`);

  if (!parsed.values["no-open"]) {
    const opener =
      deps.openBrowser ??
      (async (u: string) => {
        try {
          const mod = (await import("open")) as {
            default: (u: string) => Promise<unknown>;
          };
          await mod.default(u);
        } catch {
          // best-effort; ignore failures
        }
      });
    Promise.resolve(opener(server.url)).catch(() => {
      /* ignore */
    });
  }

  let shutdownResolver: (() => void) | null = null;
  const shutdown = async () => {
    await watcher.close();
    server.stop();
    if (shutdownResolver) shutdownResolver();
  };

  const register =
    deps.registerSignalHandlers ??
    ((handler: () => Promise<void> | void) => {
      const onSignal = () => {
        void Promise.resolve(handler()).finally(() => process.exit(0));
      };
      process.on("SIGINT", onSignal);
      process.on("SIGTERM", onSignal);
    });
  register(() => shutdown());

  const waitForShutdown =
    deps.awaitShutdown ??
    (() =>
      new Promise<void>((resolve) => {
        shutdownResolver = resolve;
      }));
  await waitForShutdown();
  return 0;
}
