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

V1 was a read-only visualizer. V2 enables inline editing of every authored field. Edits commit per-field on blur and round-trip through the local CLI, which re-validates the entire plan with Zod before atomically rewriting `plan.taskgarden.yaml`. The YAML file remains the single source of truth — Task Garden does not introduce a database or editor-only format. Users may still edit the YAML directly in an external editor; the watcher surfaces those changes back into the UI through the existing read pipeline.
