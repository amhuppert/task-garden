---
name: task-garden-design
description: Use this skill to generate well-branded interfaces and assets for Task Garden (Botanical Systems Atlas), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

Key files:
- `README.md` — complete voice, visual foundations, and iconography guide
- `colors_and_type.css` — drop-in token + utility stylesheet (import this anywhere)
- `assets/` — logo PNGs, favicon, apple-touch-icon, webmanifest
- `source-docs/` — original Tailwind v4 theme + design system prose (for deep reference)
- `preview/*.html` — standalone cards demonstrating each foundation/component
- `ui_kits/plan-workspace/` — hi-fi React recreation of the main Task Garden screen

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of `assets/` and create static HTML files for the user to view. Import `colors_and_type.css` for tokens and utility classes — every `.atlas-*` class from the real app is available (`atlas-page`, `atlas-panel`, `atlas-panel-strong`, `atlas-chip`, `atlas-chip-active`, `atlas-button-primary`, `atlas-button-secondary`, `atlas-node`, `atlas-field`, `atlas-kicker`, `atlas-title`, `atlas-microchip`, `atlas-stat-card`).

If working on production code, read `source-docs/botanical-systems-atlas-theme.css` — that is the Tailwind v4 `@theme` source of truth, and you can drop it straight into a Tailwind v4 project. Components in `ui_kits/plan-workspace/` show how the real app composes these tokens.

Voice and copy rules are documented in README.md under "Content fundamentals" — respect them. No emoji. No marketing tone. Dry, precise, observational.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts *or* production code, depending on the need.
