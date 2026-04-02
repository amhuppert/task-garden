import { expect, test } from "@playwright/test";

/**
 * Lane visibility tests (default project: VITE_PLAN_KEY=task-garden-v1).
 *
 * Requirement coverage: 5.1, 5.4, 7.5
 * task-garden-v1.yaml has three lanes: input, domain, ui.
 * Verifies that lane bands are rendered and distinct in the graph, and
 * that work items in each lane are visible in the graph canvas.
 */

test.describe("multi-lane plan — lane band visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("lane band labels are visible in the graph canvas", async ({ page }) => {
    const canvas = page.locator('[aria-label="Plan graph visualization"]');
    // LaneBandNode renders each lane label inside a .react-flow__node-laneBand node.
    // Work item nodes also show lane labels, so we scope to the laneBand node type.
    // task-garden-v1 has lanes: Input Boundary, Domain, UI.
    const laneBands = canvas.locator(".react-flow__node-laneBand");
    await expect(
      laneBands.filter({ hasText: "Input Boundary" }).first(),
    ).toBeVisible();
    await expect(laneBands.filter({ hasText: "Domain" }).first()).toBeVisible();
    await expect(laneBands.filter({ hasText: "UI" }).first()).toBeVisible();
  });

  test("work items from different lanes are all present in the graph", async ({
    page,
  }) => {
    // input lane item
    await expect(
      page.locator('.react-flow__node[data-id="plan-runtime-config"]'),
    ).toBeVisible();
    // domain lane item
    await expect(
      page.locator('.react-flow__node[data-id="plan-schema"]'),
    ).toBeVisible();
    // ui lane item — check flow-projection since it's in domain, check a ui item
    await expect(
      page.locator('.react-flow__node[data-id="graph-analysis"]'),
    ).toBeVisible();
  });

  test("lane filter buttons match the plan-authored lanes", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // The toolbar shows one chip per lane derived from the plan.
    await expect(
      sidebar.getByRole("button", { name: "Input Boundary" }),
    ).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Domain" })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "UI" })).toBeVisible();
  });

  test("lane band nodes are rendered (different node type from work items)", async ({
    page,
  }) => {
    // Lane band nodes are rendered with type "laneBand", while work items are "workItem".
    // Both appear in the ReactFlow canvas as .react-flow__node elements.
    const laneBandNodes = page.locator(
      ".react-flow__node.react-flow__node-laneBand",
    );
    const count = await laneBandNodes.count();
    // Should have one lane band per lane (3 lanes in task-garden-v1).
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("single-lane behavior: filtering to one lane still shows graph", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // Activate the Domain lane filter.
    await sidebar.getByRole("button", { name: "Domain" }).click();

    // Graph canvas should still be visible (not empty state with no nodes).
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
    // At least the plan-schema node (domain lane) should be visible.
    await expect(
      page.locator('.react-flow__node[data-id="plan-schema"]'),
    ).toBeVisible();
  });
});
