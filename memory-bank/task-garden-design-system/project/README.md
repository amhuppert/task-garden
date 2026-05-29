# Task Garden Design System

**Botanical Systems Atlas** — a light-first, parchment-and-moss design system for Task Garden, a single-user read-only planning tool that visualizes project work items and their dependencies as an interactive graph.

The system interprets planning as a cultivated field study rather than a dashboard. Think herbarium cabinet + field notebook + analytical atlas: calm, structured, tactile, quietly dramatic.

---

## Sources

All tokens, utilities, and components are ported 1:1 from the real app so mocks match production pixel-for-pixel.

- **Codebase (read-only)** — mounted local folder `task-garden/`
  - Theme source: `task-garden/memory-bank/botanical-systems-atlas-theme.css`
  - In-app theme: `task-garden/src/index.css`
  - Design system prose: `task-garden/memory-bank/botanical-systems-atlas-design-system.md`
  - Real components: `task-garden/src/features/plan-workspace/*`
  - Logo/favicon: `task-garden/public/`
- Stack: React 19 + Vite + TypeScript + Tailwind v4 + `@xyflow/react` + Zustand + Zod.

Mirrored into this project under `source-docs/` and `assets/` so you don't need access to the original codebase to work here.

---

## Index

| Path | Purpose |
|---|---|
| `colors_and_type.css` | **Canonical** CSS vars + `.atlas-*` utility classes. Import this anywhere. |
| `assets/` | Logo PNGs (192/512), apple-touch-icon, favicon, webmanifest |
| `source-docs/` | Original design system doc + Tailwind v4 theme CSS, for deep reference |
| `preview/*.html` | Individual cards rendered in the Design System tab |
| `ui_kits/plan-workspace/` | Hi-fi React recreation of the main app screen + modular components |
| `SKILL.md` | Agent-skill front matter for cross-compatible use in Claude Code |

---

## Content fundamentals

**Voice.** Dry, precise, observational. Writes like a field note or a curator's label — never marketing. Avoid exclamation marks, emoji, idioms, second-person cheerleading. Short declarative sentences.

**Casing.** Title Case for plan titles and major headings (`Stabilize Auth Contract`). Sentence case for body copy. `UPPERCASE` only on kicker labels and chips, always tracked out (`letter-spacing: 0.18–0.22em`). Status and priority get a fixed capitalization: `Planned`, `Ready`, `In Progress`, `Blocked`, `Done`, `Future`; `P0`, `P1`, `P2`, `P3`, `Nice to Have`.

**Pronouns.** "You" addresses the reader only in help copy (`Select an item to scope the view`). UI copy prefers verbs (`Clear filters`, `Fit Graph`) and descriptive prose (`This item is shown in context only — it doesn't match the active filters.`). Never "we."

**Vocabulary.** Domain-specific terms are canonical: *plan, work item, lane, scope, critical path, slack, upstream, downstream, dependents, dependencies, estimate, specimen*. Controls use short verbs: `Search`, `Scope`, `Color`, `Node Size`, `Schedule Overlay`. Tooltips/info-modals always lead with the one-line summary, then a `How it works:` block.

**Emoji.** Not used. A very small set of geometric glyphs stands in for iconography: `⊞ ◎ ◌ ✕ ☰ ⊞` — always muted, never decorative.

**Numbers.** Integers unrounded when whole, one decimal otherwise (`3d`, `3.2d chain`, `1.5d`). Mono face for all IDs, sequence numbers, and measurements (`api-auth · seq 07`, `B 0.42`).

**Example copy.**

- Kicker: `WORK ITEM DETAILS`, `LANE`, `PLAN OVERVIEW`, `SCHEDULE OVERLAY`
- Neutral state: `Select a work item in the graph to see its details`
- Empty set: `No work items match the active filters.` then `Try broadening your search or clearing the active filters.`
- Banner: `This item is shown in context only — it doesn't match the active filters.`
- Tooltip opening: `Scope narrows the graph around the selected item. It is useful when you want to focus on just the work before it, after it, or both.`

---

## Visual foundations

**Overall vibe.** Light-first parchment with faint ruled gridlines drifting under everything. Botanical accents (moss, sage, lichen, bark) carry structure; petal/pollen are rare signal colors. Everything should feel authored, measured, a bit obsessive — not slick SaaS.

**Color.** Warm and restrained. Backgrounds stay near oklch(0.97 0.018 95) parchment. Primary is **moss** `oklch(0.56 0.104 142)`. Large areas never oversaturate; vivid tones appear only in deliberate small moments (status dots, chip fills, priority pills). Petal = blocked/destructive, pollen = in-progress / critical, moss = primary/done, water = informational, iron = structural neutral.

**Type.** Three-family system. `Cormorant Garamond` for display (plan titles, panel headings, node titles when generous), `Hanken Grotesk` for UI/body, `IBM Plex Mono` for IDs/metrics/kickers. Contrast comes from family + size + letter-spacing — not heavy bold weights. Tracked-out small caps on metadata.

**Backgrounds.** `atlas-page` lays two 32px gridlines + one radial lichen glow in the upper-left. The `atlas-drift` keyframe slowly pans the gridlines over 14s. Body also carries two faint radial blooms (lichen upper-left, water upper-right). No full-bleed photography, no hand-drawn illustrations, no repeating textures beyond the grid and an optional 0.06-opacity dot-noise overlay.

