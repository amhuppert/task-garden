import { expect, test } from "@playwright/test";

/**
 * Invalid plan tests (invalid-plan project: VITE_PLAN_KEY=invalid-plan-test).
 *
 * Requirement coverage: 2.2, 3.1, 3.2, 3.5
 * Verifies that when the selected plan YAML fails schema validation the app
 * shows actionable validation feedback and does NOT render a stale graph.
 *
 * The `invalid-plan-test` fixture (src/plans/invalid-plan-test.taskgarden.yaml) is a
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

  test("validation summary and failure heading are shown", async ({ page }) => {
    // The alert carries a brief summary (title + issue count); the heading
    // renders as ordinary navigable content outside the alert region.
    await expect(page.getByRole("alert")).toContainText("Invalid plan");
    await expect(page.getByRole("alert")).toContainText(/\d+ issues? found/);
    await expect(
      page.getByRole("heading", { name: "Invalid plan" }),
    ).toBeVisible();
  });

  test("validation feedback includes the failing work item", async ({
    page,
  }) => {
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/task-a/)).toBeVisible();
    await expect(page.getByText(/does-not-exist-lane/)).toBeVisible();
  });

  test("at least one validation issue is listed", async ({ page }) => {
    await expect(page.getByRole("alert")).toBeVisible();
    // The invalid plan has a work item referencing a non-existent lane, so at
    // least one validation issue row renders (as navigable content outside the
    // alert region).
    await expect(page.locator("li").first()).toBeVisible();
  });
});
