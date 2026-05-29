# Task Garden — Plan Workspace UI kit

Hi-fi recreation of Task Garden's single screen: the **Plan Workspace**. It is a three-pane view — filter rail left, dependency graph center, details/insights rail right.

## Files

| File | Purpose |
|---|---|
| `index.html` | Interactive app shell |
| `data.jsx` | Sample plan (items, lanes, deps, status/priority token maps) |
| `Primitives.jsx` | `Kicker`, `Chip`, `Microchip`, `Button`, `Field`, `StatusDot`, `PriorityPill`, `Section`, `StatCard` |
| `Toolbar.jsx` | Left rail — search, scope, status/priority/lane filters, color-by, schedule overlay |
| `GraphCanvas.jsx` | Center — lanes, nodes, dependency edges, critical-path highlighting |
| `DetailsPanel.jsx` | Right rail — Details / Insights tabs, upstream / downstream references |
| `App.jsx` | Composition, shared state |

## What's interactive

- Click a node to select; details update.
- Scope / Color By / Overlay chips toggle active state (color-by affects node accent stripe).
- Status / Priority / Lane filter chips dim non-matching nodes to 32% opacity.
- Search query dims non-matching nodes.
- Details ↔ Insights tabs swap the right rail.

## What's intentionally omitted

- Real reactflow panning/zooming (nodes are absolute-positioned — the layout is fixed).
- HMR / plan source subscriptions / schema validation.
- Mobile slide-over rails.
- Dark theme (supported by tokens; not wired to a toggle here).

## Fidelity

All tokens, radii, shadows, and `.atlas-*` utility classes come from the root `colors_and_type.css`, which is a direct port of `task-garden/memory-bank/botanical-systems-atlas-theme.css`. Layout follows `task-garden/src/features/plan-workspace/*`.
