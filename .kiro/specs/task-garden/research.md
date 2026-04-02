# Research & Design Decisions

## Summary
- **Feature**: `task-garden`
- **Discovery Scope**: New Feature
- **Key Findings**:
  - V1 plan selection fits Vite best as a compile-time-safe plan registry keyed by `VITE_PLAN_KEY`; YAML and schema edits hot-reload naturally, while env changes require a dev-server restart.
  - Zod v4 should remain the schema boundary, but cross-record integrity checks should use `.check()` instead of `.superRefine()`; invalid current input must replace, not coexist with, prior valid output.
  - React Flow is the rendering layer, not the analysis engine. Graphology should own dependency analysis and metrics, while Dagre should provide the initial DAG layout and lane-aware ordering hints.

## Research Log

### Plan Selection and Development Refresh
- **Context**: Task Garden must support multiple authored YAML plans across runs, while each running instance shows exactly one selected plan.
- **Sources Consulted**:
  - https://vite.dev/guide/env-and-mode
  - https://vite.dev/guide/features.html#glob-import
  - https://vite.dev/guide/features.html#custom-queries
- **Findings**:
  - Vite exposes client-safe env values through `import.meta.env`, and only variables prefixed with `VITE_` are exposed to client code.
  - Vite loads `.env` files when the dev server starts, so changing `VITE_PLAN_KEY` requires a restart. This matches the accepted V1 requirement that plan selection is fixed at server start time.
  - `import.meta.glob` supports compile-time discovery of modules, including query-based loading patterns that fit YAML-as-text imports.
  - Vite documents a Bun-specific caveat: Bun preloads `.env` into `process.env`, so the project should keep env handling explicit and documented.
- **Implications**:
  - The design should use a typed `VITE_PLAN_KEY` and a compile-time registry built from `src/plans/*.yaml`.
  - Task Garden should not attempt arbitrary runtime filesystem access in the browser.
  - The design should explicitly separate plan-key selection from hot-reloading of the selected YAML file.

### Validation Boundary and Schema Integrity
- **Context**: The app depends on YAML input, rich validation feedback, lane integrity checks, and strict DAG rejection.
- **Sources Consulted**:
  - https://zod.dev/packages/zod
  - [schema-proposal.md](/home/alex/github/task-garden/memory-bank/schema-proposal.md)
- **Findings**:
  - Zod 4 is the stable flagship package.
  - Zod documents `.superRefine()` as deprecated in favor of `.check()`.
  - The current project memory already defines the right validation shape for Task Garden: slug IDs, authored lanes, work items, and graph-integrity checks for duplicate IDs, missing lanes, missing dependencies, duplicate dependencies, self-dependencies, and cycles.
  - The schema boundary should validate immediately after YAML parsing so UI code never receives untrusted raw data.
- **Implications**:
  - The design should define a dedicated schema module and a processing pipeline that returns either a ready snapshot or a typed failure state.
  - Validation feedback must be the only visible output whenever the current source is invalid.
  - Derived analysis data must stay out of authored YAML and out of the schema contract.

### Graph Rendering, Layout, and Analysis
- **Context**: Task Garden needs graph visualization, scoped dependency exploration, topological ordering, longest dependency chain analysis, and structural metrics.
- **Sources Consulted**:
  - https://reactflow.dev/api-reference/react-flow
  - https://reactflow.dev/learn/layouting/layouting
  - https://reactflow.dev/learn/customization/custom-nodes
  - https://graphology.github.io/standard-library/metrics.html
  - https://graphology.github.io/standard-library/dag.html
- **Findings**:
  - React Flow expects a controlled nodes-and-edges model and supports custom node rendering, viewport navigation, and selection states.
  - React Flow documents layout as an external concern and positions Dagre as a pragmatic default for directed graphs, with ELK reserved for more complex future needs.
  - Graphology’s standard-library documentation covers centrality and structural metrics that match the Task Garden requirements.
  - Graphology’s DAG helpers align with Task Garden’s explicit DAG constraint and support the analysis layer without turning React Flow into the source of truth.
- **Implications**:
  - The design should make Graphology the canonical in-memory graph and derive React Flow data from an adapter layer.
  - Lane-aware presentation should be handled in the projection layer, not in authored YAML and not in the store.
  - The insights model should standardize metric definitions and normalized values so both color and size encodings can reuse the same source.

