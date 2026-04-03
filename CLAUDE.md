# Task Garden

Single-user planning tool for software development projects. Loads YAML project plans, validates them as DAGs, and renders an interactive dependency graph. V1 is read-only.

**Stack**: TypeScript, React, Vite, Bun, Tailwind CSS, React Flow, graphology, Zustand, Zod
**Dev commands**: `bun run dev` | `bun test` | `bun run lint` | `bun run typecheck` | `bun run build`

## Steering

At conversation start, read all files in `.kiro/steering/` before beginning work. These contain project-wide rules and context.

## Specifications

- Specs live in `.kiro/specs/`
- Use `/kiro:spec-status [feature-name]` to check progress

## Spec-Driven Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements -> Design -> Tasks -> Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- All Markdown written to spec files must use the target language configured in spec.json
