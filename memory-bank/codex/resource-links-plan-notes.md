# Resource Links Plan Notes

## Purpose

This note captures the current-state audit and the design decisions behind the implementation plan for resource links. Read this before executing `memory-bank/implementation-plan.md` if you need to understand why the tasks are ordered the way they are.

## Current-State Audit

### Schema

- `src/lib/plan/task-garden-plan.schema.ts`
  - `references` is `ReferenceTarget[]`
  - `links` is `TaskGardenLink[]`
  - `TaskGardenLinkSchema` already has the target shape the feature wants: `{ label, href }`
- Result: plan-level and task-level resources cannot share one authoring contract today.

### Resolution

- `src/lib/plan/reference-resolver.ts`
  - already resolves a target plus label into `external_url` or `bundled_document`
  - already returns the information needed to preview bundled Markdown
- Result: the resolver does not need a new abstraction. The change is upstream at authoring time and downstream at rendering time.

### UI duplication

- `src/features/plan-workspace/PlanOverviewHeader.tsx`
  - has a local `ResolvedReferenceItem`
  - derives labels from the target string with `deriveReferenceLabel`
- `src/features/plan-workspace/PlanDetailsPanel.tsx`
  - has a local `ResolvedLinkItem`
  - accepts explicit labels but still includes a fallback to `deriveReferenceLabel`
- Result: both surfaces branch the same three ways, carry the same class stack, and differ mostly in where the label comes from.

### Tests

- Pure logic is already tested in Vitest under a `node` environment.
- No React component test harness is installed.
- E2E coverage already exists in `e2e/references.spec.ts`.
- Result: the cheapest path is:
  - pure logic tests in Vitest
  - render-contract component tests via `react-dom/server`
  - existing Playwright coverage for integrated behavior

## Decisions Locked In

### 1. Keep resolver contracts stable

- `ReferenceResolverService.resolve(target, label)` stays as-is.
- Reason: the resolver already models exactly what the UI needs. Reworking it would expand scope without solving the actual schema mismatch.

### 2. Remove render-time label derivation

- After schema unification, all labels are authored data.
- `deriveReferenceLabel` becomes dead code and should be deleted.
- Reason: keeping fallback label derivation would undermine the whole schema-unification goal and make plan-level vs task-level behavior diverge again.

### 3. Put icon detection in `src/lib/plan/`

- Proposed file: `src/lib/plan/resource-link-preset.ts`
- Reason: `detectLinkPreset` is pure domain logic driven by URL parsing and resolved kind. It is not tied to one React surface.

### 4. Put icon SVGs and the shared pill in `src/features/plan-workspace/`

- Proposed files:
  - `src/features/plan-workspace/ResourceLinkIcon.tsx`
  - `src/features/plan-workspace/ResourceLink.tsx`
- Reason: the icons are a presentational implementation detail of this workspace. They are not shared outside the feature today.

### 5. Do not add test dependencies

- Keep Vitest in `node`.
- Use `renderToStaticMarkup` for component HTML-contract tests.
- Reason: adding `jsdom` or Testing Library would change the test stack for a small UI refactor and is unnecessary for these components.

### 6. Use one icon-selection path for success and failure

- Success: use `ResolvedReference.kind`
- Failure: infer provisional kind from the raw target string (`.md` => file, else external) and still call `detectLinkPreset`
- Reason: this keeps brand detection centralized and avoids a separate error-icon taxonomy that the requirements did not ask for.

## Why The Task Order Matters

1. `detectLinkPreset` comes first because the shared component will depend on it, and it is the easiest logic to validate in isolation.
2. Schema unification comes before UI refactors because it defines the new data contract and lets the later UI work delete label-derivation logic instead of supporting two paths.
3. Icon SVGs come before `ResourceLink` so the shared component can be built against a stable icon API.
4. `ResourceLink` is introduced before touching existing surfaces so the migration is replacement work, not simultaneous redesign.
5. YAML migration happens last because the strict schema test should fail until the code is ready to consume the new shape.

## Exact YAML Migration Targets

### `src/plans/task-garden-v1.yaml`

- Replace:
  - `memory-bank/focus.md`
  - `memory-bank/schema-proposal.md`
- With:
  - `{ label: "Focus", href: "memory-bank/focus.md" }`
  - `{ label: "Schema Proposal", href: "memory-bank/schema-proposal.md" }`

### `src/plans/itariffs-v2-task-garden.yaml`

- Replace:
  - `memory-bank/focus.md`
- With:
  - `{ label: "Focus", href: "memory-bank/focus.md" }`

## Risks To Watch During Execution

- `PlanOverviewHeader` currently keys plan references by the target string. Once labels are authored, use `${label}:${href}` to avoid duplicate-key collisions.
- `PlanDetailsPanel` currently imports `deriveReferenceLabel`; remove that import only after `ResourceLink` is in place.
- Existing e2e assertions in `e2e/references.spec.ts` are intentionally loose because overview labels were derived. Tighten them only after YAML migration lands.
- `ResourceLinkIcon` should keep icons `aria-hidden` so the visible label remains the accessible name.

## Recommended Final Validation

- `bun test`
- `bun run typecheck`
- `bun run test:e2e e2e/references.spec.ts`

If verification fails, do not reintroduce legacy string-reference parsing. Fix the schema fixtures, rendered labels, or e2e expectations instead.
