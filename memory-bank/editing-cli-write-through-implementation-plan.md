# Editing + CLI Write-Through Implementation Plan

## Overview

Task Garden V2 keeps `plan.taskgarden.yaml` as the single source of truth and adds inline editing of all authored fields. Each editable field follows a **hover-reveal + save-on-blur** model: editing affordances appear on hover/focus, edits commit per-field on blur, and the local CLI re-validates with Zod before writing the YAML atomically. The existing read pipeline (file watcher → `planState` → SSE → `usePlanProcessing`) is unchanged; a new write pipeline is added alongside it.

The CLI uses the `yaml` package Document API so that comments and ordering survive round-trips. Echo suppression is two-layered (per-operation ID + last-self-written text). Concurrency is serialized by an in-process async mutex keyed by `planAbsPath`. Validation failures roll back optimistic drafts to the last-good value and surface centralized Atlas-voice copy in toasts.

This plan is executed in **five sequenced slices**. Slice 1 lands the CLI write boundary plus a steering amendment. Slice 2 lands the client edit infrastructure. Slices 3–5 progressively replace read-only cells with editable ones, then add the creation flow.

## Architecture

### Layered Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│  READ PATH (unchanged)                                             │
│                                                                    │
│  YAML file ─chokidar─▶ planState.setSource ──SSE──▶ fetchPlanState │
│                                                                  │ │
│                              ┌───────────────────────────────────┘ │
│                              ▼                                     │
│             usePlanProcessing  (parse YAML → Zod → analysis)       │
│                              │                                     │
│                              ▼                                     │
│              PlanDetailsPanel renders read-only fields             │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  WRITE PATH (new)                                                  │
│                                                                    │
│   Field blur  ─▶ useFieldDraft.commit ─▶ editStore.commitField     │
│                                                  │                 │
│                                                  ▼                 │
│                          patchPlan(target, value, opId, baseRev)   │
│                                                  │                 │
│            ┌─── PATCH /api/plan ─────────────────┘                 │
│            ▼                                                       │
│   editRoute → mutex.acquire(planAbsPath)                           │
│              → planWriter.applyPatch (Document API)                │
│              → re-parse with TaskGardenPlanSchemaService           │
│              → atomic write (tmp → rename)                         │
│              → planState.markSelfWrite(newText)  (revision++)      │
│              → release mutex                                       │
│                                                                    │
│   Watcher reads file → planState.setSourceFromWatcher              │
│              → if text == lastSelfWrittenText → suppress           │
│              → else bump revision (external edit) → SSE            │
└────────────────────────────────────────────────────────────────────┘
```

### Boundary Rules

- The CLI is the **sole writer** to the YAML file, but **not the sole editor of the file on disk**: the user may still edit the file in an external editor; the watcher continues to surface those changes via SSE.
- Drafts live in `editStore` only. There is **no global overlay** layered onto the validated snapshot.
- The processing snapshot (`PlanAnalysisSnapshot`) remains the trusted source for read consumers; nothing reads through the draft layer.
- `last_updated` is **user-owned**; the writer never auto-bumps it.

## Technology Stack

| Concern | Package | Version | Notes |
|---|---|---|---|
| YAML Document API | `yaml` | ^2.7.1 (already installed) | Use `parseDocument`, `toString`, `getIn`, `setIn`, `addIn`, `deleteIn`, `Scalar`, `YAMLSeq`, `YAMLMap` |
| Schema validation | `zod` v4 (already installed) | — | Reuse `TaskGardenPlanSchemaService` unchanged |
| State (drafts) | `zustand` ^5 (already installed) | — | New `edit.store.ts` |
| Server runtime | Bun (already installed) | — | `Bun.serve` already handles fetch-style PATCH bodies |
| File watcher | `chokidar` ^4 (already installed) | — | Already debounced with `awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }` |
| UUID generation | `crypto.randomUUID()` (built-in) | — | Used for operationId; available in Node, Bun, and modern browsers |
| Atomic file write | `node:fs/promises` `writeFile` + `rename` | — | tmp filename pattern: `${planAbsPath}.tmp-${process.pid}-${Date.now()}` |

No new dependencies are added.

## File Structure

```
/cli
  plan-writer.ts                    # NEW
  plan-writer.test.ts               # NEW
  edit-routes.ts                    # NEW (PATCH /api/plan handler)
  edit-routes.test.ts               # NEW
  mutex.ts                          # NEW (in-process async mutex)
  mutex.test.ts                     # NEW
  routes.ts                         # MODIFIED (dispatch PATCH to edit-routes)
  plan-state.ts                     # MODIFIED (self-write tracking)
  plan-state.test.ts                # MODIFIED (cover new APIs)
  file-watcher.ts                   # MODIFIED (use setSourceFromWatcher)
  main.ts                           # MODIFIED (pass planWriter into startServer)
  server.ts                         # MODIFIED (accept planWriter dep)
  shared/
    patch-schema.ts                 # NEW (Zod schema for PATCH body — shared with client)

/vite-plugins
  taskgarden-plan-server.ts         # MODIFIED (wire planWriter into RouteCtx)

/src/lib/plan
  edit-api-client.ts                # NEW (patchPlan + types)
  edit-api-client.test.ts           # NEW

