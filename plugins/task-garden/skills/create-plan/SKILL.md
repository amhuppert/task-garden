---
name: create-plan
description: Use to create or update a Task Garden YAML plan file. Use when the user says "create task garden plan", "mark task garden task as complete", or  anything related to Task Garden.
---

# Create Task Garden Plan

You are an interactive plan builder that helps the user create a valid Task Garden YAML plan file through a conversational Q&A workflow. Your output is a `.yaml` file that conforms exactly to the Task Garden plan schema (version 1).

## Workflow

### Step 1: Gather Project Context

Ask the user about their project. You need at minimum:

- **Project name** — becomes the `title`; derive a slug for `plan_id` (lowercase, hyphens/underscores, starts with alphanumeric)
- **Summary** — one or two sentences describing the project's goal
- **Lanes** — how the work is organized (e.g., "backend", "frontend", "infra"); each needs an `id` (slug) and a `label`
- **Work items** — the actual tasks; for each you need a title, summary, lane assignment, and dependencies

If the user has already done planning work (e.g., with the `/planning` skill), use that context rather than re-asking questions they've already answered.

### Step 2: Build the Work Items

For each work item, collect or infer:

- `id` — a slug (e.g., `setup-database`, `auth-api`)
- `title` — short human-readable name
- `summary` — what this item delivers
- `lane` — which lane it belongs to (must reference an existing lane id)
- `status` — one of: `planned`, `ready`, `blocked`, `in_progress`, `done`, `future`
- `priority` — one of: `p0`, `p1`, `p2`, `p3`, `nice_to_have`
- `depends_on` — list of work item ids this depends on (can be empty)

Optional fields you can ask about if the user wants more detail:

- `tags` — cross-cutting labels (slug format, may contain `/`)
- `estimate` — `{ value: <positive number>, unit: "hours" | "days" | "points" }`
- `deliverables` — list of concrete outputs
- `links` — list of `{ label, href }` where href is an http(s) URL or a file path resolved relative to the plan file's parent directory
- `notes` — freeform context
- `reuse_candidates` — list of existing code/libraries to consider

### Step 3: Validate Before Writing

Before generating the YAML, mentally check all integrity rules:

1. **No duplicate lane IDs** — every lane `id` must be unique
2. **No duplicate work item IDs** — every work item `id` must be unique
3. **Lane references exist** — every work item's `lane` must match an existing lane `id`
4. **Dependency references exist** — every entry in `depends_on` must match an existing work item `id`
5. **No self-dependencies** — a work item cannot depend on itself
6. **No duplicate dependencies** — each `depends_on` entry must be unique within the item
7. **No cycles** — the dependency graph must be a DAG (directed acyclic graph)

If any rule would be violated, fix the issue or ask the user how to resolve it before writing the file.

### Step 4: Write the File

Generate the YAML and write it using the Write tool. Ask the user where they want the file written; the default is the current working directory. Set `last_updated` to today's date.

**Filename**: use the `.taskgarden.yaml` suffix (e.g., `<plan_id>.taskgarden.yaml`). Editors that have the Task Garden JSON Schema wired up — see `schemas/task-garden-plan.schema.json` in the repo — match on this suffix to provide completions, hover docs, and validation while editing. A plain `.yaml` file still loads at runtime, but loses editor support.

The plan is loaded at runtime via `taskgarden <path-to-plan.yaml>`, and any file references in the plan resolve relative to that file's parent directory, so place referenced files nearby.

## Schema Reference

The plan file must conform exactly to this structure:

```yaml
version: 1                    # Always 1 (literal)
plan_id: my-project           # Slug: lowercase alphanumeric, hyphens, underscores; starts with alphanumeric
title: My Project Plan        # Non-empty string
last_updated: 2026-04-05      # YYYY-MM-DD format
summary: >                    # Non-empty string
  A description of the project.
references:                   # Optional, defaults to []
  - label: Some Doc           # Non-empty string
    href: docs/overview.md    # http(s) URL or file path relative to the plan file's directory (no path traversal)

lanes:                        # At least 1 lane required
  - id: backend               # Slug format
    label: Backend             # Non-empty string
    description: Server-side   # Optional, non-empty string
    color: "#4a90d9"           # Optional, non-empty string

work_items:                   # At least 1 work item required
  - id: setup-db              # Slug format
    title: Set Up Database     # Non-empty string
    summary: Create schema     # Non-empty string
    lane: backend              # Must reference existing lane id
    status: planned            # planned | ready | blocked | in_progress | done | future
    priority: p0               # p0 | p1 | p2 | p3 | nice_to_have
    depends_on: []             # List of existing work item ids; no self-refs, no dupes, no cycles
    tags: []                   # Optional; slug format, may contain /
    estimate:                  # Optional
      value: 2                 # Positive number
      unit: days               # hours | days | points
    deliverables: []           # Optional; list of non-empty strings
    reuse_candidates: []       # Optional; list of non-empty strings
    links:                     # Optional
      - label: Migration Guide # Non-empty string
        href: https://example.com/guide  # http(s) URL or file path relative to the plan file's directory
    notes: Some extra context  # Optional, non-empty string
```

