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

type IndexResolution =
  | { ok: true; index: number }
  | { ok: false; error: PlanWriterResult };

// `error` is a ready-to-return PlanWriterResult so every operation can do
// `if (!resolved.ok) return resolved.error;` without rebuilding the failure.
function resolveItemIndex(
  doc: ReturnType<typeof parseDocument>,
  key: "work_items" | "lanes",
  id: string,
): IndexResolution {
  const seq = doc.get(key);
  if (seq instanceof YAMLSeq) {
    for (let i = 0; i < seq.items.length; i++) {
      const item = seq.items[i];
      if (item instanceof YAMLMap && item.get("id") === id) {
        return { ok: true, index: i };
      }
    }
  }
  return {
    ok: false,
    error: {
      ok: false,
      failure: {
        type: "target_not_found",
        target: { kind: key === "lanes" ? "lane" : "work_item", id },
      },
    },
  };
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
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
          if (patch.field === "notes" && patch.value === null) {
            doc.deleteIn(["work_items", i, "notes"]);
          } else {
            doc.setIn(["work_items", i, patch.field], patch.value);
          }
          break;
        }
        case "work_item.value": {
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
          doc.setIn(["work_items", i, "value"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "value"]);
          break;
        }
        case "work_item.estimate": {
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
          if (patch.value === null) {
            doc.deleteIn(["work_items", i, "estimate"]);
          } else {
            doc.setIn(["work_items", i, "estimate"], patch.value);
            setBlockStyleAt(doc, ["work_items", i, "estimate"]);
          }
          break;
        }
        case "work_item.tags": {
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
          doc.setIn(["work_items", i, "tags"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "tags"]);
          break;
        }
        case "work_item.depends_on": {
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
          doc.setIn(["work_items", i, "depends_on"], patch.value);
          setBlockStyleAt(doc, ["work_items", i, "depends_on"]);
          break;
        }
        case "work_item.string_list": {
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
          doc.setIn(["work_items", i, patch.field], patch.value);
          setBlockStyleAt(doc, ["work_items", i, patch.field]);
          break;
        }
        case "work_item.links": {
          const resolved = resolveItemIndex(doc, "work_items", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
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
          const resolved = resolveItemIndex(doc, "lanes", patch.target.id);
          if (!resolved.ok) return resolved.error;
          const i = resolved.index;
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
