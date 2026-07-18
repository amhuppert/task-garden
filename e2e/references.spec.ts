import { expect, test } from "@playwright/test";

/**
 * Reference-following tests (default project: VITE_PLAN_KEY=task-garden-v1).
 *
 * Requirement coverage: 2.2, 8.1, 8.4
 * task-garden-v1.taskgarden.yaml has plan-level references:
 *   - memory-bank/focus.md        (bundled document → preview button)
 *   - memory-bank/schema-proposal.md (bundled document → preview button)
 *
 * A work item (plan-schema) has a link:
 *   - label: Schema Proposal, href: memory-bank/schema-proposal.md (bundled document)
 *
 * NOTE: task-garden-v1.taskgarden.yaml has only bundled-document references. External URL
 * references would be tested if the plan contained https:// links.
 */

test.describe("plan-level references", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("plan references render as editable labels and hrefs in plan details", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "Plan details" }).click();

    await expect(page.getByLabel("Reference label 1")).toHaveValue("Focus");
    await expect(page.getByLabel("Reference href 1")).toHaveValue(
      "memory-bank/focus.md",
    );
    await expect(page.getByLabel("Reference label 2")).toHaveValue(
      "Schema Proposal",
    );
  });

  test("plan reference fields show authored relative document paths", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "Plan details" }).click();

    await expect(page.getByLabel("Reference href 2")).toHaveValue(
      "memory-bank/schema-proposal.md",
    );
  });

  test("plan references can be edited from the details popover", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "Plan details" }).click();

    await expect(page.getByTestId("plan-ref-add")).toBeVisible();
  });
});

test.describe("work item link references", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("work item link renders in details panel when item is selected", async ({
    page,
  }) => {
    // plan-schema has a link: { label: "Schema Proposal", href: "memory-bank/schema-proposal.md" }
    const node = page.locator('.react-flow__node[data-id="plan-schema"]');
    await node.click();

    const detailsPanel = page.locator('[aria-label="Details and insights"]');
    // A link with the "Schema Proposal" label (or similar) should appear.
    const link = detailsPanel
      .locator("button, a")
      .filter({ hasText: "Schema Proposal" });
    await expect(link.first()).toBeVisible();
  });
});
