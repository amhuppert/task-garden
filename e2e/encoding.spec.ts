import { expect, test } from "@playwright/test";

/**
 * Encoding-change tests (default project: VITE_PLAN_KEY=task-garden-v1).
 *
 * Requirement coverage: 10.1, 10.4
 * Verifies that changing the color-mode or size-mode encoding selects
 * updates the reflected value on those controls (confirming the store change
 * propagated and would update the visual encoding of graph nodes).
 */

test.describe("color encoding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("Default color mode is shown on initial load", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await expect(sidebar.getByRole("combobox", { name: "Color" })).toHaveText(
      /Default/,
    );
  });

  test("switching to By Status color mode updates the select", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("combobox", { name: "Color" }).click();
    await page.getByRole("option", { name: "By Status" }).click();

    await expect(sidebar.getByRole("combobox", { name: "Color" })).toHaveText(
      /By Status/,
    );
  });

  test("switching to By Value color mode updates the select", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("combobox", { name: "Color" }).click();
    await page.getByRole("option", { name: "By Value", exact: true }).click();

    await expect(sidebar.getByRole("combobox", { name: "Color" })).toHaveText(
      /By Value/,
    );
  });

  test("switching to By Lane color mode updates the select", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("combobox", { name: "Color" }).click();
    await page.getByRole("option", { name: "By Lane" }).click();

    await expect(sidebar.getByRole("combobox", { name: "Color" })).toHaveText(
      /By Lane/,
    );
  });
});

test.describe("size encoding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("Uniform size mode is shown on initial load", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await expect(
      sidebar.getByRole("combobox", { name: "Node Size" }),
    ).toHaveText(/Uniform/);
  });

  test("switching to By Degree size mode updates the select", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("combobox", { name: "Node Size" }).click();
    await page.getByRole("option", { name: "By Degree" }).click();

    await expect(
      sidebar.getByRole("combobox", { name: "Node Size" }),
    ).toHaveText(/By Degree/);
  });

  test("switching to By Betweenness size mode updates the select", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("combobox", { name: "Node Size" }).click();
    await page.getByRole("option", { name: "By Betweenness" }).click();

    await expect(
      sidebar.getByRole("combobox", { name: "Node Size" }),
    ).toHaveText(/By Betweenness/);
  });
});
