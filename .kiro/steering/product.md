# Product Overview

Task Garden is a single-user planning tool for software development projects. It helps an individual developer understand how work breaks down into work items, how those items depend on one another, and which parts of the plan are structurally important.

## Core Capabilities

- Load one selected YAML project plan per running app instance
- Validate plan structure, lane references, and DAG integrity before presenting the plan
- Visualize work items and dependencies as an interactive graph
- Help the user narrow and inspect the plan through search, filters, scoped exploration, and a details panel
- Surface structural analysis such as ordering, longest dependency chains, roots, leaves, and metric-driven comparisons

## Target Use Cases

- A developer wants to reason about delivery sequencing before implementation begins
- A developer wants to understand which work items are prerequisites, downstream effects, or likely bottlenecks
- A developer wants to inspect the same generic planning model across different projects by swapping plan files between runs
- A developer wants planning data to stay human-authored and readable in source control rather than hidden behind a database or editor-only format

## Value Proposition

Task Garden is intentionally narrow:

- It is optimized for one developer, not collaborative planning
- It treats YAML as the source of truth so plans remain portable and reviewable
- It combines authored planning metadata with derived graph analysis instead of forcing the user to compute structure mentally
- It keeps project structure flexible through plan-defined lanes rather than hardcoded team or subsystem categories

V1 is a read-only visualizer. It should make plans easier to understand and compare, not serve as a plan editor.
