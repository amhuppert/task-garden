# Technology Stack

## Architecture

Task Garden is a single-user local tool. A Bun CLI takes a positional plan
file path on the command line, serves the pre-built React SPA over a tiny
HTTP server, watches the plan file for changes, and streams updates to the
browser via SSE. The browser fetches the plan from `/api/plan`, subscribes
to `/api/events`, fetches referenced Markdown via `/api/document?path=...`,
and owns YAML parsing, Zod validation, DAG analysis, and rendering.

The server binds to `127.0.0.1` only and validates the `Host` header on every
request (`localhost` / `127.0.0.1` on the configured port; mismatches return
403). The tool is intended for single-user local use and is not safe to
expose to other machines.

See `state-and-data.md` for data model layers and state management patterns.

## Wire Contract

`PlanStateSnapshot` is the shape returned by `/api/plan` and sent as the `data`
payload on every `plan-state` SSE event:

```ts
type PlanStateSnapshot = {
  revision: number;                              // monotonic counter
  source: string | null;                         // raw YAML, or null on FS error
  sourceError: { message: string } | null;       // filesystem-level only
  planFileName: string;                          // basename for display
};
```

`/api/document?path=<relative-path>` returns the raw Markdown body with
`Content-Type: text/markdown; charset=utf-8`, or one of `unsafe_path` (400),
`document_not_found` (404), `document_read_failed` (500).

## Core Technologies

- **Language**: TypeScript
- **Runtime / Package Manager / Bundler**: Bun (required for CLI; not published to npm in v1)
- **Frontend Framework**: React with Vite
- **Server**: `Bun.serve()` (CLI), Vite dev server with a Connect-adapter plugin (`vite-plugins/taskgarden-plan-server.ts`) in dev mode
- **File Watcher**: `chokidar`
- **Styling**: Tailwind CSS

## Key Libraries

- **Zod**: Canonical plan schema and boundary validation
- **yaml**: Parsing authored plan files
- **@xyflow/react**: Graph rendering and interaction
- **graphology**: Canonical in-memory graph model and derived analysis
- **@dagrejs/dagre**: Initial DAG layout strategy
- **Zustand**: Shared UI and view state (see `state-and-data.md`)
- **Vitest**: Unit and integration testing
- **Playwright**: Browser-level verification
- **Biome**: Formatting and linting

## Development Standards

### Type Safety

- Do not use `any`
- Do not use `@ts-ignore` or `@ts-expect-error`
- Use `unknown` for truly unknown values
- Minimize assertions and fix type issues properly
- Prefer plain functions over classes unless a class is genuinely necessary

### Validation and Data Boundaries

- Validate external or file-loaded data immediately at the boundary with Zod
- Let validation failures surface clearly rather than leaking invalid data into the app
- Keep authored plan data distinct from derived graph metrics and layout data

### Code Quality

- Prefer early returns over nested branching
- YAGNI applies by default
- Do not introduce backward compatibility behavior unless explicitly requested
- Handle errors at real boundaries such as file loading, parsing, or user input
- Let internal invariant failures surface rather than hiding them with speculative error handling
- Add comments only when they convey non-obvious rationale or constraints
- Do not add comments that narrate obvious code behavior or describe removed/refactored code

### Boundary Discipline

- Components should not parse YAML
- Components should not implement graph algorithms directly
- Validation belongs at data boundaries
- Derived graph data should be computed from validated input, not authored manually
- The CLI server treats the plan file as an opaque blob: YAML parsing, Zod
  validation, and DAG analysis happen in the browser, not on the server

### Testing

- Keep tests adjacent to the code they verify
- Test schema validation and graph analysis as pure logic
- Use browser tests for graph interactions and user workflows

## Development Environment

### Required Tools

- Bun for package management, scripts, and the CLI runtime
- Node-compatible frontend toolchain through Vite for the SPA build

### Command Standard

```bash
bun run dev        # Dev server (Vite + plan-file watcher)
bun run build      # SPA + CLI bundle into dist/
bun run test       # Run tests (vitest; bare `bun test` runs Bun's native runner and fails)
bun run lint       # Lint and format
bun run typecheck  # Type checking (src/ + cli/)
```

## Key Technical Decisions

- V1 is a read-only visualizer, not an editor
- The plan model is a DAG and cycles are invalid input
- One plan file is shown per running CLI instance, selected by the positional
  CLI argument (no compile-time registry, no `VITE_PLAN_KEY`, no `.env`)
- The CLI server is loopback-only (`127.0.0.1`) with `Host`-header validation;
  it is not designed for multi-user or networked use
- Lanes are defined by the plan itself rather than a hardcoded enum
- Duration-based critical path should not be implied unless the plan contains estimate data that supports it
