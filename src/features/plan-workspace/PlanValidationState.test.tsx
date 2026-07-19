// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PlanProcessingState } from "../../lib/plan/plan-processing-pipeline";
import { PlanValidationState } from "./PlanValidationState";

afterEach(cleanup);

const invalidState: PlanProcessingState = {
  status: "invalid",
  input: { source: "bad", revision: 1 },
  failure: {
    type: "validation",
    issues: [
      {
        code: "custom",
        path: ["work_items", 0, "lane"],
        message: "Unknown lane 'x'.",
      },
      {
        code: "custom",
        path: ["work_items", 1, "id"],
        message: "Duplicate id 'a'.",
      },
    ],
  },
};

describe("PlanValidationState", () => {
  it("loading: announces through a status region separate from the visible spinner chrome", () => {
    render(<PlanValidationState state={{ status: "loading" }} />);

    // The announcement text is swapped in by effect after the region mounts
    // (a region inserted with content is never announced); by the time render
    // settles it must carry the message.
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("Loading plan");
    // The visible chrome stays outside the region so the spinner markup is
    // not part of the announcement.
    expect(region.querySelector("[aria-hidden]")).toBeNull();
    expect(screen.getByText("Loading plan", { selector: "p" })).toBeDefined();
  });

  it("invalid: the alert carries only a brief summary; the issue list is ordinary content", () => {
    render(<PlanValidationState state={invalidState} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("2 issues found");
    // Full issue details are navigable document content, not part of the
    // assertive announcement.
    expect(alert.textContent).not.toContain("Unknown lane 'x'.");
    expect(screen.getByText("Unknown lane 'x'.")).toBeDefined();
    expect(screen.getByText("Duplicate id 'a'.")).toBeDefined();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(alert.contains(heading)).toBe(false);
  });
});
