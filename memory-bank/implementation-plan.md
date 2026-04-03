# Resource Links Implementation Plan

## Locked Decisions

- Keep `ReferenceResolverService` and `ResolvedReference` unchanged. Schema unification changes caller input shape, not resolution behavior.
- Put URL-to-brand detection in shared plan logic at `src/lib/plan/resource-link-preset.ts` because it is pure, reusable, and independent of React.
- Put inline SVG icons and the shared pill component in `src/features/plan-workspace/` because they are presentation concerns used only by the plan workspace.
- Remove label derivation from render-time code. After this change, every rendered resource label comes from authored plan data.
- Do not add React Testing Library or `jsdom`. Component tests should use `react-dom/server` under the existing Vitest `node` environment and assert the rendered HTML contract.
- Keep failure rendering as a disabled resource pill with the resolver error in `title`. Use the detected brand/file/external icon even for failures so icon selection stays schema-free and centralized.
- Inline brand SVGs directly in source; do not add an asset loader or external icon package.

## Phase 1. Icon Detection Service

### 1. Add the preset contract for supported brands and fallbacks
1. **Task name**: Add `detectLinkPreset` contract
2. **What to test**: A new unit test in `src/lib/plan/resource-link-preset.test.ts` asserts that `detectLinkPreset(href, kind)` returns:
   - `github` for `https://github.com/org/repo`
   - `gitlab` for `https://gitlab.com/group/project`
   - `jira` for `https://company.atlassian.net/browse/ABC-123`
   - `confluence` for `https://company.atlassian.net/wiki/spaces/ENG`
   - `file` for `memory-bank/focus.md` when `kind === "bundled_document"`
   - `external` for an unrecognized external URL
3. **What to implement**: Create `src/lib/plan/resource-link-preset.ts` exporting:
   - `type IconPreset = "github" | "gitlab" | "jira" | "confluence" | "file" | "external"`
   - `function detectLinkPreset(href: string, kind: "external_url" | "bundled_document"): IconPreset`
   The first pass can parse known hosts with `new URL()` for external links and short-circuit bundled documents to `file`.
4. **Files involved**:
   - Create `src/lib/plan/resource-link-preset.ts`
   - Create `src/lib/plan/resource-link-preset.test.ts`
5. **Dependencies**: None

### 2. Harden hostname normalization and Atlassian path handling
1. **Task name**: Cover self-hosted and case-insensitive detection rules
2. **What to test**: Expand `src/lib/plan/resource-link-preset.test.ts` to assert:
   - uppercase or mixed-case hostnames still match
   - any hostname containing `github` maps to `github`
   - any hostname containing `gitlab` maps to `gitlab`
   - any hostname containing `jira` maps to `jira`
   - any hostname containing `confluence` maps to `confluence`
   - `*.atlassian.net/wiki/...` is `confluence`, while the same hostname without `/wiki/` is `jira`
   - malformed external URLs fall back to `external` instead of throwing
3. **What to implement**: Normalize hostname and pathname to lowercase before matching, wrap `new URL()` in a narrow `try/catch`, and keep all branching inside `detectLinkPreset` so callers do not duplicate parsing logic.
4. **Files involved**:
   - Modify `src/lib/plan/resource-link-preset.ts`
   - Modify `src/lib/plan/resource-link-preset.test.ts`
5. **Dependencies**: Task 1

## Phase 2. Schema Unification

### 3. Change plan-level references to the shared `{ label, href }` shape
1. **Task name**: Unify `plan.references` with `TaskGardenLinkSchema`
2. **What to test**: Update `src/lib/plan/task-garden-plan.schema.test.ts` so the valid fixtures use:
   - `references: [{ label: "Example", href: "https://example.com" }]`
   - `references: [{ label: "Focus", href: "memory-bank/focus.md" }]`
   Add assertions that parsed plan references preserve both `label` and `href`.
3. **What to implement**: Change `TaskGardenPlanSchemaDefinition.references` from `z.array(ReferenceTargetSchema).default([])` to `z.array(TaskGardenLinkSchema).default([])`. Leave `TaskGardenLinkSchema` unchanged and let inferred types update naturally.
4. **Files involved**:
   - Modify `src/lib/plan/task-garden-plan.schema.ts`
   - Modify `src/lib/plan/task-garden-plan.schema.test.ts`
5. **Dependencies**: None

### 4. Reject legacy string references with no compatibility fallback
1. **Task name**: Enforce the new authored contract
2. **What to test**: Add failing cases in `src/lib/plan/task-garden-plan.schema.test.ts` asserting that:
   - `references: ["https://example.com"]` fails
   - `references: [{ href: "https://example.com" }]` fails because `label` is missing
   - `references: [{ label: "Bad", href: "ftp://example.com" }]` fails through `ReferenceTargetSchema`
