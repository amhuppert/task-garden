# Session Focus

## Objective

Create a Claude Code plugin named `task-garden` that's distributed alongside the Task Garden app and provides AI resources for working with Vaskard. Initial scope: two skills — one for planning guidance and one for creating a conformant YAML plan file.

## Detailed Requirements

### Plugin Structure
- Plugin lives at `plugins/task-garden/` in the repo root
- Standard Claude Code plugin format with `.claude-plugin/plugin.json` manifest
- Two skills in `skills/` subdirectories, each with a `SKILL.md`

### Skill 1: Planning
- Brainstorming/consulting skill that helps users think through their project plan
- Guides decomposition into lanes, work items, dependencies, priorities, and tags
- Focuses on structural reasoning — identifying roots, leaves, dependency chains, and potential bottlenecks before committing to a file
- Does not produce the YAML file itself; that's the create-plan skill's job

### Skill 2: Create Plan File
- Interactive Q&A workflow that gathers project details and generates a valid Task Garden YAML plan file
- Must produce output conforming to the `TaskGardenPlanSchema` Zod schema (version: 1)
- Schema constraints the skill must enforce:
  - `plan_id`: slug format (lowercase alphanumeric, hyphens, underscores; starts with alphanumeric)
  - `last_updated`: YYYY-MM-DD date format
  - `lanes`: at least 1, each with slug `id` and `label`
  - `work_items`: at least 1, each with slug `id`, `title`, `summary`, `lane` (must reference existing lane), `status` (planned|ready|blocked|in_progress|done|future), `priority` (p0|p1|p2|p3|nice_to_have)
  - `depends_on`: references must exist, no self-dependencies, no duplicates, no cycles (must form a DAG)
  - `estimate`: optional, positive number with unit (hours|days|points)
  - `links.href`: http(s) URLs or safe relative file paths (no path traversal)
  - `references`: same link format as work item links
- Should include an example YAML plan for Claude to reference

### Distribution
- Plugin is checked into the repo and distributed alongside the app
- No external dependencies or MCP servers needed for initial scope

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin name | `task-garden` | Matches the repo/project name |
| Plugin path | `plugins/task-garden/` | Clean separation from app code; `plugins/` is a natural directory for bundled plugins |
| Skill count | Two separate skills | Planning guidance and file generation are distinct concerns with different interaction patterns |
| Plan creation workflow | Interactive Q&A → YAML | Lets the user describe their project conversationally; Claude asks clarifying questions and produces the file |
| Schema reference | Embedded in SKILL.md | Plugins can't import TypeScript; schema rules must be documented as prose/examples in the skill prompt |

## Implementation Approach

1. **Scaffold plugin directory**: Create `plugins/task-garden/.claude-plugin/plugin.json` with name, version, description
2. **Write planning skill**: `plugins/task-garden/skills/planning/SKILL.md` — structured prompt guiding project decomposition (lanes, work items, dependencies, priorities)
3. **Write create-plan skill**: `plugins/task-garden/skills/create-plan/SKILL.md` — interactive Q&A prompt with full schema reference, validation rules, and example YAML
4. **Validate**: Use plugin-validator agent to verify structure and correctness

Red-green TDD applies where testable (plugin validation checks), but skills are primarily prompt files validated by structural inspection.

## Relevant Patterns

### Plan Schema (source of truth)
- **Schema file**: `src/lib/plan/task-garden-plan.schema.ts` — Zod schema with `checkIntegrity()` for cross-record validation (duplicate IDs, missing lanes, missing dependencies, self-dependencies, cycles via DFS)
- **Example plan**: `src/plans/task-garden-v1.yaml` — production example with 3 lanes, 14 work items, estimates, links, and complex dependency chains
- **Processing pipeline**: `src/lib/plan/plan-processing-pipeline.ts` — three-stage: YAML parse → schema validate → graph analysis

### Existing Claude Code Configuration
- `.claude/commands/kiro/` — existing slash commands for spec-driven workflow (not a plugin, just project-local commands)
- No existing plugins in the repo; this will be the first

### Project Conventions
- Feature-oriented organization with colocated code
- Slug-based IDs throughout (lowercase, hyphens, underscores)
- YAGNI — no speculative features or over-engineering
- Zod for all boundary validation
- Biome for formatting/linting
