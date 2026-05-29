# Botanical Systems Atlas

## Vision

Botanical Systems Atlas is a light-first design system for Task Garden that interprets project planning as a cultivated field study rather than a dashboard. The interface should feel like a hybrid of herbarium cabinet, field notebook, and analytical atlas: calm, structured, tactile, and a little obsessive.

This is not a whimsical plant app. The "garden" concept appears through materiality and structure:

- parchment and specimen-paper surfaces
- moss and lichen accents for active states
- bark and iron tones for structure and gravity
- layered grid lines, map marks, and soft bloom rather than flat SaaS panels

The unforgettable quality should be: "This feels like I am studying a living system on a drafting table."

## Tone

- Refined
- Organic but not soft
- Analytical
- Quietly dramatic
- Textural rather than glossy

## Core Principles

### 1. Atlas, Not Dashboard

Every surface should feel authored and composed. Avoid interchangeable analytics-card layouts. Panels should feel like study sheets pinned to a working table.

### 2. Structure Is Beautiful

The graph, lanes, filters, and details panel should visually reinforce the idea that planning is about structure. Grid lines, ruled dividers, lane bands, and measured spacing are part of the aesthetic.

### 3. Organic Color, Controlled Hierarchy

Use earth-derived tones with strict semantic meaning. Moss and lichen are for active and positive emphasis. Bark and iron are for stable structure. Petal and pollen are rare signal colors.

### 4. Progressive Disclosure

The interface should reveal complexity gradually. The first glance should be calm and legible. Dense detail belongs in the details panel, scoped graph views, and expanded analysis sections.

## Typography

### Font Pairing

- **Display**: `Cormorant Garamond`
- **Body / UI**: `Hanken Grotesk`
- **Mono / data labels**: `IBM Plex Mono`

### Typographic Roles

- Plan title and major panel headings use the display face with generous scale and tight tracking
- Controls, filters, chips, and supporting prose use the sans face
- IDs, sequence labels, and compact metrics use the mono face sparingly

### Rules

- Keep uppercase metadata small and tracked out
- Let major titles breathe
- Do not use heavy bold weights everywhere; contrast should come from family, size, and rhythm

## Color System

### Semantic Palette

- **Canvas**: parchment, specimen paper, soft mineral cream
- **Structure**: bark, iron, faded slate
- **Life / active states**: moss, sage, lichen
- **Signal colors**:
  - water for informational structural signals
  - pollen for active motion / in-progress emphasis
  - petal for blocked / destructive / warning pressure

### Color Usage

- Backgrounds remain warm and restrained
- Primary action and active selection use moss
- Graph comparison modes can map to status, lane, or metrics, but the base interface should remain earthy and quiet
- Large areas should avoid oversaturation; vivid tones belong in small, deliberate moments

## Motion Language

Motion should feel like settling paper, drifting light, and quiet growth.

### Primary motions

- soft rise-and-focus on initial panel entry
- slow background drift in the atlas grid layer
- delicate highlight bloom on selection
- restrained transitions on filters and chips

### Avoid

- springy toy-like motion
- fast neon hover effects
- over-animated microinteractions

## Layout System

### Main Screen Composition

Recommended default composition:

- **Top rail**: plan identity, selected plan indicator, high-level summary
- **Left / center**: main graph field
- **Right column**: details and analysis drawer
- **Upper controls**: search, lane filters, status filters, metric mode

### Spatial Character

- broad negative space around the graph
- large rounded panels with layered surfaces
- asymmetry created by a large graph field and a narrower but dense right column
- ruled lane backgrounds behind graph content when multiple lanes exist

## Tailwind v4 Theme

Primary implementation file:

- [botanical-systems-atlas-theme.css](/home/alex/github/task-garden/memory-bank/botanical-systems-atlas-theme.css)

Use Tailwind v4 CSS-first configuration:

- `@import "tailwindcss"`
- `@theme` tokens
- `@custom-variant dark`
- custom utilities for atlas-specific surfaces and graph components

## Component Language

### 1. Page Canvas

Use `atlas-page`.

Purpose:

- establishes the drifting atlas grid
- creates the atmospheric parchment field
- makes the whole app feel like one composed surface rather than disconnected cards

### 2. Panels

Use:

- `atlas-panel`
- `atlas-panel-strong`

Rules:

- most tool surfaces are translucent paper panels
- stronger panels are reserved for primary graph/details containers
- avoid stacking many equally strong boxes

