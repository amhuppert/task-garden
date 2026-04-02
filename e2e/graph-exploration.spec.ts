import { expect, test } from "@playwright/test";

/**
 * Graph exploration tests (default project: VITE_PLAN_KEY=task-garden-v1).
 *
 * Requirement coverage: 4.1, 4.3, 4.4, 5.1, 6.1, 6.5, 7.5, 9.2, 10.1, 10.4
 * Covers node selection, scope changes, search, and filter interactions.
 *
 * Node IDs used:
 *   plan-runtime-config  — no dependencies, "done" status
 *   plan-source-subscription — depends on plan-runtime-config and plan-registry
 */

test.describe("graph exploration — node selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("details panel shows neutral state before any selection", async ({
    page,
  }) => {
    // NeutralState shows a 'Select a work item in the graph to see its details' prompt.
    await expect(
      page.getByText("Select a work item in the graph to see its details"),
    ).toBeVisible();
  });

  test("clicking a node shows it in the details panel", async ({ page }) => {
    // Click the Plan Runtime Config node inside the ReactFlow canvas.
    // ReactFlow renders node wrappers with data-id matching the node id.
    const node = page.locator(
      '.react-flow__node[data-id="plan-runtime-config"]',
    );
    await node.click();

    // Details panel should now show the work item title as a heading.
    // Use getByRole to avoid matching the same title text in the graph node.
    await expect(
      page.getByRole("heading", { name: "Plan Runtime Config" }),
    ).toBeVisible();
  });

  test("details panel shows item id, status chip after selection", async ({
    page,
  }) => {
    const node = page.locator(
      '.react-flow__node[data-id="plan-runtime-config"]',
    );
    await node.click();

    const detailsPanel = page.locator('[aria-label="Details and insights"]');
    // ID rendered as mono text above the title.
    await expect(detailsPanel.getByText("plan-runtime-config")).toBeVisible();
    // Status chip: item has status "done".
    await expect(detailsPanel.getByText("Done")).toBeVisible();
  });

  test("clicking a dependency in details panel selects that item", async ({
    page,
  }) => {
    // Select plan-source-subscription which depends on plan-runtime-config and plan-registry.
    const node = page.locator(
      '.react-flow__node[data-id="plan-source-subscription"]',
    );
    await node.click();

    const detailsPanel = page.locator('[aria-label="Details and insights"]');
    // The Dependencies section lists plan-runtime-config as a button.
    const depButton = detailsPanel.getByRole("button", {
      name: /plan-runtime-config/i,
    });
    await expect(depButton).toBeVisible();

    await depButton.click();

    // Details panel should now show plan-runtime-config.
    await expect(
      detailsPanel.getByText("Plan Runtime Config", { exact: true }),
    ).toBeVisible();
  });

  test("clicking the pane deselects the node and resets details", async ({
    page,
  }) => {
    const node = page.locator(
      '.react-flow__node[data-id="plan-runtime-config"]',
    );
    await node.click();
    await expect(
      page.getByRole("heading", { name: "Plan Runtime Config" }),
    ).toBeVisible();

    // Click the background pane to clear the selection.
    await page
      .locator(".react-flow__pane")
      .click({ position: { x: 50, y: 50 } });
    await expect(
      page.getByText("Select a work item in the graph to see its details"),
    ).toBeVisible();
  });
});

test.describe("graph exploration — search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("search input is visible in the controls sidebar", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await expect(
      sidebar.getByPlaceholder("Search title, tag, lane…"),
    ).toBeVisible();
  });

  test("typing in search filters graph to matching items", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    const searchInput = sidebar.getByPlaceholder("Search title, tag, lane…");

    await searchInput.fill("runtime");

    // At least the plan-runtime-config node should remain in the graph.
    await expect(
      page.locator('.react-flow__node[data-id="plan-runtime-config"]'),
    ).toBeVisible();
  });

  test("'Clear all filters' button appears when search is active", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    const searchInput = sidebar.getByPlaceholder("Search title, tag, lane…");

    await searchInput.fill("something");

    await expect(
      sidebar.getByRole("button", { name: "Clear all filters" }),
    ).toBeVisible();
  });

  test("clearing filters restores full graph", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    const searchInput = sidebar.getByPlaceholder("Search title, tag, lane…");

    await searchInput.fill("runtime");
    await sidebar.getByRole("button", { name: "Clear all filters" }).click();

    // After clearing, all nodes are restored (check a node that wouldn't match "runtime").
    await expect(
      page.locator('.react-flow__node[data-id="graph-analysis"]'),
    ).toBeVisible();
  });
});

test.describe("graph exploration — lane filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("lane filter buttons are visible in the controls sidebar", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // task-garden-v1 has lanes: Input Boundary, Domain, UI
    await expect(
      sidebar.getByRole("button", { name: "Input Boundary" }),
    ).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Domain" })).toBeVisible();
  });

  test("activating a lane filter shows the button as active", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    const laneBtn = sidebar.getByRole("button", { name: "Input Boundary" });

    await laneBtn.click();

    // The atlas-chip-active class is applied to active filter chips.
    await expect(laneBtn).toHaveClass(/atlas-chip-active/);
  });

  test("activating a lane filter filters nodes to that lane", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "Domain" }).click();

    // Domain-lane node should remain visible.
    await expect(
      page.locator('.react-flow__node[data-id="plan-schema"]'),
    ).toBeVisible();
  });
});

test.describe("graph exploration — scope controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("scope buttons other than 'All items' are disabled without a selection", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // Without a selection, only "All items" scope is enabled.
    await expect(
      sidebar.getByRole("button", { name: "Upstream" }),
    ).toBeDisabled();
    await expect(
      sidebar.getByRole("button", { name: "Downstream" }),
    ).toBeDisabled();
  });

  test("scope buttons are enabled after a node is selected", async ({
    page,
  }) => {
    const node = page.locator(
      '.react-flow__node[data-id="plan-source-subscription"]',
    );
    await node.click();

    const sidebar = page.locator('[aria-label="Plan controls"]');
    await expect(
      sidebar.getByRole("button", { name: "Upstream" }),
    ).toBeEnabled();
    await expect(
      sidebar.getByRole("button", { name: "Downstream" }),
    ).toBeEnabled();
  });

  test("clicking All items scope shows all nodes", async ({ page }) => {
    const node = page.locator(
      '.react-flow__node[data-id="plan-source-subscription"]',
    );
    await node.click();

    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "Upstream" }).click();
    await sidebar.getByRole("button", { name: "All items" }).click();

    // All items scope: All items button should be active (aria-pressed=true).
    await expect(
      sidebar.getByRole("button", { name: "All items" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("clearing selection resets scope to All items", async ({ page }) => {
    const node = page.locator(
      '.react-flow__node[data-id="plan-source-subscription"]',
    );
    await node.click();

    // Click background pane to clear.
    await page
      .locator(".react-flow__pane")
      .click({ position: { x: 50, y: 50 } });

    const sidebar = page.locator('[aria-label="Plan controls"]');
    // After clearing, All items scope button should be aria-pressed=true.
    await expect(
      sidebar.getByRole("button", { name: "All items" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Other scope buttons should be disabled.
    await expect(
      sidebar.getByRole("button", { name: "Upstream" }),
    ).toBeDisabled();
  });
});