**Animation.** Settling paper, drifting light, quiet growth. Named motions: `seed-rise` (620ms, blur → sharp), `dew-fade` (360ms, tiny translate), `canopy-pulse` (2.8s, lichen halo), `atlas-drift` (14s background pan). Easing is `cubic-bezier(0.18, 0.8, 0.24, 1)`. Avoid springs, neon, bounces.

**Hover states.** Chips darken only their border (`border-strong`); they do *not* change background on hover. Buttons lift 1px. Item reference buttons shift from `surface` to `surface-muted` + strengthen border.

**Press/active states.** Primary chips flip to `atlas-chip-active` — a 135° moss → moss-deep gradient with light text. Pressed buttons return to translateY(0). Selected graph nodes get the `atlas-node-selected` class: moss border + 4px lichen halo via shadow ring.

**Borders.** Always 1px. `--color-border` for most surfaces; `--color-border-strong` for header dividers and active chip rings. Dashed lines appear on lane bands and ruled separators.

**Shadows.** Never grey. Always tinted: `--shadow-specimen` (bark 10%), `--shadow-atlas` (bark 18%), `--shadow-float` (moss-deep 14%). Inset 1px white highlights on input fields and stat cards sell the "pressed paper" feel.

**Protection gradients vs capsules.** This system prefers **gradients** for active states (moss → moss-deep on chips/buttons) and **capsules** (fully rounded) for short text pills: chips, status dots, priority pills, microchips. Large surfaces are rounded rectangles (`--radius-xl`, `--radius-2xl`).

**Layout rules.** Fixed desktop composition: 288px left rail (filters/controls), fluid center (graph canvas), 320px right rail (details/insights tabs). Mobile collapses both rails into slide-over panels. Panels are translucent `bg-panel/98` with `backdrop-blur-xl`. Max content width 1600px.

**Transparency & blur.** Used generously but carefully. `--color-panel` is `oklch(… / 0.84)`; sidebars use `/98 backdrop-blur-xl` so the drifting grid shows through. Modal backdrops: `bg-background/80 backdrop-blur-sm`.

**Imagery.** Warm, restrained, grainy if present. The design system has **no photography**. The only raster asset is the specimen-tag logo. A 0.06-opacity dot-noise pattern (`atlas-noise::before`) is used sparingly to add paper tooth.

**Corner radii.** sm 8.8 · md 14.4 · lg 20 · xl 27 · 2xl 38. Nodes use 22.4px (1.4rem), slightly off-system for a hand-cut specimen-card feel.

**Cards.** Always layered. Panels carry a soft bark shadow + 1px border + optional backdrop-blur. Nodes are single-border rounded rectangles with an optional 3px left accent stripe for color encoding and a 2px bottom metric bar. Stat cards use inset white highlight for an engraved feel.

---

## Iconography

**Approach.** Task Garden is aggressively minimal on iconography — part of the "atlas, not dashboard" principle. No icon library is bundled. The app uses:

1. **Inline SVGs, hand-authored.** Small, single-stroke, 12–16px. Used for the info circle (`ⓘ` equivalent) and the chevron in collapsible tag sections. Stroke width 1.5px, round linecaps.
2. **Geometric glyph characters** as quiet marks where icons would otherwise bloat the UI:
   - `⊞` neutral state placeholder
   - `◎` context-only banner note
   - `◌` empty set
   - `✕` close
   - `☰` mobile menu
3. **Color dots + capsules** replace most status/priority/lane icons. A 6–12px rounded square or circle filled with a status token communicates state without any glyph.
4. **Mono typography** handles everything that would otherwise be a chip icon (IDs, `seq 07`, `B 0.42`, `3d`, `+2d chain`).

**No emoji, no external icon fonts, no Heroicons / Lucide / Phosphor.** If you need an icon the codebase doesn't supply, the preferred fallback is a geometric glyph or a hand-authored 1.5px-stroke SVG at 12–16px. Flag the substitution when you add one.

**Brand assets copied.** `assets/logo-512.png`, `assets/logo-192.png`, `assets/apple-touch-icon.png`, `assets/favicon.ico`, `assets/favicon-32.png`, `assets/site.webmanifest`.

---

## Font note (⚠️ substitution flag)

The system specifies `Cormorant Garamond`, `Hanken Grotesk`, and `IBM Plex Mono`, all of which are loaded from Google Fonts via `@import` in `colors_and_type.css` — **no local TTF files were present in the codebase**, so no local substitution was needed. If you need to serve offline, please provide the three font files and we'll swap the `@import` for a `@font-face` block.

---

## UI kits

| Kit | What it is |
|---|---|
| `ui_kits/plan-workspace/` | Hi-fi recreation of the main Plan Workspace screen: left filter rail, graph canvas with lanes + nodes + edges, right details/insights panel. Includes modular JSX components for nodes, chips, fields, buttons, lanes, details, insights, and the toolbar. |

Task Garden is a single-surface product (one screen, no marketing site, no settings, no auth). One UI kit is sufficient.

---

## Using the system

Drop the tokens into any HTML:

```html
<link rel="stylesheet" href="/colors_and_type.css" />
```

Then compose with `.atlas-*` classes (`atlas-panel`, `atlas-chip`, `atlas-chip-active`, `atlas-button-primary`, `atlas-node`, `atlas-field`, `atlas-kicker`, `atlas-title`, `atlas-microchip`, `atlas-stat-card`). For page shells, add `class="atlas-page"` to the outermost wrapper.

To swap to dark theme ("nocturne greenhouse"), add `.dark` on a wrapper element.
