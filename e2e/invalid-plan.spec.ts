import { expect, test } from "@playwright/test";

/**
 * Invalid plan tests (invalid-plan project: VITE_PLAN_KEY=invalid-plan-test).
 *
 * Requirement coverage: 2.2, 3.1, 3.2, 3.5
 * Verifies that when the selected plan YAML fails schema validation the app
 * shows actionable validation feedback and does NOT render a stale graph.
 *
 * The `invalid-plan-test` fixture (src/plans/invalid-plan-test.yaml) is a
 * YAML file that parses successfully but references a lane that doesn't exist.
 */

test.describe("invalid plan — schema validation failure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows validation alert rather than graph", async ({ page }) => {
    // PlanValidationState renders role="alert" for the invalid case.
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("no graph canvas rendered when plan is invalid", async ({ page }) => {
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).not.toBeVisible();
  });

  test("validation alert contains failure heading", async ({ page }) => {
    await expect(page.getByRole("alert")).toBeVisible();
    // PlanValidationState shows the failure type heading derived from getFailureTitle().
    await expect(page.getByRole("alert").locator("h2")).toBeVisible();
  });

  test("validation feedback includes plan key", async ({ page }) => {
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/invalid-plan-test/)).toBeVisible();
  });

  test("at least one validation issue is listed", async ({ page }) => {
    await expect(page.getByRole("alert")).toBeVisible();
    // The invalid plan has a work item referencing a non-existent lane, so
    // at least one validation issue entry should appear in the alert region.
    const alertRegion = page.getByRole("alert");
    // ValidationIssueList renders individual issue rows inside the alert.
    const issueItems = alertRegion.locator("li");
    await expect(issueItems.first()).toBeVisible();
  });
});
