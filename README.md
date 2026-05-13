# Task Garden

Task Garden is a single-user planning tool for software delivery plans authored
in YAML. It validates a plan, derives DAG-based analysis, and renders work
items and dependencies in an interactive workspace.

## What It Does

- Loads one plan file per running instance
- Validates plan structure, lane references, and dependency cycles before render
- Visualizes work items as a graph with search, filters, scope controls, and visual encodings
- Shows item details, structural insights, and previewable Markdown references

## Install

Prerequisite: [Bun](https://bun.sh/) — Task Garden is Bun-only and is not
published to npm in v1.

```bash
bun install
bun run build
```

To install the CLI globally from a checkout:

```bash
bun link
# or
bun install -g <path-to-checkout>
```

## Quick Start

Once the CLI is installed, point it at any plan YAML file on disk:

```bash
taskgarden path/to/plan.yaml
```

For development against the bundled sample plan:

```bash
bun run dev src/plans/task-garden-v1.yaml --port 5173
```

### CLI Flags

- `--port <n>`: TCP port (default `4173`).
- `--no-open`: Skip auto-opening the browser.
- `--help` / `-h`: Print usage and exit.
- `--version` / `-v`: Print version and exit.

## Using Plans

Plans are any YAML file on disk. Pass the path on the command line; there is
no compile-time plan registry and no `.env` configuration.

Plan references may be `http`/`https` URLs or Markdown paths. Markdown paths
resolve **relative to the plan file's parent directory** and are served on
demand by the CLI.

Useful references in the repo:

- Schema: `src/lib/plan/task-garden-plan.schema.ts`
- Example plan: `src/plans/task-garden-v1.yaml`

### Symlinks

If you symlink a plan file, document resolution uses the **symlink's**
directory, not the resolved target. Place Markdown references next to the
symlink, not next to the underlying file.

## Local Security

Task Garden is a single-user local tool and is **not safe to expose to other
machines**:

- The server binds to `127.0.0.1` (loopback only).
- Every request's `Host` header is validated against `localhost` and
  `127.0.0.1` on the configured port. Mismatches return 403. This blocks
  DNS-rebinding attacks.
- No CORS headers are emitted; browser JS from other origins cannot read
  responses.

Do not put the server behind a public proxy or bind it to a non-loopback
interface.

## Commands

```bash
bun run dev        # Dev server (Vite + plan-file watcher)
bun run build      # Build SPA + CLI bundle into dist/
bun run start      # Run the CLI from source
bun run typecheck  # Type checking (src/ + cli/)
bun run lint       # Lint and format
bun test           # Unit tests
bun run test:e2e   # Playwright E2E
```

## Claude Code Plugin

This repo doubles as a [Claude Code plugin marketplace](https://docs.anthropic.com/claude-code/plugins). The `task-garden` plugin provides skills for planning projects and authoring valid Task Garden YAML plans.

Add the marketplace and install the plugin from inside Claude Code:

```text
/plugin marketplace add amhuppert/task-garden
/plugin install task-garden@task-garden
```

Source: [`plugins/task-garden/`](plugins/task-garden/) · Marketplace manifest: [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)

## Stack

React 19, Vite, TypeScript, Bun (runtime + bundler), Zod, YAML, Graphology,
React Flow, Zustand, Vitest, Playwright, Biome, and Tailwind CSS.