3. **What to implement**: Do not add coercion or backward-compat parsing. Keep validation strict so authored YAML must be migrated. Update any in-test plan fixtures that still use the legacy shape.
4. **Files involved**:
   - Modify `src/lib/plan/task-garden-plan.schema.test.ts`
5. **Dependencies**: Task 3

## Phase 3. Icon SVG Components

### 5. Add fallback file and external icons in atlas style
1. **Task name**: Create atlas fallback icons
2. **What to test**: Add `src/features/plan-workspace/ResourceLinkIcon.test.tsx` using `renderToStaticMarkup` to assert that:
   - `preset="file"` renders an inline SVG with a stable marker such as `data-icon="file"`
   - `preset="external"` renders an inline SVG with `data-icon="external"`
   - both icons are `aria-hidden="true"` because visible text provides the label
3. **What to implement**: Create `ResourceLinkIcon.tsx` with a `preset` prop and two atlas-styled fallback SVGs sized for chip rendering. Use existing theme colors through CSS classes and `currentColor`; do not introduce new CSS custom properties yet.
4. **Files involved**:
   - Create `src/features/plan-workspace/ResourceLinkIcon.tsx`
   - Create `src/features/plan-workspace/ResourceLinkIcon.test.tsx`
5. **Dependencies**: Task 2

### 6. Add inline SVG brand icons for GitHub, GitLab, Jira, and Confluence
1. **Task name**: Add brand icon variants
2. **What to test**: Expand `src/features/plan-workspace/ResourceLinkIcon.test.tsx` to assert that each brand preset renders a distinct SVG marker:
   - `data-icon="github"`
   - `data-icon="gitlab"`
   - `data-icon="jira"`
   - `data-icon="confluence"`
   The test should also assert that the component throws or exhaustively fails type-checking if an unknown preset is added without a renderer.
3. **What to implement**: Extend `ResourceLinkIcon.tsx` with four inline SVG components using actual brand logomark geometry sized to the same view box as the fallback icons. Keep the exported surface as one switch-based component so `ResourceLink` has a single icon dependency.
4. **Files involved**:
   - Modify `src/features/plan-workspace/ResourceLinkIcon.tsx`
   - Modify `src/features/plan-workspace/ResourceLinkIcon.test.tsx`
5. **Dependencies**: Task 5

## Phase 4. Shared `ResourceLink` Component

### 7. Render successful external and bundled references through one shared component
1. **Task name**: Create the shared success-state resource pill
2. **What to test**: Add `src/features/plan-workspace/ResourceLink.test.tsx` using `renderToStaticMarkup` with resolver results supplied as plain objects. Assert that:
   - `external_url` renders an `<a>` with `target="_blank"` and `rel="noopener noreferrer"`
   - `bundled_document` renders a `<button type="button">`
   - the authored label is rendered verbatim in both cases
   - the icon preset comes from `detectLinkPreset`, not from label text
3. **What to implement**: Create `ResourceLink.tsx` with props:
   - `label: string`
   - `target: string`
   - `result: { ok: true; value: ResolvedReference } | { ok: false; error: ReferenceResolutionFailure }`
   - `onDocumentPreview?: (documentPath: string, rawDocument: string) => void`
   Resolve the icon preset from `result.value.kind` on success and from a provisional kind derived from `target` on failure (`.md` target => `bundled_document`, otherwise `external_url`).
4. **Files involved**:
   - Create `src/features/plan-workspace/ResourceLink.tsx`
   - Create `src/features/plan-workspace/ResourceLink.test.tsx`
   - Import `detectLinkPreset` from `src/lib/plan/resource-link-preset.ts`
   - Import `ResourceLinkIcon` from `src/features/plan-workspace/ResourceLinkIcon.tsx`
5. **Dependencies**: Tasks 2 and 6

### 8. Add the shared failure-state resource pill
1. **Task name**: Add disabled failure rendering to `ResourceLink`
2. **What to test**: Expand `src/features/plan-workspace/ResourceLink.test.tsx` to assert that a failed resolution renders:
   - a disabled `<button>`
   - the authored label, unchanged
   - the resolver error message in the `title` attribute
   - the same brand/file/external icon family that success would use for the same target
3. **What to implement**: Add the failure branch to `ResourceLink.tsx` and move the shared atlas-chip class stack into this component so both success and failure states use one styling source.
4. **Files involved**:
   - Modify `src/features/plan-workspace/ResourceLink.tsx`
   - Modify `src/features/plan-workspace/ResourceLink.test.tsx`
5. **Dependencies**: Task 7

## Phase 5. Wire the Shared Component into `PlanOverviewHeader` and `PlanDetailsPanel`

### 9. Refactor `PlanOverviewHeader` to consume structured references
1. **Task name**: Replace overview-specific reference rendering
2. **What to test**: Add `src/features/plan-workspace/PlanOverviewHeader.test.tsx` using `renderToStaticMarkup` and a stub resolver. Assert that:
   - structured `plan.references` entries render their authored labels
   - the header no longer derives labels from the target string
   - each plan reference renders through the shared resource pill markup
