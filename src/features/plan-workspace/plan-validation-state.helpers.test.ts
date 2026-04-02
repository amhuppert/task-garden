import { describe, expect, it } from "vitest";
import type { PlanProcessingFailure } from "../../lib/plan/plan-processing-pipeline";
import {
  formatValidationPath,
  getFailureDescription,
  getFailureTitle,
} from "./plan-validation-state.helpers";

// ---------------------------------------------------------------------------
// formatValidationPath
// ---------------------------------------------------------------------------

describe("formatValidationPath", () => {
  it("formats an empty path as the document root", () => {
    expect(formatValidationPath([])).toBe("(document root)");
  });

  it("formats a single string segment", () => {
    expect(formatValidationPath(["title"])).toBe("title");
  });

  it("formats nested string segments with dot notation", () => {
    expect(formatValidationPath(["plan", "title"])).toBe("plan.title");
  });

  it("formats a numeric index as bracket notation", () => {
    expect(formatValidationPath(["work_items", 0])).toBe("work_items[0]");
  });

  it("formats nested path with multiple indices", () => {
    expect(formatValidationPath(["work_items", 2, "dependencies", 0])).toBe(
      "work_items[2].dependencies[0]",
    );
  });

  it("handles a path starting with a number", () => {
    expect(formatValidationPath([0, "lane"])).toBe("[0].lane");
  });
});

// ---------------------------------------------------------------------------
// getFailureTitle
// ---------------------------------------------------------------------------

describe("getFailureTitle", () => {
  it("returns a source error title for source failure", () => {
    const failure: PlanProcessingFailure = { type: "source", issues: [] };
    expect(getFailureTitle(failure)).toMatch(/source|plan|load/i);
  });

  it("returns a parse error title for parse failure", () => {
    const failure: PlanProcessingFailure = { type: "parse", issues: [] };
    expect(getFailureTitle(failure)).toMatch(/parse|yaml|syntax/i);
  });

  it("returns a validation error title for validation failure", () => {
    const failure: PlanProcessingFailure = { type: "validation", issues: [] };
    expect(getFailureTitle(failure)).toMatch(/valid|schema|invalid/i);
  });
});

// ---------------------------------------------------------------------------
// getFailureDescription
// ---------------------------------------------------------------------------

describe("getFailureDescription", () => {
  it("returns a source description referencing the plan key", () => {
    const failure: PlanProcessingFailure = {
      type: "source",
      issues: ["Plan not found"],
    };
    const desc = getFailureDescription(failure, "my-plan");
    expect(desc).toContain("my-plan");
  });

  it("returns a parse description for parse failure", () => {
    const failure: PlanProcessingFailure = {
      type: "parse",
      issues: ["unexpected token"],
    };
    const desc = getFailureDescription(failure, "plan-a");
    expect(desc).toMatch(/yaml|fix|edit/i);
  });

  it("returns a validation description for validation failure", () => {
    const failure: PlanProcessingFailure = {
      type: "validation",
      issues: [{ path: ["title"], code: "too_small", message: "Required" }],
    };
    const desc = getFailureDescription(failure, "plan-b");
    expect(desc).toMatch(/fix|error|issue/i);
  });
});
