import { describe, expect, it } from "vitest";
import {
  type ValidationIssue,
  createTaskGardenPlanSchemaService,
} from "./task-garden-plan.schema";

const schemaService = createTaskGardenPlanSchemaService();

// ---------------------------------------------------------------------------
// Minimal valid plan fixture
// ---------------------------------------------------------------------------
const validPlan = {
  version: 1 as const,
  plan_id: "test-plan",
  title: "Test Plan",
  last_updated: "2026-04-01",
  summary: "A minimal test plan.",
  references: ["https://example.com", "memory-bank/focus.md"],
  lanes: [
    { id: "frontend", label: "Frontend" },
    { id: "backend", label: "Backend" },
  ],
  work_items: [
    {
      id: "item-a",
      title: "Item A",
      summary: "First item.",
      lane: "frontend",
      status: "ready",
      priority: "p0",
      depends_on: [],
    },
    {
      id: "item-b",
      title: "Item B",
      summary: "Second item.",
      lane: "backend",
      status: "planned",
      priority: "p1",
      depends_on: ["item-a"],
    },
  ],
};

function codes(issues: readonly ValidationIssue[]): string[] {
  return issues.map((i) => i.code);
}

// ---------------------------------------------------------------------------
// Valid plans
// ---------------------------------------------------------------------------
describe("TaskGardenPlanSchemaService – valid plans", () => {
  it("parses a minimal valid plan", () => {
    const result = schemaService.parse(validPlan);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.plan_id).toBe("test-plan");
      expect(result.value.version).toBe(1);
    }
  });

  it("populates array defaults when omitted", () => {
    const plan = {
      ...validPlan,
      work_items: [
        {
          id: "item-a",
          title: "Item A",
          summary: "No optional fields.",
          lane: "frontend",
          status: "ready",
          priority: "p0",
          // no depends_on, tags, deliverables, reuse_candidates, links
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = result.value.work_items[0];
      expect(item.depends_on).toEqual([]);
      expect(item.tags).toEqual([]);
      expect(item.deliverables).toEqual([]);
      expect(item.reuse_candidates).toEqual([]);
      expect(item.links).toEqual([]);
    }
  });

  it("accepts all valid status values", () => {
    const statuses = [
      "planned",
      "ready",
      "blocked",
      "in_progress",
      "done",
      "future",
    ] as const;
    for (const status of statuses) {
      const plan = {
        ...validPlan,
        work_items: [{ ...validPlan.work_items[0], status, depends_on: [] }],
      };
      const result = schemaService.parse(plan);
      expect(result.ok, `expected ok for status "${status}"`).toBe(true);
    }
  });

  it("accepts all valid priority values", () => {
    const priorities = ["p0", "p1", "p2", "p3", "nice_to_have"] as const;
    for (const priority of priorities) {
      const plan = {
        ...validPlan,
        work_items: [{ ...validPlan.work_items[0], priority, depends_on: [] }],
      };
      const result = schemaService.parse(plan);
      expect(result.ok, `expected ok for priority "${priority}"`).toBe(true);
    }
  });

  it("accepts valid estimate fields", () => {
    const plan = {
      ...validPlan,
      work_items: [
        {
          ...validPlan.work_items[0],
          estimate: { value: 3, unit: "days" },
          depends_on: [],
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.work_items[0].estimate?.value).toBe(3);
    }
  });

  it("accepts https URL reference targets", () => {
    const plan = {
      ...validPlan,
      references: ["https://example.com/doc"],
    };
    expect(schemaService.parse(plan).ok).toBe(true);
  });

  it("accepts http URL reference targets", () => {
    const plan = { ...validPlan, references: ["http://localhost:3000"] };
    expect(schemaService.parse(plan).ok).toBe(true);
  });

  it("accepts repo-relative .md reference targets", () => {
    const plan = {
      ...validPlan,
      references: ["memory-bank/focus.md", "docs/overview.md"],
    };
    expect(schemaService.parse(plan).ok).toBe(true);
  });

  it("accepts optional lane description and color", () => {
    const plan = {
      ...validPlan,
      lanes: [
        {
          id: "frontend",
          label: "Frontend",
          description: "UI work",
          color: "#4A90E2",
        },
      ],
      work_items: [{ ...validPlan.work_items[0], depends_on: [] }],
    };
    expect(schemaService.parse(plan).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Field-level validation
// ---------------------------------------------------------------------------
describe("TaskGardenPlanSchemaService – field validation", () => {
  it("rejects version other than 1", () => {
    const result = schemaService.parse({ ...validPlan, version: 2 });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed last_updated date", () => {
    const result = schemaService.parse({
      ...validPlan,
      last_updated: "April 1 2026",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects plan_id with invalid slug characters", () => {
    const result = schemaService.parse({ ...validPlan, plan_id: "My Plan!" });
    expect(result.ok).toBe(false);
  });

  it("rejects reference target that is not a URL or .md path", () => {
    const result = schemaService.parse({
      ...validPlan,
      references: ["some-random-string"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects absolute .md paths (must be repo-relative)", () => {
    const result = schemaService.parse({
      ...validPlan,
      references: ["/absolute/path.md"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects path-traversal .md paths", () => {
    const result = schemaService.parse({
      ...validPlan,
      references: ["../outside.md"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects embedded path-traversal sequences", () => {
    const result = schemaService.parse({
      ...validPlan,
      references: ["docs/../outside.md"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty lanes array", () => {
    const result = schemaService.parse({ ...validPlan, lanes: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects empty work_items array", () => {
    const result = schemaService.parse({ ...validPlan, work_items: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive estimate value", () => {
    const plan = {
      ...validPlan,
      work_items: [
        {
          ...validPlan.work_items[0],
          estimate: { value: 0, unit: "days" },
          depends_on: [],
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integrity rules (task 2.2)
// ---------------------------------------------------------------------------
describe("TaskGardenPlanSchemaService – integrity rules", () => {
  // ---- duplicate IDs ----
  it("rejects duplicate lane IDs and uses code 'duplicate_id'", () => {
    const plan = {
      ...validPlan,
      lanes: [
        { id: "frontend", label: "Frontend" },
        { id: "frontend", label: "Frontend Duplicate" },
      ],
      work_items: [{ ...validPlan.work_items[0], lane: "frontend" }],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("duplicate_id");
    }
  });

  it("rejects duplicate work item IDs and uses code 'duplicate_id'", () => {
    const plan = {
      ...validPlan,
      work_items: [
        { ...validPlan.work_items[0], id: "item-a", depends_on: [] },
        { ...validPlan.work_items[0], id: "item-a", depends_on: [] },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("duplicate_id");
    }
  });

  // ---- missing lane ----
  it("rejects work item referencing undefined lane and uses code 'missing_lane'", () => {
    const plan = {
      ...validPlan,
      work_items: [
        {
          ...validPlan.work_items[0],
          lane: "nonexistent-lane",
          depends_on: [],
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("missing_lane");
    }
  });

  // ---- missing dependency ----
  it("rejects depends_on referencing undefined work item and uses code 'missing_dependency'", () => {
    const plan = {
      ...validPlan,
      work_items: [{ ...validPlan.work_items[0], depends_on: ["ghost-item"] }],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("missing_dependency");
    }
  });

  // ---- duplicate dependency ----
  it("rejects duplicate entries in depends_on and uses code 'duplicate_dependency'", () => {
    const plan = {
      ...validPlan,
      work_items: [
        validPlan.work_items[0],
        {
          ...validPlan.work_items[1],
          depends_on: ["item-a", "item-a"],
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("duplicate_dependency");
    }
  });

  // ---- self-dependency ----
  it("rejects self-dependency and uses code 'self_dependency'", () => {
    const plan = {
      ...validPlan,
      work_items: [{ ...validPlan.work_items[0], depends_on: ["item-a"] }],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("self_dependency");
    }
  });

  // ---- cycle detection ----
  it("rejects a two-node cycle (A→B, B→A) and uses code 'cycle_detected'", () => {
    const plan = {
      ...validPlan,
      work_items: [
        { ...validPlan.work_items[0], id: "a", depends_on: ["b"] },
        { ...validPlan.work_items[1], id: "b", depends_on: ["a"] },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("cycle_detected");
    }
  });

  it("rejects a three-node cycle (A→B→C→A) and uses code 'cycle_detected'", () => {
    const plan = {
      ...validPlan,
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        {
          ...validPlan.work_items[0],
          id: "a",
          lane: "core",
          depends_on: ["b"],
        },
        {
          ...validPlan.work_items[0],
          id: "b",
          lane: "core",
          depends_on: ["c"],
        },
        {
          ...validPlan.work_items[0],
          id: "c",
          lane: "core",
          depends_on: ["a"],
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(codes(result.error)).toContain("cycle_detected");
    }
  });

  it("accepts a DAG with no cycles", () => {
    const plan = {
      ...validPlan,
      lanes: [{ id: "core", label: "Core" }],
      work_items: [
        { ...validPlan.work_items[0], id: "a", lane: "core", depends_on: [] },
        {
          ...validPlan.work_items[0],
          id: "b",
          lane: "core",
          depends_on: ["a"],
        },
        {
          ...validPlan.work_items[0],
          id: "c",
          lane: "core",
          depends_on: ["a", "b"],
        },
      ],
    };
    expect(schemaService.parse(plan).ok).toBe(true);
  });

  // ---- all violations returned ----
  it("returns all violations, not just the first one", () => {
    const plan = {
      ...validPlan,
      work_items: [
        // missing lane and missing dependency at the same time
        {
          ...validPlan.work_items[0],
          lane: "no-such-lane",
          depends_on: ["no-such-item"],
        },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(1);
      expect(codes(result.error)).toContain("missing_lane");
      expect(codes(result.error)).toContain("missing_dependency");
    }
  });

  // ---- issue shape ----
  it("each ValidationIssue has path, code, and message", () => {
    const plan = {
      ...validPlan,
      work_items: [
        { ...validPlan.work_items[0], lane: "unknown", depends_on: [] },
      ],
    };
    const result = schemaService.parse(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const issue of result.error) {
        expect(Array.isArray(issue.path)).toBe(true);
        expect(typeof issue.code).toBe("string");
        expect(issue.code.length).toBeGreaterThan(0);
        expect(typeof issue.message).toBe("string");
        expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
});
