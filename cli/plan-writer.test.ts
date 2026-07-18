import { describe, expect, test } from "vitest";
import { planWriter } from "./plan-writer";
import type { PlanPatch } from "./shared/patch-schema";

const SAMPLE_PLAN = `# Top-of-file comment about the plan
version: 1
plan_id: sample-plan
title: Sample Plan
last_updated: 2026-05-01
summary: A small plan used in writer tests.
estimate_unit: days

lanes:
  - id: alpha
    label: Alpha Lane
    description: First lane
  - id: beta
    label: Beta Lane

work_items:
  - id: item-one
    title: First item
    summary: The first item.
    lane: alpha
    status: planned # inline comment on status
    value: 60
    depends_on: []
    tags:
      - foo
    deliverables:
      - thing-one
    reuse_candidates: []
    links:
      - label: Docs
        href: https://example.com
    notes: original notes
    estimate: 2
  - id: item-two
    title: Second item
    summary: The second item.
    lane: beta
    status: ready
    value: 35
    depends_on:
      - item-one
    tags: []
    deliverables: []
    reuse_candidates: []
    links: []
`;

describe("planWriter.apply — work_item.field happy path", () => {
  test("setting status round-trips and preserves header and inline comments", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "status",
      value: "in_progress",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("status: in_progress");
    expect(result.nextSource).toContain("# Top-of-file comment about the plan");
    expect(result.nextSource).toContain("# inline comment on status");
  });

  test("setting title updates the work item title", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "title",
      value: "Renamed first item",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("title: Renamed first item");
    expect(result.nextSource).not.toContain("title: First item");
  });

  test("setting value updates the work item value", () => {
    const patch: PlanPatch = {
      kind: "work_item.value",
      target: { id: "item-one" },
      value: 100,
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("value: 100");
  });

  test("setting lane updates the work item lane", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "lane",
      value: "beta",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toMatch(/id: item-one[\s\S]*lane: beta/);
  });

  test("setting summary updates the work item summary", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "summary",
      value: "A new summary",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("summary: A new summary");
  });
});

describe("planWriter.apply — work_item.estimate", () => {
  test("setting an estimate writes the numeric magnitude", () => {
    const patch: PlanPatch = {
      kind: "work_item.estimate",
      target: { id: "item-two" },
      value: 5,
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toMatch(/id: item-two[\s\S]*estimate: 5/);
  });

  test("setting estimate to null deletes the estimate key", () => {
    const patch: PlanPatch = {
      kind: "work_item.estimate",
      target: { id: "item-one" },
      value: null,
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemOneBlock = result.nextSource.split("- id: item-two")[0];
    expect(itemOneBlock).not.toContain("estimate:");
  });
});

describe("planWriter.apply — notes nullable", () => {
  test("setting notes to a string sets the value", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "notes",
      value: "updated notes content",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("notes: updated notes content");
  });

  test("setting notes to null deletes the notes key", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "notes",
      value: null,
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemOneBlock = result.nextSource.split("- id: item-two")[0];
    expect(itemOneBlock).not.toContain("notes:");
  });
});