/src/features/plan-workspace/editing
  edit.store.ts                     # NEW
  edit.store.test.ts                # NEW
  useFieldDraft.ts                  # NEW
  useFieldDraft.test.ts             # NEW
  validation-copy.ts                # NEW (centralized Atlas-voice error text)
  patch-targets.ts                  # NEW (target-builder helpers for type safety)
  EditableTitleCell.tsx             # NEW
  StatusPickerCell.tsx              # NEW
  PriorityPickerCell.tsx            # NEW
  LanePickerCell.tsx                # NEW
  EstimateStepperCell.tsx           # NEW
  TagEditorCell.tsx                 # NEW
  DependencyEditorCell.tsx          # NEW
  SummaryEditorCell.tsx             # NEW
  NotesEditorCell.tsx               # NEW
  StringListEditorCell.tsx          # NEW (deliverables, reuse_candidates)
  LinksEditorCell.tsx               # NEW
  WriteThroughStatusFooter.tsx      # NEW
  FieldSaveIndicator.tsx            # NEW
  ValidationToast.tsx               # NEW
  CreateBar.tsx                     # NEW
  NewItemForm.tsx                   # NEW
  NodeQuickEditPopover.tsx          # NEW
  PlanOverviewEditor.tsx            # NEW
  LaneInlineEditor.tsx              # NEW
  glyphs.tsx                        # NEW (Pencil, Chevron, Close, Plus — single source)
  editing-keyboard.ts               # NEW (N / ⇧N / E / Esc / ↵ binding registration)
  *.test.tsx                        # NEW (alongside each component)

/src/features/plan-workspace
  PlanDetailsPanel.tsx              # MODIFIED (sections now render editable cells)
  PlanDetailsPanel.test.tsx         # MODIFIED (cover edit flows)
  PlanWorkspacePage.tsx             # MODIFIED (mount editing-keyboard, ValidationToast, WriteThroughStatusFooter)
  PlanWorkspacePage.test.tsx        # MODIFIED
  PlanOverviewHeader.tsx            # MODIFIED (InfoPopover content → PlanOverviewEditor)
  WorkItemNode.tsx                  # MODIFIED (open NodeQuickEditPopover on dedicated affordance)

/.kiro/steering
  product.md                        # MODIFIED (slice-1 amendment)
```

## Steering Amendment (lands with Slice 1)

Replace the final line of `.kiro/steering/product.md`:

> ~~V1 is a read-only visualizer. It should make plans easier to understand and compare, not serve as a plan editor.~~

with:

> V1 was a read-only visualizer. V2 enables inline editing of every authored field. Edits commit per-field on blur and round-trip through the local CLI, which re-validates the entire plan with Zod before atomically rewriting `plan.taskgarden.yaml`. The YAML file remains the single source of truth — Task Garden does not introduce a database or editor-only format. Users may still edit the YAML directly in an external editor; the watcher surfaces those changes back into the UI through the existing read pipeline.

## Component Specifications

### CLI: `cli/mutex.ts`

- **Responsibility**: serialize concurrent writes to a single plan file.
- **Interface**:
  ```ts
  export interface AsyncMutex {
    runExclusive<T>(fn: () => Promise<T>): Promise<T>;
  }
  export function createMutex(): AsyncMutex;
  ```
- **Implementation**: chain a tail `Promise<void>`. `runExclusive` appends to the chain and returns a promise resolved by `fn()` after the prior tail settles.
- **Caller pattern** (in edit-routes): one mutex per `planAbsPath`, kept in a `Map<string, AsyncMutex>` for the process lifetime.

### CLI: `cli/plan-writer.ts`

- **Responsibility**: apply a single typed patch to a plan source string, re-validate, return the new source — or a structured failure. No I/O.
- **Interface**:
  ```ts
  export interface PlanWriter {
    apply(currentSource: string, patch: PlanPatch): PlanWriterResult;
  }
  export type PlanWriterResult =
    | { ok: true; nextSource: string }
    | { ok: false; failure:
        | { type: "yaml_parse"; message: string }
        | { type: "validation"; issues: ValidationIssue[] }
        | { type: "target_not_found"; target: PlanPatch["target"] }
        | { type: "invalid_patch"; message: string }
      };
  export function createPlanWriter(
    schemaService: TaskGardenPlanSchemaServiceInterface
  ): PlanWriter;
  export const planWriter: PlanWriter;  // bound to TaskGardenPlanSchemaService
  ```
- **Algorithm**:
  1. `doc = parseDocument(currentSource)`. If `doc.errors.length > 0` → return `yaml_parse`.
  2. Resolve the patch's target node:
     - For `work_item.*`: scan `doc.get("work_items")` (a `YAMLSeq`) for the entry whose `.get("id")` matches `patch.target.id`. Use that index as the path prefix.
     - For `lane.*`: same against `doc.get("lanes")`.
     - For `plan.*`: no lookup needed.
     - For `work_item.create` / `lane.create`: no lookup; append.
     - Not found → return `target_not_found`.
  3. Apply the mutation (specifics per `kind` listed below).
  4. `next = doc.toString()`.
  5. `parsed = schemaService.parse(parseYaml(next))`. If invalid → return `validation`.
  6. Return `{ ok: true, nextSource: next }`.

#### Patch Schema (shared with client via `cli/shared/patch-schema.ts`)

```ts
import { z } from "zod/v4";

