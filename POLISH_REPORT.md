# Task Garden — Polish Pass & Functionality Review Report

**Date:** 2026-07-18
**Scope:** Full code review + browser inspection of every UI component, followed by implementation of all changes judged to be strict improvements.

## How the review was run

A multi-agent workflow (15 agents) ran two tracks in parallel:

- **4 code reviewers**, one per dimension: styling consistency, correctness, UX/functionality opportunities, and metrics/reporting.
- **4 browser inspectors** (serialized, sharing one Playwright session) covering: overview/graph/toolbar, details + insights panels, every inline editor, and error/misc states (validation page, document preview, empty states) — against two live dev servers (valid plan on :5199, invalid plan on :5173).
- **7 adversarial verifiers**, one per claimed bug, each instructed to refute the claim by reading the actual code. All 7 bugs were **confirmed** (several with executable reproductions).

Total: **100 findings** (7 verified bugs, 51 code findings, 42 UI findings). Everything below was then implemented, and each fix was re-verified in the browser. Final state: **677/677 tests pass, typecheck clean, lint clean on changed files, production build succeeds.**

---

## Bugs fixed

### 1. Dead plan-file watcher — external YAML edits never reached the UI *(worst bug found)*
`cli/file-watcher.ts`

The write-through editor rewrites the plan atomically via tmp + `rename`, which swaps the file's inode. Chokidar's single-file inotify watch is **silently orphaned by the first UI edit** — from then on, external edits to the YAML never reach the app, and a subsequent UI edit writes the stale in-memory plan back over newer disk content (external edits could be silently reverted). Reproduced in isolation; directory-watching turned out to emit no events at all under bun, so the watcher now uses stat-polling (250 ms on one file — negligible), which survives inode swaps. Verified end-to-end: external edit → revision bump → UI update; `git checkout` of the plan file also propagates.

### 2. Silent data loss when typing during an in-flight save
`editing/edit.store.ts`, `editing/useFieldDraft.ts`

`finishCommit` unconditionally deleted the field's draft on success. Typing into the same field while its PATCH was in flight (no cell disables input during save) meant the newer text vanished when the response landed. The in-flight record now carries the committed value, and the draft is only cleared when it still matches; the validation-rollback path got the same guard. Regression test added.

### 3. Revision regression race on load
`lib/plan/use-task-garden-plan-state.ts`

A slow initial/reconnect fetch resolving after the SSE stream had already delivered a newer revision would overwrite state with the older snapshot — and permanently, since the newer SSE event had already fired. `setReady` now applies the same monotonic revision guard as the SSE path.

### 4. Dependents list showed dependency drafts
`editing/DependencyEditorCell.tsx`

Both DependencyEditorCell instances (editable "Depends on" and derived "Dependents") shared one draft key, so an in-flight dependency edit leaked into the Dependents list (wrong chips, wrong count, lit dirty dot). The derived list now uses its own inert key.

### 5. Stale node positions after lane edits
`lib/graph/flow-projection-service.ts`

The layout cache was keyed only on node/edge sets, but layout depends on lane assignment and lane order. Moving an item to another lane left it rendered inside the old lane's column with the lane band drawn around the wrong coordinates. The layout signature now includes each node's lane and the lane order, and the cache is capped (64 entries, FIFO) instead of growing unboundedly.

### 6. `dependency_span` overcounted
`lib/graph/plan-analysis-engine.ts`

The metric derived "levels below this item" from global levels, which a descendant can inflate via a path that bypasses the item (verified repro: true span 1 reported as 4). It is now a true longest-path-to-leaf computed in the existing reverse-topological pass. Diamond-offset regression test added.

### 7. Unestimated items ranked as "worst" value-per-effort
`plan-analysis-engine.ts`, `plan-graph-canvas.helpers.ts`, `WorkItemNode.tsx`, `MetricBubbleNode.tsx`, `PlanGraphCanvas.tsx`

