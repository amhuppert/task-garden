import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { createTaskGardenPlanSchemaService } from "../lib/plan/task-garden-plan.schema";

const schemaService = createTaskGardenPlanSchemaService();
const plansDir = join(__dirname);

// Skip the intentionally invalid test fixture.
const SKIP = new Set(["invalid-plan-test.yaml"]);

const yamlFiles = readdirSync(plansDir)
  .filter((f) => f.endsWith(".yaml") && !SKIP.has(f))
  .sort();

describe("bundled plan YAML files validate against the schema", () => {
  for (const file of yamlFiles) {
    it(`${file} passes schema validation`, () => {
      const raw = readFileSync(join(plansDir, file), "utf-8");
      const data = parseYaml(raw);
      const result = schemaService.parse(data);
      if (!result.ok) {
        const messages = result.error
          .map(
            (issue) =>
              `  [${issue.code}] ${issue.path.join(".")}: ${issue.message}`,
          )
          .join("\n");
        throw new Error(`${file} failed schema validation:\n${messages}`);
      }
      expect(result.ok).toBe(true);
    });
  }
});
