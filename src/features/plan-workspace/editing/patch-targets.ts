import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  TaskGardenLink,
  TaskGardenWorkItem,
} from "../../../lib/plan/task-garden-plan.schema";

type WorkItemFieldName = Extract<
  PlanPatch,
  { kind: "work_item.field" }
>["field"];

type WorkItemStringListFieldName = Extract<
  PlanPatch,
  { kind: "work_item.string_list" }
>["field"];

type PlanFieldName = Extract<PlanPatch, { kind: "plan.field" }>["field"];

type LaneFieldName = Extract<PlanPatch, { kind: "lane.field" }>["field"];

export const patchTargets = {
  workItemField(
    id: string,
    field: WorkItemFieldName,
    value: string | null,
  ): PlanPatch {
    return {
      kind: "work_item.field",
      target: { id },
      field,
      value,
    };
  },

  workItemEstimate(id: string, value: number | null): PlanPatch {
    return {
      kind: "work_item.estimate",
      target: { id },
      value,
    };
  },

  workItemValue(id: string, value: number): PlanPatch {
    return {
      kind: "work_item.value",
      target: { id },
      value,
    };
  },

  workItemTags(id: string, value: readonly string[]): PlanPatch {
    return {
      kind: "work_item.tags",
      target: { id },
      value: [...value],
    };
  },

  workItemDepsOn(id: string, value: readonly string[]): PlanPatch {
    return {
      kind: "work_item.depends_on",
      target: { id },
      value: [...value],
    };
  },

  workItemStringList(
    id: string,
    field: WorkItemStringListFieldName,
    value: readonly string[],
  ): PlanPatch {
    return {
      kind: "work_item.string_list",
      target: { id },
      field,
      value: [...value],
    };
  },

  workItemLinks(id: string, value: readonly TaskGardenLink[]): PlanPatch {
    return {
      kind: "work_item.links",
      target: { id },
      value: value.map((link) => ({ label: link.label, href: link.href })),
    };
  },

  workItemCreate(value: TaskGardenWorkItem): PlanPatch {
    return {
      kind: "work_item.create",
      value,
    };
  },

  planField(field: PlanFieldName, value: string): PlanPatch {
    return {
      kind: "plan.field",
      field,
      value,
    };
  },

  planReferences(value: readonly TaskGardenLink[]): PlanPatch {
    return {
      kind: "plan.references",
      value: value.map((link) => ({ label: link.label, href: link.href })),
    };
  },

  laneField(id: string, field: LaneFieldName, value: string | null): PlanPatch {
    return {
      kind: "lane.field",
      target: { id },
      field,
      value,
    };
  },
};
