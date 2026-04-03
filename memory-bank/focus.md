# Session Focus

## Objective

Add the ability to associate arbitrary links with a task (JIRA tickets, GitLab MRs, GitHub PRs, Confluence pages, etc.) without making assumptions about what the links are. Unify the plan-level reference and task-level link interfaces under a single schema shape and shared UI component. Auto-detect brand icons from URLs at render time to improve the visual experience.

## Detailed Requirements

### Schema unification

- Plan-level `references` currently uses bare strings (`ReferenceTarget[]`). Change to `{ label, href }[]` — the same shape as task-level `links` (`TaskGardenLink[]`).
- Task-level `links: { label, href }[]` remains unchanged.
- No type metadata stored in the schema — icon detection is purely a UI concern derived from the URL at render time.
- Existing plan YAML files must be migrated to the new reference format.

### Icon auto-detection

A pure function maps a resolved reference to an icon preset based on URL patterns:

| Preset       | Detection rule                                                                 |
|--------------|--------------------------------------------------------------------------------|
| **GitHub**   | Hostname is `github.com`, or hostname contains `github` (self-hosted)          |
| **GitLab**   | Hostname is `gitlab.com`, or hostname contains `gitlab` (self-hosted)          |
| **JIRA**     | Hostname matches `*.atlassian.net` without `/wiki/` in path, or hostname contains `jira` (self-hosted) |
| **Confluence**| Hostname matches `*.atlassian.net` with `/wiki/` in path, or hostname contains `confluence` (self-hosted) |
| **File**     | Fallback for bundled `.md` documents                                           |
| **External** | Fallback for any other external URL                                            |

### Icon style

- **Brand presets** (GitHub, GitLab, JIRA, Confluence): actual brand logos, favicon-style SVGs.
- **Fallbacks** (File, External): simple icons that match the botanical atlas design system — consistent with the existing visual language.

### UI unification

- Merge the two near-identical sub-components (`ResolvedReferenceItem` in `PlanOverviewHeader` and `ResolvedLinkItem` in `PlanDetailsPanel`) into a single shared component.
- Both the plan overview header and task details panel use this shared component.
- The shared component delegates icon selection to the detection service.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema shape for plan references | Unify to `{ label, href }` | One consistent data shape everywhere; plan references gain optional labels |
| Type metadata in schema | None | Icon detection is a UI concern; keeps the schema agnostic about link targets |
| JIRA vs Confluence detection | Differentiate by path (`/wiki/` = Confluence) | Both live on `*.atlassian.net`; path gives accurate distinction |
| Self-hosted instance detection | Heuristic hostname matching | Check for `github`, `gitlab`, `jira`, `confluence` appearing in hostname; broader coverage at acceptable false-positive risk |
| Icon style for presets | Brand favicon-style SVGs | Recognizable at a glance |
| Icon style for fallbacks | Simple design-system-matching icons | Blend with the botanical atlas aesthetic |

## Implementation Approach

1. **Icon detection service** — Pure function `detectLinkPreset(href, kind) → IconPreset` in `src/lib/plan/`. Hostname + path matching logic. Fully unit-testable with no dependencies.

2. **Icon components** — Small SVG components for each of the 6 presets (GitHub, GitLab, JIRA, Confluence, File, External). Located alongside the shared link component. Sized and colored to match the atlas design system.

3. **Schema update** — Change `TaskGardenPlanSchemaDefinition.references` from `z.array(ReferenceTargetSchema)` to `z.array(TaskGardenLinkSchema)`. Update the existing `task-garden-v1.yaml` plan file.

4. **Shared link component** — Extract a unified `ResolvedLinkItem` component (likely in `src/features/plan-workspace/` or a shared location) that receives a resolved reference + label, uses the icon detection service to pick the right icon, and renders the link chip. Replaces both `ResolvedReferenceItem` and the current `ResolvedLinkItem`.

5. **Update consuming components** — Wire the shared component into `PlanOverviewHeader` (plan references) and `PlanDetailsPanel` (task links). Remove the old duplicated sub-components. Update `PlanOverviewHeader` to pass `label` from the new structured references rather than deriving it.

## Relevant Patterns

### Schema & validation
- Zod schemas in `src/lib/plan/task-garden-plan.schema.ts` with inferred TypeScript types
- `ReferenceTargetSchema` validates URLs and repo-relative `.md` paths
- `TaskGardenLinkSchema` is `{ label: string, href: ReferenceTarget }`
- Cross-record integrity checks in `.check()` callback

### Reference resolution
- `ReferenceResolverService` in `src/lib/plan/reference-resolver.ts` resolves targets to `external_url` or `bundled_document`
- Compile-time document registry via Vite `import.meta.glob`
- Service interface pattern with factory function + singleton for production use

### UI components
- `ResolvedReferenceItem` in `PlanOverviewHeader.tsx` (plan-level, derives label from target)
- `ResolvedLinkItem` in `PlanDetailsPanel.tsx` (task-level, receives label as prop)
- Both use `atlas-chip`-style pill rendering with icon + label
- `Section` wrapper component for labeled groups in the details panel
- `deriveReferenceLabel()` in `plan-overview-header.helpers.ts` for fallback label generation

### Design system
- Botanical Systems Atlas: parchment/cream canvas, moss/sage/lichen accents
- Typography: Cormorant Garamond (display), Hanken Grotesk (body), IBM Plex Mono (mono)
- Component classes: `atlas-chip`, `atlas-panel`, `atlas-button-*`, `atlas-kicker`, `atlas-title`
- CSS custom properties for radii (`--radius-sm`), shadows (`--shadow-atlas`), animations
- Existing link icons use Unicode glyphs: `↗` (external), `⊞` (document), `⊘` (error)

### Testing
- Vitest for unit tests, Playwright for e2e
- Test through public contracts (inputs/outputs), not internals
- Pure logic requires no mocks; services use dependency injection for testability
- Tests colocated adjacent to source files

### Architecture
- Feature-scoped directories under `src/features/<feature>/`
- Shared domain logic in `src/lib/`
- Zustand stores per concern (not monolithic)
- Four-layer data pipeline: authored plan → validated model → derived analysis → UI state