3. **What to implement**: Remove `ResolvedReferenceItem` from `PlanOverviewHeader.tsx`, map `plan.references` as objects, call `resolver.resolve(reference.href, reference.label)`, and render `ResourceLink` with a collision-safe key of `${reference.label}:${reference.href}`.
4. **Files involved**:
   - Modify `src/features/plan-workspace/PlanOverviewHeader.tsx`
   - Create `src/features/plan-workspace/PlanOverviewHeader.test.tsx`
   - Modify imports to include `ResourceLink`
5. **Dependencies**: Task 8

### 10. Refactor `PlanDetailsPanel` to use the same shared component
1. **Task name**: Replace details-panel link rendering
2. **What to test**: Add `src/features/plan-workspace/PlanDetailsPanel.test.tsx` with a minimal `PlanAnalysisSnapshot` fixture and stub resolver. Assert that:
   - task links render their explicit `label`
   - `PlanDetailsPanel` no longer falls back to `deriveReferenceLabel`
   - bundled document links render button markup from `ResourceLink`
3. **What to implement**: Remove `ResolvedLinkItem`, replace the `item.links.map(...)` block with `ResourceLink`, and delete the `link.label || deriveReferenceLabel(link.href)` fallback because `label` is required by schema.
4. **Files involved**:
   - Modify `src/features/plan-workspace/PlanDetailsPanel.tsx`
   - Create `src/features/plan-workspace/PlanDetailsPanel.test.tsx`
   - Modify imports to include `ResourceLink`
5. **Dependencies**: Task 8

### 11. Remove dead label-derivation code after both surfaces are migrated
1. **Task name**: Delete render-time label derivation
2. **What to test**: Update `src/features/plan-workspace/plan-overview-header.helpers.test.ts` so it covers only `formatLastUpdated`. Build and typecheck should fail if `deriveReferenceLabel` remains imported anywhere.
3. **What to implement**: Delete `deriveReferenceLabel` from `plan-overview-header.helpers.ts`, remove obsolete tests, and clean up imports in `PlanOverviewHeader.tsx` and `PlanDetailsPanel.tsx`.
4. **Files involved**:
   - Modify `src/features/plan-workspace/plan-overview-header.helpers.ts`
   - Modify `src/features/plan-workspace/plan-overview-header.helpers.test.ts`
   - Modify `src/features/plan-workspace/PlanOverviewHeader.tsx`
   - Modify `src/features/plan-workspace/PlanDetailsPanel.tsx`
5. **Dependencies**: Tasks 9 and 10

## Phase 6. Plan YAML Migration

### 12. Add a contract test that validates every bundled YAML plan against the schema
1. **Task name**: Guard bundled plans with a schema-validation test
2. **What to test**: Create `src/plans/bundled-plans.schema.test.ts` that:
   - reads every `*.yaml` file in `src/plans/`
   - parses it with `yaml`
   - validates it with `createTaskGardenPlanSchemaService()`
   - fails with the file name and issue list if any bundled plan uses the old string reference shape
3. **What to implement**: Add the new test file. Keep it filesystem-based and synchronous because Vitest already runs in a `node` environment.
4. **Files involved**:
   - Create `src/plans/bundled-plans.schema.test.ts`
5. **Dependencies**: Task 4

### 13. Migrate bundled plan YAML files to structured references and tighten reference e2e assertions
1. **Task name**: Update authored plans and end-to-end reference expectations
2. **What to test**: First, run the new bundled-plan schema test and `e2e/references.spec.ts`; both should fail before migration because the YAML still uses bare-string references. Then update `e2e/references.spec.ts` to assert exact authored labels:
   - overview shows `Focus` and `Schema Proposal`
   - the `plan-schema` task still shows `Schema Proposal` in the details panel
3. **What to implement**: Update bundled plan files to the new shape:
   - `src/plans/task-garden-v1.yaml`
     - `{ label: "Focus", href: "memory-bank/focus.md" }`
     - `{ label: "Schema Proposal", href: "memory-bank/schema-proposal.md" }`
   - `src/plans/itariffs-v2-task-garden.yaml`
     - `{ label: "Focus", href: "memory-bank/focus.md" }`
   Update `e2e/references.spec.ts` comments and expectations so the browser checks the explicit labels, not filename-derived text.
4. **Files involved**:
   - Modify `src/plans/task-garden-v1.yaml`
   - Modify `src/plans/itariffs-v2-task-garden.yaml`
   - Modify `e2e/references.spec.ts`
5. **Dependencies**: Tasks 9, 10, and 12

## Execution Order and Verification

Run each task as an isolated red-green cycle in the order above. After Task 13, run the full verification set:

1. `bun test`
2. `bun run typecheck`
3. `bun run test:e2e e2e/references.spec.ts`

If any UI or e2e assertion is flaky, fix the component contract first; do not add test-only delays or schema compatibility fallbacks.
