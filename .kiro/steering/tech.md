# Technology Stack

## Architecture

Task Garden is a client-only React application. The active plan is selected at server start, loaded from a bundled YAML file, validated with Zod, transformed into a graph analysis model, and then rendered as an interactive React Flow view.

See `state-and-data.md` for data model layers and state management patterns.

## Core Technologies

- **Language**: TypeScript
- **Framework**: React with Vite
- **Runtime / Package Manager**: Bun
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

### Testing

- Keep tests adjacent to the code they verify
- Test schema validation and graph analysis as pure logic
- Use browser tests for graph interactions and user workflows

## Development Environment

### Required Tools

- Bun for package management and scripts
- Node-compatible frontend toolchain through Vite
- A repo-local YAML plan file selected via environment configuration

### Command Standard

```bash
bun run dev        # Dev server
bun run build      # Production build
bun test           # Run tests
bun run lint       # Lint and format
bun run typecheck  # Type checking
```

## Key Technical Decisions

- V1 is a read-only visualizer, not an editor
- The plan model is a DAG and cycles are invalid input
- One selected plan is shown per running app instance
- Plan selection should use a compile-time-safe key such as `VITE_PLAN_KEY`, not an arbitrary filesystem path
- Lanes are defined by the plan itself rather than a hardcoded enum
- Duration-based critical path should not be implied unless the plan contains estimate data that supports it