### Styling and Design System Direction
- **Context**: The accepted UI direction is Botanical Systems Atlas with Tailwind CSS.
- **Sources Consulted**:
  - https://tailwindcss.com/docs/installation/using-vite
  - https://tailwindcss.com/docs/theme
  - [botanical-systems-atlas-design-system.md](/home/alex/github/task-garden/memory-bank/botanical-systems-atlas-design-system.md)
- **Findings**:
  - Tailwind v4 uses CSS-first configuration with the Vite plugin and `@theme` token definitions.
  - The project memory already defines a full visual system with purposeful typography, earthy semantic tokens, lane bands, and atlas-style surfaces.
  - The design system is not generic SaaS chrome; it relies on a clear token layer and a small set of reusable primitives.
- **Implications**:
  - The design should include a dedicated theme layer and treat styling tokens as part of the platform boundary, not as scattered component decisions.
  - Lane and metric encodings should plug into the design-token layer so visual comparison remains consistent.
  - No external component kit is needed for V1.

### Shared State Boundary
- **Context**: The user explicitly accepted Zustand from the start, but steering says authored and derived plan data should stay separate from shared UI state.
- **Sources Consulted**:
  - https://zustand.docs.pmnd.rs/getting-started/introduction
  - [state-and-data.md](/home/alex/github/task-garden/.kiro/steering/state-and-data.md)
  - [tech.md](/home/alex/github/task-garden/.kiro/steering/tech.md)
- **Findings**:
  - Project steering strongly prefers multiple small stores and event-shaped actions.
  - The main shared concerns are selection, filters, search, scope, and visual encoding.
  - Raw YAML, validated plans, and Graphology graphs do not belong in Zustand.
- **Implications**:
  - The design should use separate small stores for exploration state and presentation state.
  - Processed plan data should be owned by a local app-level runtime boundary and exposed downward as trusted inputs.
  - UI-only state changes must not trigger re-validation or full metric recomputation.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Monolithic React feature | Parse YAML, validate, analyze, and render directly in feature components with one shared store | Fast to bootstrap, minimal file count | Blurs authored, validated, derived, and UI layers; hard to test; high drift risk | Rejected because it conflicts with steering and would make spec-driven tasking ambiguous |
| Client-side pipeline with projection adapters | Separate runtime config, plan registry, validation pipeline, graph analysis, projection, and UI stores | Clear boundaries, testable pure modules, aligns with client-only V1, supports future plan growth | Slightly more up-front structure | Selected pattern |
| Backend-assisted processor | Move plan loading and analysis to a local or remote API | Strong isolation, could support future collaboration | Adds API, server, deployment, and auth surface outside V1 scope | Rejected because V1 is explicitly client-only and read-only |

## Design Decisions

### Decision: Use a Compile-Time Plan Registry
- **Context**: V1 must support different authored YAML plans but only one selected plan per running app instance.
- **Alternatives Considered**:
  1. Arbitrary filesystem path from the browser
  2. In-app plan switching from a list
  3. Compile-time plan registry keyed by env
- **Selected Approach**: Use `VITE_PLAN_KEY` plus a compile-time registry of bundled YAML documents in `src/plans/`.
- **Rationale**: It matches Vite’s model, preserves the client-only app, and gives predictable dev behavior.
- **Trade-offs**: Switching plans requires a restart; the app does not support browsing arbitrary files in V1.
- **Follow-up**: Type `ImportMetaEnv` for `VITE_PLAN_KEY` and document the Bun/Vite env interaction.

### Decision: Keep a Four-Layer Data Pipeline
- **Context**: Requirements combine authored YAML, strict validation, derived graph analysis, and interactive UI state.
- **Alternatives Considered**:
  1. Store everything as one mutable plan object
  2. Separate authored, validated, derived, and UI layers
- **Selected Approach**: Keep four distinct layers: authored plan input, validated plan model, derived analysis snapshot, and UI presentation state.
- **Rationale**: This matches steering, keeps the contracts explicit, and prevents stale or mixed-state bugs.
- **Trade-offs**: The app has more named boundaries and intermediate types.
- **Follow-up**: Keep requirement-to-component traceability strict during task generation.

