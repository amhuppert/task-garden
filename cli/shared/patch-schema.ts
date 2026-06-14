import { z } from "zod/v4";
import {
  ReferenceTargetSchema,
  SlugSchema,
  TagSchema,
  TaskGardenLinkSchema,
  TaskGardenWorkItemSchema,
} from "../../src/lib/plan/task-garden-plan.schema";

export {
  ReferenceTargetSchema,
  SlugSchema,
  TagSchema,
  TaskGardenLinkSchema,
  TaskGardenWorkItemSchema,
};

export const PlanPatchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("work_item.field"),
    target: z.object({ id: SlugSchema }),
    field: z.enum(["title", "summary", "lane", "status", "priority", "notes"]),
    value: z.string().nullable(),
  }),

  z.object({
    kind: z.literal("work_item.estimate"),
    target: z.object({ id: SlugSchema }),
    // Estimate magnitude only; the unit is configured plan-wide via estimate_unit.
    value: z.number().positive().nullable(),
  }),

  z.object({
    kind: z.literal("work_item.tags"),
    target: z.object({ id: SlugSchema }),
    value: z.array(TagSchema),
  }),

  z.object({
    kind: z.literal("work_item.depends_on"),
    target: z.object({ id: SlugSchema }),
    value: z.array(SlugSchema),
  }),

  z.object({
    kind: z.literal("work_item.string_list"),
    target: z.object({ id: SlugSchema }),
    field: z.enum(["deliverables", "reuse_candidates"]),
    value: z.array(z.string().min(1)),
  }),

  z.object({
    kind: z.literal("work_item.links"),
    target: z.object({ id: SlugSchema }),
    value: z.array(
      z.object({
        label: z.string().min(1),
        href: ReferenceTargetSchema,
      }),
    ),
  }),

  z.object({
    kind: z.literal("work_item.create"),
    value: TaskGardenWorkItemSchema,
  }),

  z.object({
    kind: z.literal("plan.field"),
    field: z.enum(["title", "summary", "last_updated"]),
    value: z.string(),
  }),

  z.object({
    kind: z.literal("plan.references"),
    value: z.array(TaskGardenLinkSchema),
  }),

  z.object({
    kind: z.literal("lane.field"),
    target: z.object({ id: SlugSchema }),
    field: z.enum(["label", "description", "color"]),
    value: z.string().nullable(),
  }),
]);

export type PlanPatch = z.infer<typeof PlanPatchSchema>;
