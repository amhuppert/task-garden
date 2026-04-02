# Task Garden

Task Garden is a client-only React application for exploring software delivery
plans authored in YAML. It validates a plan, derives DAG-based analysis, and
renders work items and dependencies in an interactive workspace.

## What It Does

- Loads one selected plan per app instance
- Validates plan structure, lane references, and dependency cycles before render
- Visualizes work items as a graph with search, filters, scope controls, and visual encodings
- Shows item details, structural insights, and previewable Markdown references

## Getting Started

Prerequisite: [Bun](https://bun.sh/)

```bash
bun install
bun run dev
```

The app reads the active plan key from `.env`:

```bash
VITE_PLAN_KEY=task-garden-v1
```

## Using Plans

Plans are bundled from `src/plans/*.yaml`. To use a different plan:

1. Add `src/plans/<plan-key>.yaml`
2. Set `VITE_PLAN_KEY=<plan-key>` in `.env`
3. Restart the dev server

Useful references in the repo:

- Schema: `src/lib/plan/task-garden-plan.schema.ts`
- Example plan: `src/plans/task-garden-v1.yaml`

Plan references may be `http/https` URLs or repo-relative Markdown paths. Markdown
preview works for bundled `.md` files in `memory-bank/` and `src/`.

## Commands

```bash
bun run dev
bun run build
bun run preview
bun run typecheck
bun run lint
bun test
bun run test:e2e
```

## Stack

React 19, Vite, TypeScript, Zod, YAML, Graphology, React Flow, Zustand, Vitest,
Playwright, Biome, and Tailwind CSS.
