import { describe, expect, it } from "vitest";
import {
  ALL_STATUSES,
  STATUS_FILTER_ORDER,
  STATUS_LABELS,
  STATUS_LIFECYCLE_ORDER,
  getStatusLabel,
} from "./status-presentation";
import { TaskGardenStatusSchema } from "./task-garden-plan.schema";

describe("status-presentation", () => {
  it("labels every schema status", () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual(
      [...TaskGardenStatusSchema.options].sort(),
    );
  });

  it("maps snake_case statuses to display labels", () => {
    expect(getStatusLabel("in_progress")).toBe("In Progress");
    expect(getStatusLabel("planned")).toBe("Planned");
  });

  it("lists every status exactly once in each ordering", () => {
    const expected = [...TaskGardenStatusSchema.options].sort();
    expect([...ALL_STATUSES].sort()).toEqual(expected);
    expect([...STATUS_LIFECYCLE_ORDER].sort()).toEqual(expected);
    expect([...STATUS_FILTER_ORDER].sort()).toEqual(expected);
  });

  it("orders progress rollups completion-first and filters lifecycle-first", () => {
    expect(STATUS_LIFECYCLE_ORDER[0]).toBe("done");
    expect(STATUS_FILTER_ORDER[0]).toBe("planned");
  });
});