export const PlanPatchSchema = z.discriminatedUnion("kind", [
  // Scalar / string-field edits on a work item
  z.object({
    kind: z.literal("work_item.field"),
    target: z.object({ id: SlugSchema }),
    field: z.enum(["title", "summary", "lane", "status", "priority", "notes"]),
    value: z.string().nullable(),  // null = clear (only valid for "notes")
  }),

  // Estimate (object replacement, or unset)
  z.object({
    kind: z.literal("work_item.estimate"),
    target: z.object({ id: SlugSchema }),
    value: z.object({
      value: z.number().positive(),
      unit: z.enum(["hours", "days", "points"]),
    }).nullable(),
  }),

  // Tags (replace whole array — small lists; simpler than add/remove)
  z.object({
    kind: z.literal("work_item.tags"),
    target: z.object({ id: SlugSchema }),
    value: z.array(TagSchema),
  }),

  // depends_on (replace whole array)
  z.object({
    kind: z.literal("work_item.depends_on"),
    target: z.object({ id: SlugSchema }),
    value: z.array(SlugSchema),
  }),

  // String lists (deliverables, reuse_candidates) — replace
  z.object({
    kind: z.literal("work_item.string_list"),
    target: z.object({ id: SlugSchema }),
    field: z.enum(["deliverables", "reuse_candidates"]),
    value: z.array(z.string().min(1)),
  }),

  // Links (replace)
  z.object({
    kind: z.literal("work_item.links"),
    target: z.object({ id: SlugSchema }),
    value: z.array(z.object({
      label: z.string().min(1),
      href: ReferenceTargetSchema,
    })),
  }),

  // Create a new work item (full record)
  z.object({
    kind: z.literal("work_item.create"),
    value: TaskGardenWorkItemSchema,  // reuse existing schema
  }),

  // Plan-level fields
  z.object({
    kind: z.literal("plan.field"),
    field: z.enum(["title", "summary", "last_updated"]),
    value: z.string(),
  }),
  z.object({
    kind: z.literal("plan.references"),
    value: z.array(TaskGardenLinkSchema),
  }),

  // Lane edits
  z.object({
    kind: z.literal("lane.field"),
    target: z.object({ id: SlugSchema }),
    field: z.enum(["label", "description", "color"]),
    value: z.string().nullable(),  // null clears optional description/color
  }),
]);
export type PlanPatch = z.infer<typeof PlanPatchSchema>;
```

**Out of scope for v2 launch** (explicitly excluded from the PATCH union): `work_item.delete`, `lane.delete`, `lane.create`, `work_item.id` rename, `lane.id` rename. These were deferred in design negotiation.

#### Document API operations per patch kind

| Patch kind | Document API call |
|---|---|
| `work_item.field` (notes, value=null) | `doc.deleteIn(["work_items", i, "notes"])` |
| `work_item.field` | `doc.setIn(["work_items", i, field], value)` |
| `work_item.estimate` (value=null) | `doc.deleteIn(["work_items", i, "estimate"])` |
| `work_item.estimate` | `doc.setIn(["work_items", i, "estimate"], value)` |
| `work_item.tags` | `doc.setIn(["work_items", i, "tags"], value)` |
| `work_item.depends_on` | `doc.setIn(["work_items", i, "depends_on"], value)` |
| `work_item.string_list` | `doc.setIn(["work_items", i, field], value)` |
| `work_item.links` | `doc.setIn(["work_items", i, "links"], value)` |
| `work_item.create` | `(doc.get("work_items") as YAMLSeq).add(value)` |
| `plan.field` | `doc.set(field, value)` |
| `plan.references` | `doc.set("references", value)` |
| `lane.field` (value=null on description/color) | `doc.deleteIn(["lanes", i, field])` |
| `lane.field` | `doc.setIn(["lanes", i, field], value)` |

Flow-style sub-mappings (e.g., `estimate: { value: 2, unit: days }`) must be re-emitted in **block style** for consistency. After `setIn`, find the inserted node and call `node.flow = false` if it is a `YAMLMap`.

### CLI: `cli/plan-state.ts` (modified)

Add two methods to `PlanState`:

```ts
markSelfWrite(source: string): void;           // bump revision, set source, record lastSelfWrittenText
setSourceFromWatcher(source: string): void;    // if text === lastSelfWrittenText → clear and skip update;
                                                // else clear and call setSource (external edit)