### 3. Inputs and Controls

Use:

- `atlas-field`
- `atlas-field-focus`
- `atlas-button-primary`
- `atlas-button-secondary`
- `atlas-chip`
- `atlas-chip-active`

Rules:

- controls should feel instrument-like, not pillowy SaaS controls
- active chips should look marked with botanical ink rather than toggled with bright synthetic color

### 4. Graph Nodes

Use:

- `atlas-node`
- `atlas-node-selected`

Node anatomy:

- small uppercase metadata line
- title in strong but compact hierarchy
- compact row of semantic chips
- quiet footer with dependency and metric summary

The node should feel like a specimen label card pinned into the atlas.

### 5. Lane Presentation

Lanes should read like cultivation beds or ruled study bands:

- faint filled strips behind grouped nodes
- subtle lane labels in display or mono typography
- visible but soft lane boundaries

### 6. Details Panel

The details view should feel like a study sheet:

- title and short summary first
- metadata chips second
- linked dependencies and dependents as navigable references
- optional sections for deliverables, notes, references, reuse candidates, and estimates

## Visual Encodings

### Default Mode

- neutral specimen cards
- moss selection highlight
- muted edges

### Status Mode

- `planned`: water
- `ready`: moss
- `blocked`: petal
- `in_progress`: pollen
- `done`: deep moss
- `future`: iron-lilac

### Lane Mode

Lane colors should be authored per plan when available, but tinted through the atlas palette so they still feel native to the system.

### Metric Mode

Metrics should use:

- color ramp from lichen to bark-red for pressure
- node size scaling with a restrained range

Avoid dramatic bubble-chart inflation. Size changes should remain readable in a graph context.

## Dark Theme

Dark mode should become a nocturne greenhouse rather than a generic black UI:

- dark moss canopy background
- lichen and dew highlights
- muted mineral grid
- preserved paper-like panel layering through translucent deep-green surfaces

The dark theme is already defined in the CSS token file and should be treated as a first-class mode, not an afterthought inversion.

## Recommended Component Recipes

### App Shell

```tsx
<main className="atlas-page atlas-noise">
  <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.6fr)_420px]">
    <section className="atlas-panel-strong atlas-noise p-4 lg:p-6">
      {/* plan header + graph */}
    </section>
    <aside className="atlas-panel p-4 lg:p-5">
      {/* details + analysis */}
    </aside>
  </div>
</main>
```

### Search Field

```tsx
<label className="block">
  <span className="atlas-kicker mb-2 block">Search the plan</span>
  <input
    className="atlas-field atlas-field-focus"
    placeholder="Search title, tag, lane, or note"
  />
</label>
```

### Filter Chip

```tsx
<button className="atlas-chip hover:border-border-strong">
  API
</button>

<button className="atlas-chip atlas-chip-active">
  Blocked
</button>
```

### Primary Action

```tsx
<button className="atlas-button-primary atlas-field-focus">
  Fit Graph
</button>
```

### Graph Node Card

```tsx
<button className="atlas-node atlas-field-focus text-left">
  <div className="atlas-kicker font-mono">api-auth · seq 07</div>
  <h3 className="atlas-title mt-2 text-[1.35rem]">Stabilize Auth Contract</h3>
  <div className="mt-3 flex flex-wrap gap-2">
    <span className="atlas-chip">API</span>
    <span className="atlas-chip">P0</span>
    <span className="atlas-chip atlas-chip-active">Blocked</span>
  </div>
  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
    <span>3 deps · 4 dependents</span>
    <span className="font-mono">B 0.42</span>
  </div>
</button>
```

## Implementation Guidance

### What to build first

1. theme tokens and base surface utilities
2. graph node card and details panel primitives
3. search/filter control language
4. lane band styling
5. legends and metric badges

### What to avoid early

- decorative illustration assets
- fake leaf icons everywhere
- ornamental borders that reduce graph clarity
- overloading the UI with multiple textures at once

## Design QA Checklist

- Does the screen still feel calm when a lot of data is visible?
- Does the graph remain readable when colors encode data?
- Do lanes read as structural groupings rather than decorative backgrounds?
- Does the details panel feel like a study sheet, not a form?
- Would someone remember the material quality of the interface after one use?

## Recommended Next Move

Use this system as the basis for:

1. a component inventory for the main Task Garden screen
2. the first Tailwind v4 theme file in the actual app scaffold
3. high-fidelity mocks of the graph canvas, filter rail, and details panel