### Decision: Make Graphology the Canonical Analysis Model
- **Context**: Task Garden needs metrics, longest-chain analysis, roots, leaves, dependents, and reusable structural selectors.
- **Alternatives Considered**:
  1. React Flow node data as the only graph representation
  2. Custom ad hoc arrays and maps
  3. Graphology for analysis plus React Flow as projection
- **Selected Approach**: Build a Graphology graph from the validated plan, compute analysis there, then project to React Flow.
- **Rationale**: Graphology matches the analysis needs and keeps rendering concerns separate from domain logic.
- **Trade-offs**: The pipeline has a translation step into React Flow models.
- **Follow-up**: Keep metric normalization in the analysis layer so multiple encodings reuse the same data.

### Decision: Use Lane-Aware Projection on Top of DAG Layout
- **Context**: The graph must be readable as a dependency DAG while also exposing plan-authored lanes.
- **Alternatives Considered**:
  1. Pure Dagre layout with lane shown only as labels
  2. Full ELK lane routing immediately
  3. Dagre-backed DAG layout with lane-aware projection bands
- **Selected Approach**: Keep Dagre as the initial layout engine, then project nodes into lane bands using lane order and topological depth.
- **Rationale**: It satisfies V1 readability and lane visibility without prematurely adopting a heavier layout engine.
- **Trade-offs**: Very dense multi-lane plans may still need future layout refinement.
- **Follow-up**: Preserve an upgrade path to ELK if real plans expose routing limits.

### Decision: Label V1 Path Insight as Longest Dependency Chain
- **Context**: Requirements explicitly prohibit implying schedule-accurate critical-path analysis without sufficient duration data.
- **Alternatives Considered**:
  1. Call the result critical path in all cases
  2. Only compute a structural longest chain in V1
  3. Attempt mixed structural and estimate-based path analysis immediately
- **Selected Approach**: Compute and present the longest dependency chain as the primary V1 path insight. Estimates remain optional metadata and future analysis input.
- **Rationale**: It is accurate, requirement-aligned, and avoids overstating what the data means.
- **Trade-offs**: Users who expect scheduling semantics will need clearer labeling.
- **Follow-up**: Revisit weighted path analysis only after estimate semantics are standardized.

## Risks & Mitigations
- Dense plans may overwhelm Dagre or become visually noisy — mitigate with scoped exploration, lane bands, fit-to-view defaults, and a documented ELK upgrade path.
- Metric recomputation could become expensive during active filtering — mitigate by computing the analysis snapshot once per valid plan version and limiting UI interactions to projection-layer recalculation.
- Invalid current input could accidentally leave the previous graph visible — mitigate with an explicit `invalid` processing state that replaces the ready snapshot in the app shell.
- Bun and Vite env handling could confuse plan selection during development — mitigate with typed env declarations, clear developer docs, and a restart requirement for plan-key changes.

## References
- [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode) — client env exposure, startup-time loading, and Bun caveat
- [Vite: Glob Import](https://vite.dev/guide/features.html#glob-import) — compile-time module registry for bundled plan files
- [Vite: Custom Queries](https://vite.dev/guide/features.html#custom-queries) — raw YAML import pattern
- [Tailwind CSS: Install with Vite](https://tailwindcss.com/docs/installation/using-vite) — Tailwind v4 Vite integration
- [Tailwind CSS: Theme Variables](https://tailwindcss.com/docs/theme) — `@theme` token model for the Botanical Systems Atlas theme
- [React Flow: ReactFlow API](https://reactflow.dev/api-reference/react-flow) — controlled graph rendering surface
- [React Flow: Layouting](https://reactflow.dev/learn/layouting/layouting) — Dagre as the pragmatic directed-graph layout default
- [React Flow: Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) — custom node card support for atlas-styled graph items
- [Graphology: Metrics](https://graphology.github.io/standard-library/metrics.html) — centrality and graph metrics
- [Graphology: DAG utilities](https://graphology.github.io/standard-library/dag.html) — DAG-oriented helpers for ordering and cycle-sensitive analysis
- [Zod 4 Package Docs](https://zod.dev/packages/zod) — stable flagship package and `.check()` guidance
- [Zustand Introduction](https://zustand.docs.pmnd.rs/getting-started/introduction) — small-store state management reference