```

`lastSelfWrittenText` lives as a closure variable inside `createPlanState`. It is cleared whenever it is consumed (either by a matching watcher read or by `setMissing`/`setError`).

`PlanStateSnapshot` shape is **unchanged** — `lastSelfWrittenText` is server-internal and never serialized to clients.

### CLI: `cli/file-watcher.ts` (modified)

Replace `planState.setSource(text)` inside `reload` with `planState.setSourceFromWatcher(text)`. No other changes.

### CLI: `cli/edit-routes.ts`

- **Responsibility**: handle `PATCH /api/plan`. Acquire the mutex, validate the patch body, call `planWriter.apply` against the **current source on disk**, write atomically, call `planState.markSelfWrite`, return the new revision.
- **Interface**:
  ```ts
  export interface EditRouteCtx {
    planAbsPath: string;
    planState: PlanState;
    planWriter: PlanWriter;
    mutexFor: (planAbsPath: string) => AsyncMutex;
    writeFile: (path: string, content: string) => Promise<void>;     // injected for testing
    readFile: (path: string) => Promise<string>;                     // injected for testing
    rename: (from: string, to: string) => Promise<void>;             // injected
    now: () => number;                                                // injected
  }
  export async function handleEditRequest(
    req: Request,
    ctx: EditRouteCtx,
  ): Promise<Response>;
  ```
- **Request validation**:
  - Method must be `PATCH`. Else 405.
  - Body must be JSON with `{ operationId: string, baseRevision?: number, patch: PlanPatch }`.
  - `operationId` must be a non-empty string ≤ 64 chars; if absent → 400 `missing_operation_id`.
  - `patch` is validated with `PlanPatchSchema`; failure → 400 `invalid_patch` with Zod issues.
- **Mutex-protected body**:
  1. Read the file from disk fresh (do NOT trust `planState.source`, which may lag by one tick during writes).
  2. If `baseRevision` is provided and `baseRevision < planState.get().revision`, return 409 with `current_revision`. Client decides whether to rebase or surface a conflict.
  3. `result = planWriter.apply(currentSource, patch)`.
  4. If `result.ok === false`, map failure to a 4xx response (see status table below).
  5. Write `result.nextSource` atomically:
     - tmp path: `${planAbsPath}.tmp-${process.pid}-${now()}`
     - `await writeFile(tmpPath, nextSource)`
     - `await rename(tmpPath, planAbsPath)`
  6. `planState.markSelfWrite(result.nextSource)` (bumps revision).
  7. Return `200 OK` with `{ ok: true, operationId, revision: planState.get().revision }`.
- **Status codes**:

  | Outcome | Status | Body shape |
  |---|---|---|
  | Success | 200 | `{ ok: true, operationId, revision }` |
  | Bad method | 405 | `{ ok: false, error: "method_not_allowed" }` |
  | Missing operationId | 400 | `{ ok: false, error: "missing_operation_id" }` |
  | Invalid patch shape | 400 | `{ ok: false, error: "invalid_patch", zodIssues: [...] }` |
  | Stale base revision | 409 | `{ ok: false, error: "stale_revision", currentRevision, operationId }` |
  | YAML parse error after patch | 422 | `{ ok: false, error: "yaml_parse", message, operationId }` |
  | Validation failure | 422 | `{ ok: false, error: "validation_failed", issues, operationId }` |
  | Target id not found | 422 | `{ ok: false, error: "target_not_found", target, operationId }` |
  | File I/O failure | 500 | `{ ok: false, error: "write_failed", message, operationId }` |

### CLI: `cli/routes.ts` (modified)

- Add a `planWriter`, `mutexFor`, and the io deps fields to `RouteCtx`.
- Dispatch `req.method === "PATCH" && pathname === "/api/plan"` to `handleEditRequest`.
- Existing GET handlers untouched.

### CLI: `cli/server.ts` (modified)

`startServer` accepts `planWriter: PlanWriter` and creates a single `Map<string, AsyncMutex>` shared by all requests in the process. Pass through to `RouteCtx`.

### CLI: `cli/main.ts` (modified)

Construct `planWriter` from the default `planWriter` singleton (which is bound to `TaskGardenPlanSchemaService`). Pass it to `startServer`.

### Vite plugin: `vite-plugins/taskgarden-plan-server.ts` (modified)

Construct the same `planWriter` singleton and pass through `RouteCtx`. Provide a single mutex map. The dev-mode adapter (`writeFetchResponse`) already supports streaming and non-GET bodies via `init.body = Readable.toWeb(req); init.duplex = "half"` — no adapter changes needed.

### Client: `src/lib/plan/edit-api-client.ts`

```ts
export type EditApiSuccess = { ok: true; operationId: string; revision: number };
export type EditApiError =
  | { ok: false; status: number; error: "stale_revision"; currentRevision: number; operationId: string }
  | { ok: false; status: number; error: "validation_failed"; issues: ValidationIssue[]; operationId: string }
  | { ok: false; status: number; error: "yaml_parse"; message: string; operationId: string }
  | { ok: false; status: number; error: "target_not_found"; operationId: string }
  | { ok: false; status: number; error: "write_failed"; message: string; operationId: string }
  | { ok: false; status: number; error: "invalid_patch"; operationId: string }
  | { ok: false; status: number; error: "network"; message: string; operationId: string };

export async function patchPlan(
  patch: PlanPatch,
  opts: { operationId: string; baseRevision?: number; signal?: AbortSignal },
): Promise<EditApiSuccess | EditApiError>;
```

- Catches `fetch` rejections and returns `{ error: "network" }`.
- Never throws.

### Client: `src/features/plan-workspace/editing/edit.store.ts`

Zustand store. **Only stores drafts** — never holds a copy of the validated plan.

```ts
type DraftKey = string;  // e.g. "work_item:plan-schema:title", "work_item:plan-schema:tags"

interface EditStateValue {
  drafts: Record<DraftKey, unknown>;             // raw draft value, type known by caller
  inflight: Record<DraftKey, string>;            // operationId per key currently writing
  lastWriteResult:
    | { phase: "idle" }
    | { phase: "saving"; key: DraftKey; operationId: string }
    | { phase: "saved";  key: DraftKey; at: number }
    | { phase: "error";  key: DraftKey; copy: ValidationCopy; canRetry: boolean };
  recentSelfOps: { operationId: string; at: number }[];  // bounded ring buffer, len ≤ 16
}

interface EditActions {
  setDraft(key: DraftKey, value: unknown): void;
  clearDraft(key: DraftKey): void;
  beginCommit(key: DraftKey, operationId: string): void;
  finishCommit(key: DraftKey, result: EditApiSuccess | EditApiError): void;
  rememberSelfOp(operationId: string): void;
  hasSeenSelfOp(operationId: string): boolean;
  resetErrorFor(key: DraftKey): void;
}
```

Selectors exported alongside.

### Client: `src/features/plan-workspace/editing/useFieldDraft.ts`

The single contract used by every editable field.

```ts
export interface UseFieldDraftOptions<T> {
  /** Stable identity for this field (e.g. `work_item:plan-schema:title`). */
  key: DraftKey;
  /** The current canonical value from the validated snapshot. */
  committedValue: T;
  /** Builder for the PATCH target. Captured by closure; not re-evaluated on every render. */
  buildPatch: (next: T) => PlanPatch;
  /** Current plan revision; included as baseRevision in the PATCH. */
  baseRevision: number;
}

export interface UseFieldDraftReturn<T> {
  value: T;                       // = draft ?? committedValue
  isDirty: boolean;               // draft !== committedValue
  isSaving: boolean;
  hasError: boolean;
  errorCopy: ValidationCopy | null;
  setDraft: (next: T) => void;
  commit: () => Promise<void>;    // called on blur / explicit commit
  rollback: () => void;
  retry: () => Promise<void>;
}

