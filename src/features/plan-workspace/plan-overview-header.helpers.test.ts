import { describe, expect, it } from "vitest";
import { formatLastUpdated } from "./plan-overview-header.helpers";

// ---------------------------------------------------------------------------
// formatLastUpdated
// ---------------------------------------------------------------------------

describe("formatLastUpdated", () => {
  it("formats a YYYY-MM-DD ISO date into a human-readable string", () => {
    const result = formatLastUpdated("2026-03-15");
    // Should contain year
    expect(result).toContain("2026");
    // Should NOT be raw ISO string
    expect(result).not.toBe("2026-03-15");
  });

  it("includes month name in the output", () => {
    const result = formatLastUpdated("2026-03-15");
    expect(result).toMatch(/march/i);
  });

  it("includes the day in the output", () => {
    const result = formatLastUpdated("2026-03-15");
    expect(result).toMatch(/15/);
  });

  it("handles a date at the start of a year", () => {
    const result = formatLastUpdated("2025-01-01");
    expect(result).toContain("2025");
    expect(result).toMatch(/january/i);
  });

  it("handles a date at the end of a year", () => {
    const result = formatLastUpdated("2024-12-31");
    expect(result).toContain("2024");
    expect(result).toMatch(/december/i);
  });
});
