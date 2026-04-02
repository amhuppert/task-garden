import type { PlanProcessingFailure } from "../../lib/plan/plan-processing-pipeline";

/**
 * Formats a validation issue path into a readable dot/bracket notation string.
 * e.g. ["work_items", 2, "lane"] → "work_items[2].lane"
 */
export function formatValidationPath(
  path: readonly (string | number)[],
): string {
  if (path.length === 0) return "(document root)";

  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      result += result === "" ? segment : `.${segment}`;
    }
  }
  return result;
}

/** Returns a short heading title for a given failure type. */
export function getFailureTitle(failure: PlanProcessingFailure): string {
  switch (failure.type) {
    case "source":
      return "Plan source could not be loaded";
    case "parse":
      return "YAML syntax error";
    case "validation":
      return "Invalid plan — schema errors";
  }
}

/** Returns an actionable description sentence for the failure. */
export function getFailureDescription(
  failure: PlanProcessingFailure,
  planKey: string,
): string {
  switch (failure.type) {
    case "source":
      return `The plan "${planKey}" could not be resolved. Check that the plan key is correct and the source file exists.`;
    case "parse":
      return "The YAML could not be parsed. Fix the syntax errors below and save the file to reload.";
    case "validation":
      return "The plan failed schema validation. Fix the errors below in the YAML source file.";
  }
}