export function useFieldDraft<T>(opts: UseFieldDraftOptions<T>): UseFieldDraftReturn<T>;
```

**Behavior**:
- If `setDraft(next)` is called with `next === committedValue`, the draft is removed (idempotent revert).
- `commit()` short-circuits if `!isDirty` and `phase !== "error"`.
- On commit: generate `operationId = crypto.randomUUID()`, call `editStore.beginCommit`, call `patchPlan`, call `editStore.finishCommit`. On success, the draft is cleared (the next snapshot from SSE will surface the new committed value).
- On `409 stale_revision`: silent rebase — retry once with the new revision baked in. If it fails again → surface conflict (route to `phase: "error"`).
- On `422 validation_failed` / `target_not_found` / `yaml_parse`: rollback the draft to `committedValue` and set `phase: "error"` with mapped Atlas-voice copy from `validation-copy.ts`.
- On `network`: keep the draft (do not rollback), set `phase: "error"` with `canRetry: true`. The footer footer shows "Write failed — CLI offline".

### Client: `src/features/plan-workspace/editing/validation-copy.ts`

```ts
export type ValidationCopy = { title: string; detail: string; code: string };
export const VALIDATION_COPY: Record<string, ValidationCopy>;
// keys: cycle_detected, self_dependency, duplicate_dependency, missing_dependency,
// missing_lane, duplicate_id, yaml_parse, target_not_found, network, write_failed,
// and a default fallback.
```

Copy authored in Atlas voice (e.g., `cycle_detected → { title: "Would create a cycle", detail: "Adding this dependency closes a loop." }`).

### Client: `src/features/plan-workspace/editing/patch-targets.ts`

Type-safe builders so call sites never construct PlanPatch literals by hand:

```ts
export const patchTargets = {
  workItemField: (id: string, field: WorkItemFieldKey, value: string | null) => PlanPatch,
  workItemEstimate: (id: string, value: TaskGardenEstimate | null) => PlanPatch,
  workItemTags: (id: string, value: string[]) => PlanPatch,
  workItemDepsOn: (id: string, value: string[]) => PlanPatch,
  workItemStringList: (id: string, field: "deliverables" | "reuse_candidates", value: string[]) => PlanPatch,
  workItemLinks: (id: string, value: TaskGardenLink[]) => PlanPatch,
  workItemCreate: (value: TaskGardenWorkItem) => PlanPatch,
  planField: (field: "title" | "summary" | "last_updated", value: string) => PlanPatch,
  planReferences: (value: TaskGardenLink[]) => PlanPatch,
  laneField: (id: string, field: "label" | "description" | "color", value: string | null) => PlanPatch,
};
```

### Client: editable cell components

Each cell wraps the read-only design from `PlanDetailsPanel.tsx` and grows hover-reveal + `useFieldDraft` integration. All share the same prop shape:

```ts
interface FieldCellProps {
  workItemId: string;
  committedValue: T;     // current value from snapshot
  baseRevision: number;
}
```

| Cell | Source (JSX prototype) | Patch builder | Editing surface |
|---|---|---|---|
| `EditableTitleCell` | edit-components.jsx `EditableTitle` (l.60) | `workItemField(id, "title", value)` | contentEditable; commit on blur or `Enter` |
| `StatusPickerCell` | `PickerChip` + `StatusPopover` (l.91, l.173) | `workItemField(id, "status", value)` | Floating popover via `@floating-ui/react` (already a dep) |
| `PriorityPickerCell` | `PriorityPopover` (l.186) | `workItemField(id, "priority", value)` | 2-col grid popover |
| `LanePickerCell` | `LaneSegmented` (l.233) — scaling dropdown | `workItemField(id, "lane", value)` | Floating popover; option list |
| `EstimateStepperCell` | `EstimateStepper` (l.310) | `workItemEstimate(id, { value, unit: "days" })` | +/- buttons; 0.5-day increment; clears on `value === 0` |
| `TagEditorCell` | `TagEditor` (l.360) | `workItemTags(id, tags)` | Chip-input; on blur of input, append tag (validated via `TagSchema`); × button removes; whole array sent |
| `DependencyEditorCell` (upstream) | `DependencyEditor derived=false` (l.469) | `workItemDepsOn(id, ids)` | Typeahead picker filtered by all work items. Show inline `DepPickerError` from validation-copy when a candidate would create a cycle, self-link, or duplicate (computed client-side from snapshot before sending) |
| `DependencyEditorCell` (dependents) | `DependencyEditor derived=true` (l.469) | n/a — `Branch new dependent` opens `NewItemForm` with `depends_on=[currentId]` prefilled | derived; no remove affordance |
| `SummaryEditorCell` | `SummaryEditor` (l.1151) | `workItemField(id, "summary", value)` | contentEditable; commit on blur |
| `NotesEditorCell` | `NotesEditor` (l.1188) | `workItemField(id, "notes", value)` (empty string → patch with `value=null` to clear) | multiline contentEditable |
| `StringListEditorCell` | `StringListEditor` (l.1226) | `workItemStringList(id, "deliverables" | "reuse_candidates", value)` | per-item contentEditable + × + "Add" button |
| `LinksEditorCell` | `LinksEditor` (l.1289) | `workItemLinks(id, value)` | Two fields per row (label, href); commit on blur of row |
| `WriteThroughStatusFooter` | `WriteThroughStatus` (l.649) | n/a (consumes `lastWriteResult`) | Bottom of right panel; ⟂ pulsing dot when saving |
| `FieldSaveIndicator` | `FieldSaveIndicator` (l.695) | n/a | Inline kicker-row badge: saving / saved (then auto-hides at 1.4s) |
| `ValidationToast` | `dep-cycle-toast` artboard (artboards.jsx l.203) | n/a (consumes `lastWriteResult` errors) | Top-right toast, 6s auto-dismiss, manual close, code in mono kicker |
| `CreateBar` | `CreateBar` (l.726) | n/a | Footer used by `NewItemForm` only |
| `NewItemForm` | `NewItemForm` (l.1078) | `workItemCreate(value)` | Single explicit commit via "Add to plan"; pre-validates locally with `TaskGardenWorkItemSchema` |
| `NodeQuickEditPopover` | `NodeQuickEdit` (l.976) | reuses StatusPickerCell + PriorityPickerCell + EditableTitleCell | Anchored above the selected node in `PlanGraphCanvas` via floating-ui |
| `PlanOverviewEditor` | `PlanOverviewEditor` (l.1461) | `planField`, `planReferences` | Reached via existing `InfoPopoverButton` in `PlanWorkspacePage`; replaces the read-only `PlanOverviewHeader` body |
| `LaneInlineEditor` | `LaneInlineEditor` artboard | `laneField` | Reached from `PlanToolbar`'s lane chips (extend chip with a quiet pencil affordance on hover) |

### Glyphs: `editing/glyphs.tsx`

Single canonical implementation of `PencilGlyph`, `ChevronGlyph`, `CloseGlyph`, `PlusGlyph`. Same SVG markup as the JSX prototype (single-stroke, currentColor, no icon library).

### Keyboard model: `editing/editing-keyboard.ts`

Uses `react-hotkeys-hook` (already a dependency). Registered globally in `PlanWorkspacePage`:

| Key | Scope | Action |
|---|---|---|
| `N` | Page (when no input focused) | Open `NewItemForm`, lane = currently-scoped lane (or first lane if no scope) |
| `Shift+N` | Page, selection present | Open `NewItemForm` with `depends_on=[selectedWorkItemId]` prefilled |
| `E` | Page, selection present | Open right panel `details` tab, focus the title cell |
| `Esc` | While editing | Rollback active draft (call `useFieldDraft.rollback`) |
| `Enter` | While editing single-line field | Commit |

`E` and `N` are suppressed when a contentEditable region or input has focus.

### Footer & Toast Mount

`PlanWorkspacePage` mounts both:

- `<WriteThroughStatusFooter />` inside the right panel, below the tabpanel content
- `<ValidationToast />` outside the panel layout, fixed top-right via floating-ui's `FloatingPortal`

## API Contract Summary

### `PATCH /api/plan`

**Request body**:
```json
{
  "operationId": "f7b2…",        // required — client-generated UUIDv4
  "baseRevision": 17,            // optional — last revision client has applied
  "patch": { "kind": "work_item.field", "target": {"id":"plan-schema"}, "field": "status", "value": "in_progress" }
}
```

**Success response** (200):
```json
{ "ok": true, "operationId": "f7b2…", "revision": 18 }
```

**Failure response** (4xx/5xx): see status code table in `cli/edit-routes.ts` spec.

**Headers**: identical to existing JSON routes — `content-type: application/json; charset=utf-8`, `x-content-type-options: nosniff`. Host allow-list enforcement is unchanged.

### `GET /api/plan`, `GET /api/events`, `GET /api/document`

Unchanged.

## Echo Suppression

A self-initiated write follows this sequence:

1. Client generates `operationId`, sends PATCH.
2. CLI writes file, calls `planState.markSelfWrite(nextSource)` → revision bumps; SSE pushes new snapshot to all subscribers including this client.
3. Client receives PATCH `ok: true, revision: N`. Records `operationId` in `editStore.rememberSelfOp`. Clears the draft.
4. SSE delivers `revision: N` snapshot. Existing read-pipeline applies it. Since draft was already cleared in step 3, no flicker.
5. Chokidar fires `change` for the same write. Watcher reads the file. `planState.setSourceFromWatcher(text)` notes `text === lastSelfWrittenText`, clears `lastSelfWrittenText`, and **does not bump revision**. No second SSE event.

For external edits:
1. User saves the file in an editor.
2. Chokidar fires. Watcher reads. `setSourceFromWatcher` sees the text differs from `lastSelfWrittenText` (which is either `null` or stale), bumps revision, emits SSE.
3. The client's draft (if any) is preserved — `useFieldDraft` shows it as still dirty against the new `committedValue`, and the user can re-commit, rollback, or continue editing.

## Concurrency

- One in-process mutex per `planAbsPath`.
- All PATCH handlers acquire it before reading the disk or writing.
- Mutex blocks parallel writes from multiple browser tabs, parallel HMR requests during dev, and any other in-process client.
- External writers (user's editor) are not coordinated with the mutex; the watcher path absorbs them.
- A write that arrives while another is in-flight blocks naturally on the mutex; if the queued write carries a stale `baseRevision` once it acquires the lock, it returns 409 and the client handles silent rebase (one retry) or surfaces conflict.

## Atomic Write

```
tmp = `${planAbsPath}.tmp-${process.pid}-${now()}`
await writeFile(tmp, nextSource, "utf8")
await rename(tmp, planAbsPath)   // POSIX rename is atomic on same fs
```

A crash mid-write leaves only the orphan tmp file; the original is untouched. Tmp orphans are not cleaned on boot in v2 (deferred).

## YAML Preservation Rules

- Use `parseDocument` + `doc.toString()` to preserve comments, ordering, and quoting style.
- For new list entries (`work_item.create`), set the inserted `YAMLMap.flow = false` and append to the end of `work_items`.
- Never rewrite unrelated nodes: `setIn`/`addIn` mutate in place.
- Do not strip blank lines or comments.
- `last_updated` is not auto-bumped — the user controls it via `PlanOverviewEditor`.

## UX States (canonical)

| State | Visual cue |
|---|---|
| Field idle (hover) | 1px dashed soft border; "◂ hover" kicker hint on first reveal |
| Field focused | 1px moss border; lichen wash; caret active |
| Field dirty (draft != committed) | pollen dot next to kicker |
| Field saving | inline `FieldSaveIndicator` "Saving" (water dot, pulsing) |
| Field saved | inline `FieldSaveIndicator` "Saved" (status-done dot + ✓), auto-clears at 1.4s |
| Field error (validation) | `ValidationToast` top-right (auto-rolled back); footer remains synced |
| CLI offline | Footer "Write failed — CLI offline" + Retry; draft preserved (NOT rolled back) |

## Testing Requirements

### CLI

- **`cli/mutex.test.ts`**: parallel calls run serially; a thrown error in `fn` releases the lock.
- **`cli/plan-writer.test.ts`**:
  - happy path for each `kind` (asserts both that `nextSource` differs from input and that comments are preserved)
  - validation failure for: cycle, self-dep, duplicate dep, missing dep, missing lane, duplicate id
  - target_not_found for unknown work-item / lane id
  - yaml_parse for malformed input
  - estimate `value=null` removes the `estimate` key
  - notes `value=null` removes the `notes` key
- **`cli/edit-routes.test.ts`** (uses in-memory injected I/O):
  - 200 on happy path
  - 405 on non-PATCH methods to `/api/plan`
  - 400 on missing operationId / invalid patch
  - 409 with `currentRevision` when `baseRevision` is stale
  - 422 issues map for each validation failure
  - 500 on write failure
  - Mutex serializes two simultaneous PATCHes (assert tmp filenames don't collide because of `now()` injection)
  - After success, `planState.markSelfWrite` was called with `nextSource`
- **`cli/plan-state.test.ts`** (extended): `markSelfWrite` records `lastSelfWrittenText`; `setSourceFromWatcher` with matching text does not bump revision, with differing text it does.
- **`cli/file-watcher.test.ts`** (extended): self-write echo (mark + setSourceFromWatcher) results in only one revision bump.

### Client

- **`src/lib/plan/edit-api-client.test.ts`**: mocks `fetch`; verifies request shape, success parsing, each error code, network failure.
- **`edit.store.test.ts`**: draft set/clear, `beginCommit/finishCommit` flow, `rememberSelfOp` ring buffer bounded at 16, `resetErrorFor` clears `phase: error`.
- **`useFieldDraft.test.ts`**: setDraft → isDirty; commit calls `patchPlan`; success clears draft; 422 rolls back to committedValue and surfaces validation copy; 409 retries once; network error preserves draft + flags `canRetry`.
- **Editable cell tests**: render each cell, simulate hover (reveal), focus, blur, assert the right `PlanPatch` was sent. Status/Priority/Lane: popover opens, option click commits, popover closes. Tag editor: backspace removes last chip; Enter adds tag. Dependency editor: candidate that creates a cycle shows inline error and is not committed.
- **`PlanDetailsPanel.test.tsx`** (extended): viewer fidelity preserved for read-only mode; editable cells appear on hover; saving footer state propagates.

### E2E (`test:e2e`)

- Boot dev server with `task-garden-v1.yaml`; edit a work item status via the right panel; assert the YAML file on disk now contains the new status (verify via `readFile`).
- Edit a title, blur, observe inline saved indicator, observe footer transition synced → saving → saved.
- Submit a dependency that would create a cycle; assert toast appears with `cycle_detected` code; assert YAML on disk is unchanged.
- Edit the YAML file externally; assert UI re-renders with the new value (existing read-path test — re-run for regression).
- Stop the dev server; trigger an edit; observe "CLI offline" footer + Retry; restart dev server; click Retry; assert write succeeds.

## Implementation Steps (5 Slices)

### Slice 1 — CLI write boundary + steering amendment

1. Amend `.kiro/steering/product.md` (text in this plan above).
2. Create `cli/mutex.ts` + `cli/mutex.test.ts`.
3. Create `cli/shared/patch-schema.ts` with `PlanPatchSchema` and re-exported primitives (`SlugSchema`, `TagSchema`, `ReferenceTargetSchema`) from `src/lib/plan/task-garden-plan.schema.ts`. Use the schema service interface as a re-import.
4. Create `cli/plan-writer.ts` + `cli/plan-writer.test.ts`. Use the `yaml` Document API.
5. Extend `cli/plan-state.ts` with `markSelfWrite` and `setSourceFromWatcher`. Update `cli/plan-state.test.ts`.
6. Modify `cli/file-watcher.ts` to call `setSourceFromWatcher`. Extend `cli/file-watcher.test.ts`.
7. Create `cli/edit-routes.ts` + `cli/edit-routes.test.ts`.
8. Modify `cli/routes.ts` to dispatch `PATCH /api/plan` to `handleEditRequest`. Extend `cli/routes.test.ts` with one happy-path PATCH test (full edit-routes coverage lives in `edit-routes.test.ts`).
9. Modify `cli/server.ts` and `cli/main.ts` to construct `planWriter`, shared mutex map, and pass to `RouteCtx`.
10. Modify `vite-plugins/taskgarden-plan-server.ts` to mirror the same wiring for dev mode.
11. Run `bun run typecheck` and `bun test`.

### Slice 2 — Client write infrastructure

1. Create `src/lib/plan/edit-api-client.ts` + tests.
2. Create `src/features/plan-workspace/editing/validation-copy.ts`.
3. Create `src/features/plan-workspace/editing/patch-targets.ts`.
4. Create `src/features/plan-workspace/editing/edit.store.ts` + tests.
5. Create `src/features/plan-workspace/editing/useFieldDraft.ts` + tests.
6. Create `src/features/plan-workspace/editing/WriteThroughStatusFooter.tsx` + test (purely state-driven, no I/O).
7. Create `src/features/plan-workspace/editing/FieldSaveIndicator.tsx` + test.
8. Create `src/features/plan-workspace/editing/ValidationToast.tsx` + test.
9. Create `src/features/plan-workspace/editing/glyphs.tsx`.
10. Run `bun run typecheck` and `bun test`.

### Slice 3 — Scalar editors in the Details panel

1. Create `EditableTitleCell`, `StatusPickerCell`, `PriorityPickerCell`, `LanePickerCell`, `EstimateStepperCell`, `SummaryEditorCell`, `NotesEditorCell` + tests.
2. Modify `PlanDetailsPanel.tsx`: replace each affected read-only section with the editable cell. Pass `baseRevision` from `processingState.input.revision`. Keep all non-edit chrome (header, navigation, schedule cards, dependents derived list) unchanged.
3. Mount `WriteThroughStatusFooter` at the bottom of the right panel in `PlanWorkspacePage.tsx`.
4. Mount `ValidationToast` at the page level in `PlanWorkspacePage.tsx`.
5. Update `PlanDetailsPanel.test.tsx` to cover: read-only fallback when no item selected; editable cells visible after hover; save-on-blur PATCH dispatched; saved indicator appears.
6. Manual browser verification: start dev server (`ensure_dev_server`), navigate to a work item, edit each field, watch DevTools network panel for PATCH calls, watch YAML on disk update via `tail -f`.
7. Run `bun run typecheck`, `bun test`, `bun run lint`.

### Slice 4 — List editors, plan-level, and quick-edit popover

1. Create `TagEditorCell`, `DependencyEditorCell` (upstream + dependents-derived branch flow), `StringListEditorCell` (deliverables + reuse_candidates), `LinksEditorCell` + tests.
2. Create `PlanOverviewEditor.tsx` + tests; wire it into `InfoPopoverButton`'s `FloatingPortal` content in `PlanWorkspacePage.tsx`, replacing `PlanOverviewHeader`.
3. Create `LaneInlineEditor.tsx` + tests; extend lane chips in `PlanToolbar.tsx` with a hover-revealed pencil affordance that opens it in a floating popover.
4. Create `NodeQuickEditPopover.tsx` + tests; mount via floating-ui anchored to the selected node inside `PlanGraphCanvas.tsx`; reuse the scalar cells from Slice 3.
5. Manual browser verification: edit tags, add a dependency that creates a cycle (verify toast), edit plan title via Info popover, edit a lane label, open quick-edit on a node.
6. Run `bun run typecheck`, `bun test`, `bun run lint`.

### Slice 5 — Creation flow + keyboard model

1. Create `editing-keyboard.ts` and register hotkeys in `PlanWorkspacePage.tsx`.
2. Create `CreateBar.tsx` + tests.
3. Create `NewItemForm.tsx` + tests. Validates the full record client-side via `TaskGardenWorkItemSchema` before enabling "Add to plan". On submit, sends a single `workItemCreate` PATCH.
4. Wire the three entry affordances per the design artboard `new-affordance`:
   - Toolbar "New item" button (extend `PlanToolbar.tsx`).
   - Lane-foot ghost-node "Add to lane" affordance (extend `PlanGraphCanvas.tsx` to render a ghost node at each lane's last position when hovered).
   - Selected-node "Branch ↘" affordance (add to `NodeQuickEditPopover`).
5. Pre-fill lane and `depends_on` based on entry point. After successful create, select the new item in `PlanExplorerStore` and clear the form.
6. Manual browser verification: each affordance opens the form with correct prefill; create succeeds; new item appears in graph and is selected; YAML on disk has the new entry preserved at end of `work_items`.
7. Run `bun run typecheck`, `bun test`, `bun run lint`, `bun run build`, `bun run test:e2e`.

## Error Handling

| Layer | Errors caught | Action |
|---|---|---|
| `planWriter` | YAML parse, validation, target not found, invalid patch | Returns structured failure; never throws |
| `edit-routes` | mutex / I/O failures, schema failures | Maps to status codes per table; never crashes server |
| `patchPlan` (client) | network / fetch rejection | Returns `{ error: "network" }`; never throws |
| `useFieldDraft.commit` | 409 stale | Silent rebase once; if still stale → surface conflict |
| `useFieldDraft.commit` | 422 validation | Rollback draft; toast with mapped copy |
| `useFieldDraft.commit` | 422 yaml_parse | Rollback draft; toast generic copy (should not happen — indicates writer bug) |
| `useFieldDraft.commit` | network | Preserve draft; footer "CLI offline" + Retry |
| `editing-keyboard` | Hotkey while in input | Suppressed (handled by `react-hotkeys-hook` defaults) |

## Configuration

No new env vars, no new flags. The PATCH endpoint is mounted on the same port as the existing read API. The CLI binary signature (`taskgarden <plan-file>`) is unchanged. The dev command `bun run dev` is unchanged.

## Out of Scope (deferred beyond V2 launch)

- `work_item.delete`, `lane.delete`, `lane.create` patch kinds
- `work_item.id` / `lane.id` rename workflows (require cross-reference migration)
- Dry-run validation endpoint (`/api/plan/check`) — browser-side validation is sufficient for v2
- Tmp-file cleanup on CLI boot
- Multi-user coordination / file locks beyond same-process mutex
- Undo/redo history
- Auto-bumping `last_updated`
