# Task Garden Tech Stack

## Status

Accepted for V1 on 2026-04-01.

## Product Constraints

- Single-user tool
- Read-only visualizer for V1
- YAML file is the source of truth
- Different YAML plan files should be supported across runs
- Dependency graph must be a DAG
- Local dev hot reload for YAML/schema changes is sufficient for V1

## Selected Stack

### App Runtime

- Vite
- React
- TypeScript
- Bun as package manager and local task runner

Reasoning:

- V1 is a client-only application with no need for SSR or backend rendering.
- Vite keeps the setup minimal and supports a fast development loop.
- Bun will be the default package manager for dependency installation and script execution.

### Styling

- Tailwind CSS

Reasoning:

- Good fit for a tool-style UI with panels, controls, filters, badges, and responsive layout.
- Fast iteration without introducing a large component framework.

### Validation and Parsing

- Zod v4
- `yaml`

Reasoning:

- Zod defines the canonical plan spec and provides runtime validation plus TypeScript inference.
- YAML keeps plan files readable and editable in source control.

### Graph Rendering

- `@xyflow/react`

Reasoning:

- React Flow is the right UI layer for interactive node/edge visualization.
- It should be treated as the rendering layer, not the analysis engine.

### Graph Model and Analysis

- `graphology`
- `graphology-metrics` and related Graphology metric packages as needed

Reasoning:

- Graphology will be the canonical in-memory graph representation.
- It provides graph algorithms and metrics that are useful for planning analysis and node styling.

Initial metrics of interest:

- topological ordering
- longest dependency chain
- degree
- betweenness centrality
- other centrality/importance metrics as needed

### Layout

- `@dagrejs/dagre`

Reasoning:

- The plan model is explicitly a DAG.
- Dagre is a practical default for directed graph layout in React Flow.
- If layout complexity grows later, `elkjs` is the likely upgrade path.

### Client State

- Zustand

Reasoning:

- Even in V1, state will likely expand across:
  - active plan data
  - selected node
  - filters
  - search query
  - colorization mode
  - metric selection
  - layout mode
  - details panel state
- Zustand is small and simple enough to adopt from the beginning without much overhead.

### Testing

- Vitest
- Playwright

Reasoning:

- Vitest fits naturally with Vite for unit and integration tests.
- Playwright is the preferred browser-level test runner for graph interactions and UI workflows.

### Formatting and Linting

- Biome

Reasoning:

- One tool is simpler than a separate ESLint + Prettier setup for a new TypeScript app.

## Architectural Decisions

- Build a client-only SPA for V1.
- Use Bun as the default package manager.
- Keep plan files in the repository as YAML.
- Support one selected plan file per running app instance.
- Load YAML, parse it, validate it with Zod, then transform it into a Graphology graph.
- Derive React Flow nodes and edges from Graphology plus current UI state.
- Use Zustand for app/view state and derived graph presentation state.
- Reject dependency cycles as invalid input.

## Plan Selection

Recommended V1 approach:

- Select the active plan at server start rather than inside the UI.
- Use an environment variable to choose a plan key, not an arbitrary filesystem path.
- Resolve that key against a compile-time-discoverable set of YAML files included in the app.

Reasoning:

- This preserves the client-only architecture.
- It keeps plan loading compatible with Vite's static environment variable replacement.
- It avoids exposing arbitrary path-reading behavior in a browser app.
- It still allows the developer to switch plans by restarting the dev server with a different setting.

Suggested shape:

- `VITE_PLAN_KEY=task-garden-v1`
- plan registry loaded from a known directory such as `src/plans/*.yaml`

## Explicit Non-Goals for V1

- No in-browser editing
- No in-app plan switching
- No import/export
- No backend API
- No database
- No SSR framework
- No deployed runtime file watching requirement

## Remaining Decisions

- Exact YAML schema shape
- Which metrics are first-class in the UI
- Whether critical path is defined by:
  - longest path by edge count
  - or longest path by estimated duration/effort fields
- Initial filter dimensions beyond search

## Important Note on Critical Path

Critical path is only fully meaningful if work items include duration or effort estimates.
If the schema does not include those fields in V1, the app should describe the result as the
longest dependency chain rather than implying a duration-based schedule calculation.