`value_per_effort` used `0` as a sentinel for "no estimate", so unestimated high-value items rendered at the bottom of every color/size scale and dragged the scale's minimum to 0. Missing metrics are now `NaN`: excluded from range computation, rendered with neutral color and minimum bubble size, and shown as "—" in tooltips.

### 8. Legend ranges disagreed with node encoding
`lib/graph/flow-projection-service.ts`

Color/size legends quoted plan-wide min/max while nodes normalize against visible-only ranges, so under any scope or filter the legend endpoints didn't match what the colors/sizes actually meant. Legends are now computed over visible items (mirroring the schedule legend, which already did this), including the size-legend mean.

### 9. Schedule overlay legend rendered fully offscreen
`src/index.css`, `PlanGraphCanvas.tsx`

The `atlas-noise` utility forced `position: relative`, overriding the legend's `absolute` positioning — the Critical Path / Slack Heatmap legend existed in the DOM but sat below the fold, invisible at every viewport size. The utility no longer sets position. Verified: legend now pins to the canvas top-right.

### 10. Assorted UI bugs
- **Right panel scroll never reset** — selecting a different item opened its details at the old scroll offset with the header offscreen. Scroll now resets on item/tab change (`PlanWorkspacePage.tsx`).
- **Links editor rows overflowed the panel** — the href input had `flex-1` without `min-w-0`, pushing Remove buttons fully outside the viewport (unclickable, links couldn't be removed). Fixed with `min-w-0`/`shrink-0` (`LinksEditorCell.tsx`).
- **"Open link" opened the stale href** — Enter didn't commit link fields; commit raced the blur. Enter now commits immediately (`LinksEditorCell.tsx`).
- **Document preview didn't close on Escape** — the non-modal `<dialog open>` never got native Esc handling. A capture-phase Escape handler closes it (and doesn't leak the Escape into selection-clearing) (`DocumentPreviewModal.tsx`).
- **Metrics-tab color legend printed raw `var(--color-…)` strings** — now renders color swatches like the canvas legend (`PlanInsightsPanel.tsx`).
- **Status picker wrapped to two lines and its chevron collapsed to zero width** — nowrap/truncate/shrink fixes; Lane picker got the same treatment. Both controls now render at equal height (`StatusPickerCell.tsx`, `LanePickerCell.tsx`).
- **Node footer status truncated to "Pl…" on critical-path nodes** — the Critical chip moved to the header chip stack; status labels verified untruncated on every node.
- **Stale "Something went sideways" footer after a successful create** — NewItemForm now routes creates through the shared write-status machinery (Saving → Saved/Error) (`NewItemForm.tsx`).
- **Misleading validation feedback** — server `invalid_patch` rejections showed generic "try again" copy even though retrying always fails; a dedicated "Edit rejected" message was added (`validation-copy.ts`, `edit.store.ts`).
- **Value input showed a rounded draft while committing the unrounded value** — input now displays exactly what will be saved (`ValueInputCell.tsx`).

---

## Polish / consistency

- **Critical-path accent unified to gold** (`--color-pollen`) — the trace, edge glow, and legend now match the gold "Critical" node chips and the legend's "gold trace" copy (was rose/petal, clashing with the slack heatmap's danger color).
- **Sidebar section headers** (Scope, Color, Schedule Overlay, Node Size) no longer wrap or collide with their info icons; values truncate instead.
- **Sidebar header padding** aligned with the toolbar body (`px-4`).
- **Insights panel** root spacing aligned with the details panel (`gap-6`).
- **Structural metric formatting**: integer metrics no longer render as "3.00"/"3.0" in Metric Ranges and bubble tooltips; betweenness keeps two decimals.
- **Ready tab "With Effort" caption** is now state-aware ("All ready items have estimates." vs "N need an estimate…") instead of a contradictory warning.
- **Ready-row IDs** actually truncate now (`truncate` on an inline span was a no-op).
- **Ordering tab** uses the precomputed `topologicalIndex` instead of O(n²) `indexOf`.
- **Resource link chips** cap and ellipsize long user-authored labels (tooltip shows label + target).
- **Document preview**: header path truncates with a tooltip; long unbroken tokens wrap instead of forcing horizontal scroll.
- **Section info modals** no longer trigger the Radix missing-description warning.
- **Validation page heading** says "Invalid plan" (it also covers referential-integrity failures, not just schema errors).
- **`text-[color:var(--color-petal)]`** normalized to `text-petal`.
- **Node hover affordance** added (border strengthens on hover); node tooltip now includes the item summary.
- Dead, contract-inverted `isEventInsideTextInput` removed; stale `estimateUnit` doc comment corrected; `.worktrees/**` excluded from the vitest run (was adding hundreds of phantom test files).

