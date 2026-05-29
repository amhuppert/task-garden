import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { startPlanWatcher } from "../cli/file-watcher";
import { createPlanState } from "../cli/plan-state";
import { taskGardenPlanServerPlugin } from "../vite-plugins/taskgarden-plan-server";

const DEFAULT_PLAN_PATH = "src/plans/task-garden-v1.taskgarden.yaml";

async function main(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      port: { type: "string" },
    },
  });

  const planArg = positionals[0] ?? DEFAULT_PLAN_PATH;
  const planAbsPath = path.resolve(process.cwd(), planArg);

  if (!existsSync(planAbsPath)) {
    process.stderr.write(`Plan file not found: ${planAbsPath}\n`);
    process.exit(1);
  }

  let parsedPort: number | undefined;
  if (values.port != null) {
    const n = Number(values.port);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      process.stderr.write(`Invalid --port value: ${values.port}\n`);
      process.exit(2);
    }
    parsedPort = n;
  }

  // Create plan state and start the file watcher BEFORE vite.createServer.
  // Vite plugin lifecycle inside bun does not deliver timer or fs.watch
  // callbacks (timers stay registered but never fire). Starting the watcher
  // in the bun event loop before vite initializes works correctly.
  const planState = createPlanState(planAbsPath);
  try {
    const text = readFileSync(planAbsPath, "utf8");
    planState.setSource(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[task-garden] failed to read plan file: ${message}\n`,
    );
    planState.setError(message, false);
  }
  const planWatcherHandle = startPlanWatcher(planAbsPath, planState);

  const vite = await import("vite");
  const server = await vite.createServer({
    plugins: [taskGardenPlanServerPlugin({ planAbsPath, planState })],
    server: { port: parsedPort },
  });

  server.httpServer?.on("close", () => {
    void planWatcherHandle.close();
  });

  await server.listen();
  server.printUrls();
}

await main(process.argv.slice(2));
