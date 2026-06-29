# Task Garden — Botanical Systems Atlas

These are the real Task Garden application components in a light-first, parchment-and-moss
botanical style (herbarium cabinet + field notebook + analytical atlas): calm, structured,
tactile. Build screens that read like a curated field study, never a generic dashboard. Any
copy you write should be dry, precise, observational — no emoji, no marketing tone.

## Wrapping & setup

- Components are self-styled by the global stylesheet. Ensure `styles.css` is loaded — it
  `@import`s the design tokens, the brand fonts, and `_ds_bundle.css` (the component styles).
- Put `class="atlas-page"` on your app/screen root for the parchment background + base type.
- The panels, editing cells, and presentational parts are **prop-driven and need no provider** —
  render them directly with the props in each `<Name>.d.ts`.
- `WorkItemNode` and `MetricBubbleNode` are **React Flow node types**, not standalone widgets:
  register them as `nodeTypes={{ workItem: WorkItemNode, metricBubble: MetricBubbleNode }}` inside
  a `<ReactFlow>` wrapped in `ReactFlowProvider`. They read color/size/overlay encodings from the
  graph display-mode contexts and fall back to sensible defaults off-canvas. For a whole working
  screen, `PlanWorkspacePage` takes raw plan YAML (`source`) and renders the entire app itself.

## Styling idiom — design tokens + `.atlas-*` classes

Style your own layout with this system's vocabulary; don't invent class names. Two layers:

**Tokens** (CSS custom properties — use as `var(--token)`, inline `style`, or Tailwind
`bg-/text-/border-` utilities):
- Surfaces: `--color-background`, `--color-surface`, `--color-surface-strong`, `--color-surface-muted`, `--color-panel`, `--color-panel-strong`
- Ink & strokes: `--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-border-strong`
- Botanical accents: `--color-moss` (primary), `--color-sage`, `--color-lichen`, `--color-bark`, `--color-water`, `--color-petal`, `--color-pollen`
- Status: `--color-status-planned|ready|blocked|in-progress|done|future`
- Type: `--font-display` (Cormorant Garamond serif), `--font-sans` (Hanken Grotesk), `--font-mono` (IBM Plex Mono)
- Radii `--radius-sm|md|lg|xl|2xl`; shadows `--shadow-specimen|float|atlas`

**Component classes** (compose for on-brand chrome):

| class | use |
|---|---|
| `atlas-page` | screen root: parchment background + base type |
| `atlas-panel` / `atlas-panel-strong` | floating surfaces, popovers, cards |
| `atlas-title` | display-serif headings |
| `atlas-kicker` | small uppercase, letter-spaced section labels |
| `atlas-field` (+`atlas-field-focus`) | text inputs / textareas |
| `atlas-chip` / `atlas-chip-active` | filter / toggle chips |
| `atlas-microchip` | tiny inline metric tags |
| `atlas-button-primary` / `atlas-button-secondary` | buttons |
| `atlas-stat-card` / `atlas-metric-grid` | metric stat cards and their grid |
| `atlas-node` / `atlas-node-selected` | graph node-card chrome |

Tailwind utilities resolve to the tokens (`bg-surface`, `text-foreground`, `text-muted-foreground`,
`border-border`). The shipped stylesheet is the app's *compiled* Tailwind subset, so for novel
layout prefer the `.atlas-*` classes and `var(--*)` tokens (inline `style`) over arbitrary
utilities that may not be in the build.

## Where the truth lives

Read the bound `styles.css` and `_ds_bundle.css` for the exact tokens/classes, and each
component's `<Name>.d.ts` (props) + `<Name>.prompt.md` (usage) before composing it.

## Idiomatic snippet

```tsx
const { PlanInsightsPanel } = window.TaskGarden;

<div className="atlas-page" style={{ minHeight: "100vh", padding: 24 }}>
  <span className="atlas-kicker">Plan</span>
  <h1 className="atlas-title" style={{ fontSize: 30, color: "var(--color-foreground)" }}>
    Task Garden — Dependency Graph
  </h1>
  <div className="atlas-panel" style={{ marginTop: 16, padding: 16 }}>
    <PlanInsightsPanel snapshot={snapshot} display={display} explorer={explorer} projection={null} />
  </div>
</div>
```
