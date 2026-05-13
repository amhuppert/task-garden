import { writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod/v4";
import { TaskGardenPlanSchemaDefinition } from "../src/lib/plan/task-garden-plan.schema";

const jsonSchema = z.toJSONSchema(TaskGardenPlanSchemaDefinition, {
  target: "draft-7",
});

const output = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://github.com/amhuppert/task-garden/schemas/task-garden-plan.schema.json",
  title: "Task Garden Plan",
  description:
    "Schema for Task Garden YAML plan files. Generated from the Zod source of truth at src/lib/plan/task-garden-plan.schema.ts.",
  ...jsonSchema,
};

const outPath = path.resolve(
  import.meta.dirname,
  "..",
  "schemas",
  "task-garden-plan.schema.json",
);
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
