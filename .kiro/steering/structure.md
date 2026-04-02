# Project Structure

## Organization Philosophy

Organize Task Garden by feature and responsibility, not by broad technical layer buckets. Keep UI, feature-local state, tests, and supporting modules close together. Shared code should move into common locations only when it is genuinely reused by multiple features.

This repo is still pre-implementation, so structure guidance here is normative: new code should be added to follow these patterns from the beginning.

## Directory Patterns

### Application Shell
**Location**: `/src/app/`  
**Purpose**: Entry points, root providers, app bootstrapping, and app-level composition  
**Example**: App shell wiring the selected plan, global providers, and feature entry views

### Feature Modules
**Location**: `/src/features/<feature>/`  
**Purpose**: Self-contained feature code including components, hooks, stores, tests, and feature-local helpers  
**Example**: A `plan-graph` feature containing the graph canvas, filter controls, details panel, and adjacent tests

### Shared Domain Logic
**Location**: `/src/lib/`  
**Purpose**: Pure modules that are reused across multiple features and are not tied to one UI surface  
**Example**: Generic plan parsing, schema helpers, graph analysis utilities, or reusable formatting logic

### Authored Plans
**Location**: `/src/plans/`  
**Purpose**: Bundled YAML plan files that can be selected at server start  
**Example**: `task-garden-v1.yaml`

### Project Memory
**Location**: `/memory-bank/`, `/.kiro/specs/`, `/.kiro/steering/`  
**Purpose**: Product memory, phase artifacts, and persistent project guidance  
**Example**: Requirements, tech decisions, schema proposals, and steering documents

## Naming Conventions

- **Components**: PascalCase files and exports
- **Hooks**: `use-` prefix in concept, typically `useThing.ts` file names
- **Stores**: `{feature}.store.ts`
- **Schemas**: `{domain}.schema.ts`
- **Types**: `{domain}.types.ts`
- **General modules**: Use descriptive names based on responsibility, not generic names like `utils` or `helpers` unless the scope is truly broad

## Import Organization

```typescript
// Prefer local relative imports within a feature
import { PlanFilters } from "./PlanFilters";
import { usePlanGraphStore } from "./plan-graph.store";

// Shared cross-feature imports should come from stable shared modules
import { TaskGardenPlanSchema } from "@/lib/plan/task-garden-plan.schema";
```

**Path Aliases**:
- `@/`: Reserve for `src/` if aliases are introduced

Prefer relative imports inside a feature. Use shared imports only for genuinely shared modules. Avoid deep cross-feature imports that bypass a feature's intended surface area.

## Code Organization Principles

- Colocate related code, tests, and styles
- Do not create central dump directories for `components`, `hooks`, or `utils`
- Keep feature-local state local until it is shared by multiple consumers
- Keep authored data loading, validation, and graph analysis separate from rendering code
- Derived graph properties belong in analysis or adapter layers, not in authored YAML
- If future external data sources are added, route them through explicit service boundaries instead of fetching directly inside presentation components