describe("planWriter.apply — replace-array kinds", () => {
  test("work_item.tags replaces the tags list entirely", () => {
    const patch: PlanPatch = {
      kind: "work_item.tags",
      target: { id: "item-one" },
      value: ["bar", "baz"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemOneBlock = result.nextSource.split("- id: item-two")[0];
    expect(itemOneBlock).toContain("- bar");
    expect(itemOneBlock).toContain("- baz");
    expect(itemOneBlock).not.toContain("- foo");
    expect(itemOneBlock).toContain("title: First item");
    expect(itemOneBlock).toContain("status: planned");
  });

  test("work_item.depends_on replaces the depends_on list", () => {
    const patch: PlanPatch = {
      kind: "work_item.depends_on",
      target: { id: "item-two" },
      value: [],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemTwoBlock = result.nextSource.split("- id: item-two")[1] ?? "";
    expect(itemTwoBlock).not.toContain("- item-one");
    expect(itemTwoBlock).toContain("depends_on:");
    expect(result.nextSource).toContain("title: Second item");
    expect(result.nextSource).toContain("status: ready");
  });

  test("work_item.string_list deliverables replaces the list", () => {
    const patch: PlanPatch = {
      kind: "work_item.string_list",
      target: { id: "item-one" },
      field: "deliverables",
      value: ["new-output-a", "new-output-b"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemOneBlock = result.nextSource.split("- id: item-two")[0];
    expect(itemOneBlock).toContain("- new-output-a");
    expect(itemOneBlock).toContain("- new-output-b");
    expect(itemOneBlock).not.toContain("- thing-one");
    expect(itemOneBlock).toContain("title: First item");
  });

  test("work_item.string_list reuse_candidates replaces the list", () => {
    const patch: PlanPatch = {
      kind: "work_item.string_list",
      target: { id: "item-one" },
      field: "reuse_candidates",
      value: ["existing-helper"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemOneBlock = result.nextSource.split("- id: item-two")[0];
    expect(itemOneBlock).toContain("- existing-helper");
  });

  test("work_item.links replaces the links array", () => {
    const patch: PlanPatch = {
      kind: "work_item.links",
      target: { id: "item-one" },
      value: [
        { label: "New Docs", href: "https://new.example.com" },
        { label: "Local Doc", href: "docs/readme.md" },
      ],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemOneBlock = result.nextSource.split("- id: item-two")[0];
    expect(itemOneBlock).toContain("label: New Docs");
    expect(itemOneBlock).toContain("href: https://new.example.com");
    expect(itemOneBlock).toContain("label: Local Doc");
    expect(itemOneBlock).toContain("href: docs/readme.md");
    expect(itemOneBlock).not.toContain("label: Docs");
    expect(itemOneBlock).not.toContain("href: https://example.com");
    expect(itemOneBlock).toContain("title: First item");
  });

  test("work_item.create appends a new work item at the end and preserves header comment", () => {
    const patch: PlanPatch = {
      kind: "work_item.create",
      value: {
        id: "item-three",
        title: "Third item",
        summary: "Newly added.",
        lane: "alpha",
        status: "planned",
        value: 35,
        depends_on: [],
        tags: [],
        deliverables: [],
        reuse_candidates: [],
        links: [],
      },
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("# Top-of-file comment about the plan");
    const idxOne = result.nextSource.indexOf("id: item-one");
    const idxTwo = result.nextSource.indexOf("id: item-two");
    const idxThree = result.nextSource.indexOf("id: item-three");
    expect(idxOne).toBeGreaterThan(-1);
    expect(idxTwo).toBeGreaterThan(-1);
    expect(idxThree).toBeGreaterThan(idxTwo);
    expect(result.nextSource).not.toMatch(
      /work_items:[\s\S]*\{[^}]*id: item-three/,
    );
    expect(result.nextSource).toContain("title: First item");
    expect(result.nextSource).toContain("title: Second item");
  });

  test("plan.field updates plan title", () => {
    const patch: PlanPatch = {
      kind: "plan.field",
      field: "title",
      value: "Renamed Plan",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("title: Renamed Plan");
  });

  test("plan.field updates last_updated", () => {
    const patch: PlanPatch = {
      kind: "plan.field",
      field: "last_updated",
      value: "2026-06-15",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("last_updated: 2026-06-15");
  });

  test("plan.field updates summary", () => {
    const patch: PlanPatch = {
      kind: "plan.field",
      field: "summary",
      value: "A new top-level summary.",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("A new top-level summary.");
  });

  test("plan.references replaces references array", () => {
    const patch: PlanPatch = {
      kind: "plan.references",
      value: [{ label: "Spec", href: "spec.md" }],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("label: Spec");
    expect(result.nextSource).toContain("href: spec.md");
  });

  test("lane.field updates lane label", () => {
    const patch: PlanPatch = {
      kind: "lane.field",
      target: { id: "alpha" },
      field: "label",
      value: "Alpha Renamed",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("label: Alpha Renamed");
  });

  test("lane.field description null deletes the description key", () => {
    const patch: PlanPatch = {
      kind: "lane.field",
      target: { id: "alpha" },
      field: "description",
      value: null,
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const alphaBlock = result.nextSource.split("- id: beta")[0];
    expect(alphaBlock).not.toContain("description:");
  });

  test("lane.field description set updates value", () => {
    const patch: PlanPatch = {
      kind: "lane.field",
      target: { id: "alpha" },
      field: "description",
      value: "A new description",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toContain("description: A new description");
  });

  test("lane.field color set updates value", () => {
    const patch: PlanPatch = {
      kind: "lane.field",
      target: { id: "alpha" },
      field: "color",
      value: "#ff0000",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextSource).toMatch(/color:\s*['"]?#ff0000['"]?/);
  });

  test("lane.field color null deletes the color key when present", () => {
    const planWithColor = SAMPLE_PLAN.replace(
      "    description: First lane",
      "    description: First lane\n    color: red",
    );
    const patch: PlanPatch = {
      kind: "lane.field",
      target: { id: "alpha" },
      field: "color",
      value: null,
    };

    const result = planWriter.apply(planWithColor, patch);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const alphaBlock = result.nextSource.split("- id: beta")[0];
    expect(alphaBlock).not.toContain("color:");
  });

  test("work_item.depends_on surfaces cycle_detected from schemaService", () => {
    const patch: PlanPatch = {
      kind: "work_item.depends_on",
      target: { id: "item-one" },
      value: ["item-two"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("validation");
    if (result.failure.type !== "validation") return;
    expect(result.failure.issues.some((i) => i.code === "cycle_detected")).toBe(
      true,
    );
  });
});

describe("planWriter.apply — failure paths", () => {
  test("yaml_parse returned on malformed source", () => {
    const malformed = "version: 1\nplan_id: x\n  : : : : bad\n  - oops\n";
    const patch: PlanPatch = {
      kind: "plan.field",
      field: "title",
      value: "Anything",
    };

    const result = planWriter.apply(malformed, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("yaml_parse");
  });

  test("target_not_found for work_item.field with unknown id", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "no-such-id" },
      field: "status",
      value: "done",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("target_not_found");
    if (result.failure.type !== "target_not_found") return;
    expect(result.failure.target.id).toBe("no-such-id");
    expect(result.failure.target.kind).toBe("work_item");
  });

  test("target_not_found for lane.field with unknown id", () => {
    const patch: PlanPatch = {
      kind: "lane.field",
      target: { id: "no-such-lane" },
      field: "label",
      value: "X",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("target_not_found");
    if (result.failure.type !== "target_not_found") return;
    expect(result.failure.target.id).toBe("no-such-lane");
    expect(result.failure.target.kind).toBe("lane");
  });

  test("validation: self_dependency", () => {
    const patch: PlanPatch = {
      kind: "work_item.depends_on",
      target: { id: "item-one" },
      value: ["item-one"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("validation");
    if (result.failure.type !== "validation") return;
    expect(
      result.failure.issues.some((i) => i.code === "self_dependency"),
    ).toBe(true);
  });

  test("validation: duplicate_dependency", () => {
    const patch: PlanPatch = {
      kind: "work_item.depends_on",
      target: { id: "item-two" },
      value: ["item-one", "item-one"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("validation");
    if (result.failure.type !== "validation") return;
    expect(
      result.failure.issues.some((i) => i.code === "duplicate_dependency"),
    ).toBe(true);
  });

  test("validation: missing_dependency", () => {
    const patch: PlanPatch = {
      kind: "work_item.depends_on",
      target: { id: "item-two" },
      value: ["ghost-item"],
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("validation");
    if (result.failure.type !== "validation") return;
    expect(
      result.failure.issues.some((i) => i.code === "missing_dependency"),
    ).toBe(true);
  });

  test("validation: missing_lane when setting lane to unknown id", () => {
    const patch: PlanPatch = {
      kind: "work_item.field",
      target: { id: "item-one" },
      field: "lane",
      value: "ghost-lane",
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("validation");
    if (result.failure.type !== "validation") return;
    expect(result.failure.issues.some((i) => i.code === "missing_lane")).toBe(
      true,
    );
  });

  test("validation: duplicate_id when creating a work item with an existing id", () => {
    const patch: PlanPatch = {
      kind: "work_item.create",
      value: {
        id: "item-one",
        title: "Duplicate",
        summary: "Has same id as existing item.",
        lane: "alpha",
        status: "planned",
        value: 35,
        depends_on: [],
        tags: [],
        deliverables: [],
        reuse_candidates: [],
        links: [],
      },
    };

    const result = planWriter.apply(SAMPLE_PLAN, patch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("validation");
    if (result.failure.type !== "validation") return;
    expect(result.failure.issues.some((i) => i.code === "duplicate_id")).toBe(
      true,
    );
  });
});
