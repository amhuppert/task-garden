import { YAMLMap, YAMLSeq, parseDocument, parse as parseYaml } from "yaml";
import {
  TaskGardenPlanSchemaService,
  type TaskGardenPlanSchemaServiceInterface,
  type ValidationIssue,
} from "../src/lib/plan/task-garden-plan.schema";
import type { PlanPatch } from "./shared/patch-schema";

export type PlanWriterFailure =
  | { type: "yaml_parse"; message: string }
  | { type: "target_not_found"; target: { kind: string; id: string } }
  | { type: "validation"; issues: readonly ValidationIssue[] }
  | { type: "invalid_patch"; message: string };

export type PlanWriterResult =
  | { ok: true; nextSource: string }
  | { ok: false; failure: PlanWriterFailure };

export interface PlanWriter {
  apply(currentSource: string, patch: PlanPatch): PlanWriterResult;
}

function findItemIndex(
  doc: ReturnType<typeof parseDocument>,
  key: "work_items" | "lanes",
  id: string,
): number {
  const seq = doc.get(key);
  if (!(seq instanceof YAMLSeq)) return -1;
  for (let i = 0; i < seq.items.length; i++) {
    const item = seq.items[i];
    if (item instanceof YAMLMap) {
      const itemId = item.get("id");
      if (itemId === id) return i;
    }
  }
  return -1;
}

function setBlockStyleAt(
  doc: ReturnType<typeof parseDocument>,
  path: readonly (string | number)[],
): void {
  const node = doc.getIn(path, true);
  if (node instanceof YAMLMap || node instanceof YAMLSeq) {
    node.flow = false;
  }
}

export function createPlanWriter(
  schemaService: TaskGardenPlanSchemaServiceInterface,
): PlanWriter {
  return {
    apply(currentSource: string, patch: PlanPatch): PlanWriterResult {
      const doc = parseDocument(currentSource);
      if (doc.errors.length > 0) {
        return {
          ok: false,
          failure: {
            type: "yaml_parse",
            message: doc.errors.map((e) => e.message).join("; "),
          },
        };
      }

      switch (patch.kind) {
        case "work_item.field": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          if (patch.field === "notes" && patch.value === null) {
            doc.deleteIn(["work_items", i, "notes"]);
          } else {
            doc.setIn(["work_items", i, patch.field], patch.value);
          }
          break;
        }
        case "work_item.value": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          doc.setIn(["work_items", i, "value"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "value"]);
          break;
        }
        case "work_item.estimate": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          if (patch.value === null) {
            doc.deleteIn(["work_items", i, "estimate"]);
          } else {
            doc.setIn(["work_items", i, "estimate"], patch.value);
            setBlockStyleAt(doc, ["work_items", i, "estimate"]);
          }
          break;
        }
        case "work_item.tags": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          doc.setIn(["work_items", i, "tags"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "tags"]);
          break;
        }
        case "work_item.depends_on": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          doc.setIn(["work_items", i, "depends_on"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "depends_on"]);
          break;
        }
        case "work_item.string_list": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          doc.setIn(["work_items", i, patch.field], patch.value);
          setBlockStyleAt(doc, ["work_items", i, patch.field]);
          break;
        }
        case "work_item.links": {
          const i = findItemIndex(doc, "work_items", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "work_item", id: patch.target.id },
              },
            };
          }
          doc.setIn(["work_items", i, "links"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "links"]);
          const linksSeq = doc.getIn(["work_items", i, "links"], true);
          if (linksSeq instanceof YAMLSeq) {
            for (const node of linksSeq.items) {
              if (node instanceof YAMLMap) node.flow = false;
            }
          }
          break;
        }
        case "work_item.create": {
          const seq = doc.get("work_items");
          if (!(seq instanceof YAMLSeq)) {
            return {
              ok: false,
              failure: {
                type: "invalid_patch",
                message: "work_items is missing or not a sequence",
              },
            };
          }
          seq.add(patch.value);
          const appendedIndex = seq.items.length - 1;
          const appended = seq.items[appendedIndex];
          if (appended instanceof YAMLMap) {
            appended.flow = false;
          }
          break;
        }
        case "plan.field": {
          doc.set(patch.field, patch.value);
          break;
        }
        case "plan.references": {
          doc.set("references", patch.value);
          setBlockStyleAt(doc, ["references"]);
          const refsSeq = doc.getIn(["references"], true);
          if (refsSeq instanceof YAMLSeq) {
            for (const node of refsSeq.items) {
              if (node instanceof YAMLMap) node.flow = false;
            }
          }
          break;
        }
        case "lane.field": {
          const i = findItemIndex(doc, "lanes", patch.target.id);
          if (i < 0) {
            return {
              ok: false,
              failure: {
                type: "target_not_found",
                target: { kind: "lane", id: patch.target.id },
              },
            };
          }
          if (
            (patch.field === "description" || patch.field === "color") &&
            patch.value === null
          ) {
            doc.deleteIn(["lanes", i, patch.field]);
          } else {
            doc.setIn(["lanes", i, patch.field], patch.value);
          }
          break;
        }
        default: {
          return {
            ok: false,
            failure: {
              type: "invalid_patch",
              message: `Unsupported patch kind: ${(patch as { kind: string }).kind}`,
            },
          };
        }
      }

      const nextSource = doc.toString();

      let parsed: unknown;
      try {
        parsed = parseYaml(nextSource);
      } catch (err) {
        return {
          ok: false,
          failure: {
            type: "yaml_parse",
            message:
              err instanceof Error ? err.message : "Unknown YAML parse error",
          },
        };
      }

      const validation = schemaService.parse(parsed);
      if (!validation.ok) {
        return {
          ok: false,
          failure: { type: "validation", issues: validation.error },
        };
      }

      return { ok: true, nextSource };
    },
  };
}

export const planWriter: PlanWriter = createPlanWriter(
  TaskGardenPlanSchemaService,
);
