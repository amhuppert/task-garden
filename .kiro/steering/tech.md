# Technology Stack

## Architecture

Task Garden is a client-only React application. The active plan is selected at server start, loaded from a bundled YAML file, validated with Zod, transformed into a graph analysis model, and then rendered as an interactive React Flow view.

The main architectural boundary is:

- authored plan data
- validated plan model
- derived graph analysis
- UI state and presentation

Keep those concerns separate. Components should render and orchestrate interactions, not parse YAML or own graph algorithms.

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
- **Zustand**: Shared UI and view state
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

### State Management

- Use `useState` for component-local state
- Use Zustand only for state shared across multiple components or view regions
- Prefer multiple small stores over one global monolith
- Name store actions as events (`selectNode`, `clearFilters`, `setters` are less preferred than intentful actions)
- Colocate each store with the feature that owns it

### Validation and Data Boundaries

- Validate external or file-loaded data immediately at the boundary with Zod
- Let validation failures surface clearly rather than leaking invalid data into the app
- Keep authored plan data distinct from derived graph metrics and layout data
- If future versions introduce external services, use interface-driven service boundaries and dependency injection rather than direct implementation imports in components

### Code Quality

- Prefer early returns over nested branching
- Add comments only when they convey non-obvious rationale or constraints
- Handle errors at real boundaries such as file loading, parsing, or user input
- Let internal invariant failures surface rather than hiding them with speculative error handling
- Favor simple, maintainable code over clever abstractions

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

When the app scaffold is created, standard scripts should be exposed through Bun and follow the usual names:

```bash
# Dev: bun run dev
# Build: bun run build
# Test: bun test
# Lint: bun run lint
# Typecheck: bun run typecheck
```

## Key Technical Decisions

- V1 is a read-only visualizer, not an editor
- The plan model is a DAG and cycles are invalid input
- One selected plan is shown per running app instance
- Plan selection should use a compile-time-safe key such as `VITE_PLAN_KEY`, not an arbitrary filesystem path
- Lanes are defined by the plan itself rather than a hardcoded enum
- Duration-based critical path should not be implied unless the plan contains estimate data that supports it
