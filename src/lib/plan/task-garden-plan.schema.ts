import { z } from "zod/v4";
import type { Result } from "./result";

// ---------------------------------------------------------------------------
// ValidationIssue — our public error contract (not Zod-internal)
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  readonly path: readonly (string | number)[];
  readonly code: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const SlugSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/);
const TagSchema = z.string().regex(/^[a-z0-9][a-z0-9_/-]*$/);

// A reference target is either an http/https URL or a repo-relative .md path.
// Repo-relative paths must start with an alphanumeric character (not "/" or ".")
// and must not contain any path-traversal sequences ("..").
export const ReferenceTargetSchema = z
  .string()
  .min(1)
  .refine(
    (v) =>
      /^https?:\/\/.+/.test(v) ||
      (/^[a-zA-Z0-9].*\.md$/.test(v) && !v.includes("..")),
    {
      message:
        "Reference target must be an http/https URL or a repo-relative .md path (must not start with '/' or '.' and must not contain '..')",
    },
  );

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const TaskGardenStatusSchema = z.enum([
  "planned",
  "ready",
  "blocked",
  "in_progress",
  "done",
  "future",
]);

export const TaskGardenPrioritySchema = z.enum([
  "p0",
  "p1",
  "p2",
  "p3",
  "nice_to_have",
]);

export const TaskGardenLaneSchema = z.object({
  id: SlugSchema.describe(
    "Unique slug identifying this lane. Referenced by work_items.lane.",
  ),
  label: z.string().min(1).describe("Display label shown in the UI."),
  description: z
    .string()
    .min(1)
    .optional()
    .describe("Optional longer description of what this lane covers."),
  color: z
    .string()
    .min(1)
    .optional()
    .describe("Optional CSS color string used for visual encoding."),
});

export const TaskGardenEstimateSchema = z.object({
  value: z.number().positive().describe("Positive numeric estimate."),
  unit: z.enum(["hours", "days", "points"]).describe("Unit for the estimate."),
});

export const TaskGardenLinkSchema = z.object({
  label: z.string().min(1).describe("Display label for the link."),
  href: ReferenceTargetSchema.describe(
    "An http(s) URL or a .md path resolved relative to the plan file's parent directory (no path traversal).",
  ),
});

export const TaskGardenWorkItemSchema = z.object({
  id: SlugSchema.describe(
    "Unique slug identifying this work item. Referenced by depends_on entries.",
  ),
  title: z.string().min(1).describe("Short human-readable name."),
  summary: z.string().min(1).describe("What this item delivers and why."),
  lane: SlugSchema.describe(
    "ID of the lane this item belongs to. Must reference an existing lane.id.",
  ),
  status: TaskGardenStatusSchema.describe(
    "Lifecycle state. planned = scoped, not started; ready = unblocked, can start; blocked = waiting; in_progress = active; done = complete; future = not yet fully scoped.",
  ),
  priority: TaskGardenPrioritySchema.describe(
    "Importance. p0 = must-have / blocking; p1 = important; p2 = nice quality improvement; p3 = low priority; nice_to_have = explicit stretch goal.",
  ),
  depends_on: z
    .array(SlugSchema)
    .default([])
    .describe(
      "IDs of work items that must be completed before this one can start. Must reference existing items; no self-references, duplicates, or cycles.",
    ),
  tags: z
    .array(TagSchema)
    .default([])
    .describe(
      "Cross-cutting labels (slug format; may contain '/'). Useful for filtering across lanes.",
    ),
  estimate: TaskGardenEstimateSchema.optional().describe(
    "Optional rough sizing for this item.",
  ),
  deliverables: z
    .array(z.string().min(1))
    .default([])
    .describe("Concrete outputs produced when this item is done."),
  reuse_candidates: z
    .array(z.string().min(1))
    .default([])
    .describe(
      "Existing code, libraries, or patterns worth considering when implementing this item.",
    ),
  links: z
    .array(TaskGardenLinkSchema)
    .default([])
    .describe(
      "External resources or local Markdown docs related to this item.",
    ),
  notes: z
    .string()
    .min(1)
    .optional()
    .describe("Freeform context that doesn't fit other fields."),
});

