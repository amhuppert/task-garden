# design-sync notes — Task Garden App Components

Synced to claude.ai/design project **Task Garden Design System** (`feda4370-ef0a-40ac-8b41-c20015042104`).
Scope: the real app components under `src/features/plan-workspace/` (31 components: 13 `plan-workspace`, 18 `editing`).

## Build shape (read before re-sync)

This repo is **not** a component-library package — there is no `main`/`module`/`exports`
entry and `dist/` is the built Vite app, not a compiled component library. The sync is
therefore an off-the-default arrangement; the moving parts:

- **Entry**: a scoped barrel `.design-sync/ds-entry.tsx` re-exports exactly the plan-workspace
  components (plus `ReactFlowProvider` and the three graph contexts for previews). It deliberately
  excludes `src/main.tsx` (which calls `createRoot().render()` at load) and unrelated store modules.
  `--entry .design-sync/ds-entry.tsx`. esbuild bundles the TSX from source.
- **Props / `.d.ts`**: there is no shipped `.d.ts` tree, so synth-entry would yield generic
  `{[key]: unknown}` props. We emit a real declaration tree with `tsc` into `dist/types/`
  (`.design-sync/tsconfig.dts.json`); `findTypesRoot()` discovers `dist/types` and `propsBodyFor()`
  scans it for `<Name>Props` interfaces. 27 components auto-extract; the 4 without a named Props
  interface are handled by `cfg.dtsPropsFor` (the two React-Flow nodes get a self-contained `data`
  shape; `ValidationToast`/`WriteThroughStatusFooter` are propless).
- **CSS**: the app's styling is Tailwind v4 compiled by `@tailwindcss/vite` into `dist/assets/index-*.css`.
  `cfg.cssEntry` points at a stable copy `.design-sync/app-tailwind.css` (the hashed dist name varies).
  It's appended verbatim into `_ds_bundle.css` (the converter does NOT follow nested local `@import`s
  from cssEntry — keep cssEntry self-contained).
- **Fonts**: brand faces (Cormorant Garamond / Hanken Grotesk / IBM Plex Mono) load from Google Fonts
  at runtime in the real app (an `index.html` <link>). We ship their actual `@font-face` rules
  (gstatic woff2 CDN urls) via `cfg.extraFonts: [.design-sync/brand-fonts.css]` so designs load the
  true faces. The OS-level fallback families in the `@theme` stacks (Trebuchet MS, Iowan Old Style,
  Palatino Linotype, Book Antiqua) are intentionally NOT shipped — suppressed via
  `cfg.runtimeFontPrefixes`.

**`cfg.buildCmd` = `sh .design-sync/prep.sh`** runs all three refresh steps (app build →
copy compiled CSS → emit `dist/types`). Run it before `package-build`/`resync` whenever app source changed.

## Per-component gotchas

- **Editing cells** share `useFieldDraft` with the contract `{ workItemId, committedValue, baseRevision, patchPlan? }`.
  Omit `patchPlan` to capture the static read/display state; use a DISTINCT `workItemId` per cell so each
  card's draft/save store state stays isolated.
- **FieldSaveIndicator / ValidationToast** read the module-internal `edit.store`, which is not a bundle
  export, so a preview cannot seed it. FieldSaveIndicator only shows its idle render (Saving/Saved phases
  aren't statically reachable). **ValidationToast renders null by default → floor-carded** (intentional;
  no authored preview). If you ever want those active states, export an `edit.store` seeding helper from the
  barrel.
- **Graph nodes** (`WorkItemNode`, `MetricBubbleNode`) read color/size/overlay from
  `GraphDisplayModeContext`/`GraphMetricRangesContext`/`GraphScheduleOverlayContext`. Those contexts are
  exported from the barrel so the node previews can wrap the bundled node in rich (non-default) values —
  a source-path import would be a different React context instance. `MetricBubbleNode` is almost entirely
  context-driven (its preview supplies a `MetricRanges` + `colorMode`/`sizeMode`); `WorkItemNode` is rich
  from `data` alone.
- **PlanWorkspacePage** takes raw plan YAML (`source`); its preview serializes the shared `samplePlan`
  fixture with the `yaml` package to render the full app. cardMode `single` (full-screen composition).
- **NewItemForm** renders a FloatingPortal modal → cardMode `single`. Open Radix/floating modals DO
  capture; `SectionInfoModal`'s open dialog is interaction-only (captures the closed trigger).
- Shared preview data lives in `.design-sync/preview-fixtures.ts` (`samplePlan`, `snapshot` built by the
  real `createPlanAnalysisEngine().build(samplePlan)`, `displayState`, `explorerState*`, `estimateSummary`,
  `nodeData()`, `extUrl/docPath/brokenRef`).

## Known render warns / false-positives

- **`PlanValidationState` ⚠ sentinel collision**: `package-capture`/`validate` flag a cell whose render-root
  `textContent` starts with `⚠` as an error (that's the error-boundary sentinel). PlanValidationState
  legitimately renders `⚠` error panels. Worked around by authoring it as ONE stacked cell led by the
  loading state (root text "Loading plan"), so the sentinel doesn't match. If you split it back into
  per-state cells, the error cells will be misflagged `bad` again — keep the loading-led composition.

## cfg.overrides (presentation)

`cardMode: "column"` on the wide field cells/panels (they're wider than a grid cell), `single` on
`NewItemForm` (portal) and `PlanWorkspacePage` (full app). These are presentation-only — they don't
invalidate grades.

## Re-sync risks (watch-list)

- **`.design-sync/app-tailwind.css` and `dist/types/` are generated** (gitignored / dist). `cfg.buildCmd`
  (prep.sh) regenerates both — never hand-edit `app-tailwind.css`. If a re-sync skips prep.sh after app
  source changed, the bundle ships stale CSS/props.
- **Brand fonts are pinned to gstatic woff2 URLs** captured in `.design-sync/brand-fonts.css` at sync time.
  Google can rotate those URLs; if fonts stop loading, re-fetch the `css2` output (modern UA) into
  `brand-fonts.css`.
- **`samplePlan` is hand-authored** to be schema-valid (it's serialized to YAML for PlanWorkspacePage and
  fed to the analysis engine for the panels). If the plan schema changes, re-validate `samplePlan`
  (PlanWorkspacePage would show its "invalid plan" UI; the panels would mis-render).
- **Props for the 4 `dtsPropsFor` components are hand-written**; if those components' real props change,
  update `cfg.dtsPropsFor`.
- 2 components ship the floor card by design: `PlanGraphCanvas` (canvas orchestrator) and `ValidationToast`
  (store-driven toast, null by default). They're authorable later if the store becomes seedable.