## Functionality added

- **Progress section** in Insights → Overview: a segmented status bar (lifecycle-ordered, status-colored) with per-status counts, items-done (count + %), and **effort-weighted completion** (done estimate / total estimate) — the plan previously surfaced no progress measure at all.
- **`/` focuses search** (with a visible hint next to the Search label); search placeholder now describes everything search actually matches (id, title, summary, tag, lane).
- **Escape clears the selection** when there's nothing to roll back (first Escape cancels edits, second deselects).
- **Status filter chips in lifecycle order** (planned → ready → in progress → blocked → done → future) instead of plan-encounter order; tag chips sorted alphabetically.
- **Plan title in the mobile top bar** (was a hardcoded "Task Garden"); the sidebar title's tooltip now shows the plan file name (previously accepted as a prop but never used).

---

## Verification

- `bun run test` — 677/677 pass (includes new regression tests for the concurrent-edit draft loss, dependency-span diamond case, and NaN value-per-effort).
- `bun run typecheck`, `biome check` (changed files), `bun run build` — clean.
- Browser-verified on both servers: schedule legend visible, gold trace, untruncated node footers, Progress section, swatch legend, `/` and Escape hotkeys, scroll reset, modal Escape, links-row containment, picker alignment, validation-page copy, and a full write-through edit round-trip (edit → disk → revert) plus external-edit watcher round-trip.

## Recommended follow-ups (not implemented)

Ordered roughly by value; these involve product decisions, wire-contract changes, or larger scope:

1. **Done-aware schedule metrics** — critical path, remaining chain, unlocked effort, and slack all count `done` work today. A "remaining plan" view (or excluding done items from these rollups) would make the schedule metrics actionable mid-project. This changes metric semantics, so it deserves a deliberate decision (possibly a toggle).
2. **Document resolver root** — the dogfood plan's own doc links 404: paths resolve against the plan file's directory and `..` is rejected, so repo-root-relative hrefs can never resolve. Either resolve against a configurable project root or define plan-relative linking rules.
3. **Server-side validation codes** — the PATCH endpoint returns blanket `invalid_patch` for empty title/summary, duplicate tags, etc. Specific codes (+ client pre-validation) would enable field-level error messages.
4. **YAML writer line-wrap preservation** — editing one field rewraps unrelated long lines (noisy diffs). Tuning the `yaml` stringify options (e.g. `lineWidth`) to match authored formatting would keep diffs minimal.
5. **Filter chip counts** — show per-lane/status/tag item counts on the filter chips.
6. **Rendered markdown in the document preview** (currently raw source).
7. **Lane/status picker keyboard navigation** (arrow keys; initial focus on the current value).
8. **View-state persistence** — selection, filters, and encodings are lost on reload; localStorage would fix it.
9. **Per-item structural metrics in the details panel** (degree in/out, betweenness, level, span are computed but only visible via graph encodings).
10. **Lane rollup summaries** (count/effort/status per lane band); **clickable canvas legend** entries as filters; **estimate-coverage drill-down** (list the unestimated items); **graph refit on window resize**; removal of the dead self-op suppression machinery in `edit.store.ts` (`hasSeenSelfOp` has no callers).
