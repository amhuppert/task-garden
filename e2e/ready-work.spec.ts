import { expect, test } from "@playwright/test";

/**
 * Ready-work tests use the default valid plan.
 *
 * The controlled sorting cases live in PlanInsightsPanel.test.tsx; this browser
 * check verifies the rendered workspace exposes the new Ready insight surface.
 */

test.describe("ready work insights", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("Ready tab shows unblocked work and value-effort rankings", async ({
    page,
  }) => {
    const rightPanel = page.locator('[aria-label="Details and insights"]');

    await rightPanel.getByRole("tab", { name: "Insights" }).click();
    const insights = page.locator('[aria-label="Plan Insights"]');

    await insights.getByRole("tab", { name: "Ready" }).click();

    await expect(
      insights.getByRole("heading", { name: "Ready Work" }),
    ).toBeVisible();
    await expect(
      insights.getByRole("heading", { name: "Best Value / Effort" }),
    ).toBeVisible();
    await expect(
      insights.getByRole("heading", { name: "Highest Value" }),
    ).toBeVisible();

    await expect(insights.getByText("Task Garden Plan Schema")).toHaveCount(2);
    await expect(insights.getByText("Processing Pipeline")).toHaveCount(0);
  });
});
