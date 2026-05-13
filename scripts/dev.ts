import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { taskGardenPlanServerPlugin } from "../vite-plugins/taskgarden-plan-server";

const DEFAULT_PLAN_PATH = "src/plans/task-garden-v1.yaml";

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

  const vite = await import("vite");
  const server = await vite.createServer({
    plugins: [taskGardenPlanServerPlugin({ planAbsPath })],
    server: { port: parsedPort },
  });

  await server.listen();
  server.printUrls();
}

await main(process.argv.slice(2));
