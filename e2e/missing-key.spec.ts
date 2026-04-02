import { expect, test } from "@playwright/test";

/**
 * Error-state tests (missing-key project: VITE_PLAN_KEY=unregistered-plan-key).
 *
 * Requirement coverage: 1.1, 1.3, 1.4
 * Verifies that when the plan key resolves to an unregistered plan the app
 * shows a clear source-error state rather than a blank screen or loading spinner.
 */

test.describe("error state — plan not registered", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows plan source error heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Plan Source Error" }),
    ).toBeVisible();
  });

  test("error message names the unregistered plan key", async ({ page }) => {
    await expect(page.getByText(/unregistered-plan-key/)).toBeVisible();
  });

  test("error message includes actionable guidance", async ({ page }) => {
    // Message should tell the user how to fix the problem (add a YAML file).
    await expect(page.getByText(/not registered/i)).toBeVisible();
  });

  test("no graph canvas rendered in error state", async ({ page }) => {
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).not.toBeVisible();
  });
});
