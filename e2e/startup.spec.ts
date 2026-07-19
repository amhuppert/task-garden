import { expect, test } from "@playwright/test";

/**
 * App startup tests (default project: VITE_PLAN_KEY=task-garden-v1).
 *
 * Requirement coverage: 1.1, 1.2, 1.3, 1.4
 * Verifies that when the app starts with a valid plan key the graph workspace
 * is shown with the plan title and summary visible.
 */

test.describe("startup — valid plan", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("graph workspace is visible after load", async ({ page }) => {
    // The plan graph canvas renders once processing reaches ready state.
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("plan title is visible in the overview header", async ({ page }) => {
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Task Garden V1" }),
    ).toBeVisible();
  });

  test("plan summary is visible in the overview header", async ({ page }) => {
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "Plan details" }).click();
    await expect(page.getByLabel("Summary")).toHaveValue(
      /Initial implementation plan/,
    );
  });

  test("plan controls sidebar is visible on desktop", async ({ page }) => {
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
    await expect(page.locator('[aria-label="Plan controls"]')).toBeVisible();
  });

  test("details and insights sidebar is visible on desktop", async ({
    page,
  }) => {
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
    await expect(
      page.locator('[aria-label="Details and insights"]'),
    ).toBeVisible();
  });

  test("no loading or error state shown for valid plan", async ({ page }) => {
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
    // Persistent live regions stay mounted (empty) by design, so "no error
    // state" means every alert region is contentless.
    for (const text of await page.getByRole("alert").allTextContents()) {
      expect(text).toBe("");
    }
    await expect(
      page.getByRole("status", { name: "Loading plan" }),
    ).not.toBeVisible();
  });
});