### ID Format (Slug)

All `id` fields must match: `^[a-z0-9][a-z0-9_-]*$`

- Starts with a lowercase letter or digit
- Contains only lowercase letters, digits, hyphens, underscores
- Examples: `setup-db`, `auth_api`, `v2-migration`

### Tag Format

Tags follow slug format but also allow `/`: `^[a-z0-9][a-z0-9_/-]*$`

- Examples: `schema`, `testing`, `api/auth`

### Reference Target Format

The `href` field in links and references must be one of:

- **HTTP(S) URL**: starts with `http://` or `https://`
- **Plan-relative file path**: any safe relative file path, including dot-prefixed names and extensionless files. It must not be absolute, contain URL schemes, contain `..` path segments, or end with a path separator. Paths are resolved by the Task Garden CLI relative to the **plan file's parent directory** at view time — place referenced files alongside (or in subdirectories of) the plan YAML so they resolve correctly.
  - Valid: `docs/overview.md`, `memory-bank/notes.md`, `.taskgarden-notes.md`, `.kiro/specs/design.md`, `docs/README`
  - Invalid: `../secret.md`, `/etc/passwd`, `docs/`, `ftp://example.com/file`

## Example Plan

Here is a complete, valid plan file for reference:

```yaml
version: 1
plan_id: web-app-v1
title: Web Application V1
last_updated: 2026-04-05
summary: >
  Initial implementation of a web application with user authentication,
  a product catalog, and a basic admin dashboard.
references:
  - label: Product Requirements
    href: docs/requirements.md
  - label: Design Mockups
    href: https://figma.com/file/abc123

lanes:
  - id: backend
    label: Backend
    description: API server, database, and authentication
  - id: frontend
    label: Frontend
    description: React UI components and pages
  - id: infra
    label: Infrastructure
    description: Deployment, CI/CD, and monitoring

work_items:
  - id: db-schema
    title: Database Schema
    summary: Design and implement the initial database schema for users and products.
    lane: backend
    status: done
    priority: p0
    depends_on: []
    tags:
      - database
      - schema
    estimate:
      value: 2
      unit: days
    deliverables:
      - Migration files
      - Seed data script

  - id: auth-api
    title: Authentication API
    summary: JWT-based authentication with login, registration, and token refresh endpoints.
    lane: backend
    status: in_progress
    priority: p0
    depends_on:
      - db-schema
    tags:
      - auth
      - api
    estimate:
      value: 3
      unit: days
    links:
      - label: JWT Best Practices
        href: https://auth0.com/docs/secure/tokens/json-web-tokens

  - id: product-api
    title: Product Catalog API
    summary: CRUD endpoints for products with search and filtering.
    lane: backend
    status: planned
    priority: p0
    depends_on:
      - db-schema
    tags:
      - api
      - catalog

  - id: app-shell
    title: Application Shell
    summary: React app with routing, layout, and auth context.
    lane: frontend
    status: planned
    priority: p0
    depends_on:
      - auth-api
    tags:
      - ui
      - layout

  - id: product-ui
    title: Product Catalog UI
    summary: Product listing page with search, filters, and detail view.
    lane: frontend
    status: planned
    priority: p1
    depends_on:
      - app-shell
      - product-api
    tags:
      - ui
      - catalog

  - id: admin-dashboard
    title: Admin Dashboard
    summary: Basic admin interface for managing products and viewing user stats.
    lane: frontend
    status: future
    priority: p2
    depends_on:
      - app-shell
      - product-api
    tags:
      - ui
      - admin

  - id: ci-pipeline
    title: CI Pipeline
    summary: GitHub Actions workflow for linting, testing, and building on every PR.
    lane: infra
    status: planned
    priority: p1
    depends_on: []
    tags:
      - ci
      - automation
    estimate:
      value: 1
      unit: days

  - id: deploy-staging
    title: Staging Deployment
    summary: Automated deployment to staging environment on merge to main.
    lane: infra
    status: planned
    priority: p1
    depends_on:
      - ci-pipeline
    tags:
      - deployment
      - staging
```

## Important Rules

- Always set `version: 1` — this is a literal, not a variable
- Set `last_updated` to today's date in `YYYY-MM-DD` format
- Every plan must have at least 1 lane and at least 1 work item
- Default `depends_on`, `tags`, `deliverables`, `reuse_candidates`, and `links` to empty arrays `[]` when not provided
- Do not invent dependencies the user didn't mention — ask if you're unsure
- If the user describes a cycle (A depends on B, B depends on A), flag it and ask how to resolve it
- Write the file with the Write tool; suggest a filename like `<plan_id>.taskgarden.yaml` so editors pick up the JSON Schema for completions and validation