// ---------------------------------------------------------------------------
// Cross-record integrity helpers
// ---------------------------------------------------------------------------

// tgCode is stored in params so we can recover our semantic code after parsing.
const TG_CODE_KEY = "tgCode";

type RawPayload = {
  value: {
    lanes: Array<{ id: string }>;
    work_items: Array<{
      id: string;
      lane: string;
      depends_on: string[];
    }>;
  };
  issues: Array<{
    code: string;
    path?: (string | number)[];
    message?: string;
    params?: Record<string, unknown>;
  }>;
};

function addIssue(
  payload: RawPayload,
  path: (string | number)[],
  tgCode: string,
  message: string,
): void {
  payload.issues.push({
    code: "custom",
    path,
    message,
    params: { [TG_CODE_KEY]: tgCode },
  });
}

function checkIntegrity(payload: RawPayload): void {
  const { lanes, work_items } = payload.value;

  // ---- Duplicate lane IDs ----
  const laneIds = new Set<string>();
  for (let i = 0; i < lanes.length; i++) {
    const { id } = lanes[i];
    if (laneIds.has(id)) {
      addIssue(
        payload,
        ["lanes", i, "id"],
        "duplicate_id",
        `Duplicate lane id "${id}"`,
      );
    }
    laneIds.add(id);
  }

  // ---- Duplicate work item IDs ----
  const workItemIds = new Set<string>();
  for (let i = 0; i < work_items.length; i++) {
    const { id } = work_items[i];
    if (workItemIds.has(id)) {
      addIssue(
        payload,
        ["work_items", i, "id"],
        "duplicate_id",
        `Duplicate work item id "${id}"`,
      );
    }
    workItemIds.add(id);
  }

  // ---- Per-work-item checks ----
  for (let i = 0; i < work_items.length; i++) {
    const item = work_items[i];

    // Missing lane reference
    if (!laneIds.has(item.lane)) {
      addIssue(
        payload,
        ["work_items", i, "lane"],
        "missing_lane",
        `Work item "${item.id}" references undefined lane "${item.lane}"`,
      );
    }

    // Per-dependency checks
    const seenDeps = new Set<string>();
    for (let j = 0; j < item.depends_on.length; j++) {
      const dep = item.depends_on[j];

      // Self-dependency (check before missing so we report the right code)
      if (dep === item.id) {
        addIssue(
          payload,
          ["work_items", i, "depends_on", j],
          "self_dependency",
          `Work item "${item.id}" depends on itself`,
        );
        seenDeps.add(dep);
        continue;
      }

      // Missing dependency
      if (!workItemIds.has(dep)) {
        addIssue(
          payload,
          ["work_items", i, "depends_on", j],
          "missing_dependency",
          `Work item "${item.id}" depends on undefined work item "${dep}"`,
        );
      }

      // Duplicate dependency
      if (seenDeps.has(dep)) {
        addIssue(
          payload,
          ["work_items", i, "depends_on", j],
          "duplicate_dependency",
          `Work item "${item.id}" has duplicate dependency "${dep}"`,
        );
      }

      seenDeps.add(dep);
    }
  }

  // ---- Cycle detection (DFS, three-colour) ----
  // Build adjacency map from valid, non-self edges that reference known items.
  const adjMap = new Map<string, string[]>();
  for (const item of work_items) {
    adjMap.set(
      item.id,
      item.depends_on.filter((dep) => workItemIds.has(dep) && dep !== item.id),
    );
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const colors = new Map<string, 0 | 1 | 2>();
  for (const id of workItemIds) colors.set(id, WHITE);

  // Normalise a cycle path so duplicate back-edges aren't double-reported.
  const reportedCycles = new Set<string>();

  function visit(node: string, stack: string[]): void {
    colors.set(node, GRAY);
    stack.push(node);

    for (const dep of adjMap.get(node) ?? []) {
      if (colors.get(dep) === GRAY) {
        // Back edge found — cycle!
        const cycleStart = stack.indexOf(dep);
        const cycle = [...stack.slice(cycleStart), dep];
        const key = cycle.join(",");
        if (!reportedCycles.has(key)) {
          reportedCycles.add(key);
          addIssue(
            payload,
            ["work_items"],
            "cycle_detected",
            `Dependency cycle detected: ${cycle.join(" → ")}`,
          );
        }
      } else if (colors.get(dep) === WHITE) {
        visit(dep, stack);
      }
    }

    stack.pop();
    colors.set(node, BLACK);
  }

  for (const id of workItemIds) {
    if (colors.get(id) === WHITE) {
      visit(id, []);
    }
  }
}

// ---------------------------------------------------------------------------
// Plan schema
// ---------------------------------------------------------------------------

export const TaskGardenPlanSchemaDefinition = z
  .object({
    version: z.literal(1).describe("Schema version. Must always be 1."),
    plan_id: SlugSchema.describe("Unique slug identifying this plan."),
    title: z.string().min(1).describe("Human-readable plan title."),
    last_updated: DateOnlySchema.describe(
      "Date the plan was last edited, in YYYY-MM-DD format.",
    ),
    summary: z
      .string()
      .min(1)
      .describe("One- or two-sentence description of the plan's goal."),
    references: z
      .array(TaskGardenLinkSchema)
      .default([])
      .describe("Top-level documentation references for the whole plan."),
    lanes: z
      .array(TaskGardenLaneSchema)
      .min(1)
      .describe(
        "Logical groupings of work (e.g., 'backend', 'frontend'). At least one required.",
      ),
    work_items: z
      .array(TaskGardenWorkItemSchema)
      .min(1)
      .describe(
        "Concrete tasks and their dependencies. At least one required. Must form a DAG (no cycles).",
      ),
  })
  .check((payload) => {
    // The `.check()` payload value is typed as the object output, but we use a
    // cast-compatible helper type to avoid pulling in Zod internals everywhere.
    checkIntegrity(payload as unknown as RawPayload);
  });

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type ReferenceTarget = z.infer<typeof ReferenceTargetSchema>;
export type TaskGardenStatus = z.infer<typeof TaskGardenStatusSchema>;
export type TaskGardenPriority = z.infer<typeof TaskGardenPrioritySchema>;
export type TaskGardenLane = z.infer<typeof TaskGardenLaneSchema>;
export type TaskGardenEstimate = z.infer<typeof TaskGardenEstimateSchema>;
export type TaskGardenLink = z.infer<typeof TaskGardenLinkSchema>;
export type TaskGardenWorkItem = z.infer<typeof TaskGardenWorkItemSchema>;
export type TaskGardenPlan = z.infer<typeof TaskGardenPlanSchemaDefinition>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface TaskGardenPlanSchemaServiceInterface {
  parse(input: unknown): Result<TaskGardenPlan, readonly ValidationIssue[]>;
}

function zodIssueToValidationIssue(issue: z.core.$ZodIssue): ValidationIssue {
  // Custom issues may carry a semantic tgCode in params.
  if (
    issue.code === "custom" &&
    "params" in issue &&
    typeof (issue as { params?: unknown }).params === "object" &&
    (issue as { params: Record<string, unknown> }).params !== null &&
    TG_CODE_KEY in (issue as { params: Record<string, unknown> }).params
  ) {
    const params = (issue as { params: Record<string, unknown> }).params;
    return {
      path: issue.path as (string | number)[],
      code: String(params[TG_CODE_KEY]),
      message: issue.message,
    };
  }
  return {
    path: issue.path as (string | number)[],
    code: issue.code,
    message: issue.message,
  };
}

export function createTaskGardenPlanSchemaService(): TaskGardenPlanSchemaServiceInterface {
  return {
    parse(input: unknown): Result<TaskGardenPlan, readonly ValidationIssue[]> {
      const result = TaskGardenPlanSchemaDefinition.safeParse(input);
      if (result.success) {
        return { ok: true, value: result.data };
      }
      const issues = result.error.issues.map(zodIssueToValidationIssue);
      return { ok: false, error: issues };
    },
  };
}

/** Singleton instance for direct use in the processing pipeline. */
export const TaskGardenPlanSchemaService: TaskGardenPlanSchemaServiceInterface =
  createTaskGardenPlanSchemaService();
