import { expect, test } from "@playwright/test";

/**
 * Encoding-change tests (default project: VITE_PLAN_KEY=task-garden-v1).
 *
 * Requirement coverage: 10.1, 10.4
 * Verifies that changing the color-mode or size-mode encoding controls
 * updates the active state of those buttons (confirming the store change
 * propagated and would update the visual encoding of graph nodes).
 */

test.describe("color encoding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("Default color mode is active on initial load", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await expect(
      sidebar.getByRole("button", { name: "Default" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("switching to By Status color mode activates that button", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "By Status" }).click();

    await expect(
      sidebar.getByRole("button", { name: "By Status" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Default button should no longer be active.
    await expect(
      sidebar.getByRole("button", { name: "Default" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("switching to By Priority color mode activates that button", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "By Priority" }).click();

    await expect(
      sidebar.getByRole("button", { name: "By Priority" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("switching to By Lane color mode activates that button", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await sidebar.getByRole("button", { name: "By Lane" }).click();

    await expect(
      sidebar.getByRole("button", { name: "By Lane" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("inline active color mode label updates in the Color section header", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // Switch to By Status.
    await sidebar.getByRole("button", { name: "By Status" }).click();
    // The toolbar shows the active mode label inline next to the section heading.
    // Use first() because both the button and the header span contain "By Status".
    await expect(sidebar.getByText("By Status").first()).toBeVisible();
  });
});

test.describe("size encoding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Plan graph visualization"]'),
    ).toBeVisible();
  });

  test("Uniform size mode is active on initial load", async ({ page }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    await expect(
      sidebar.getByRole("button", { name: "Uniform" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("switching to By Degree size mode activates that button", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // "By Degree" appears in both Color and Node Size sections — scope to Node Size.
    const sizeSection = sidebar
      .locator("section")
      .filter({ hasText: "Node Size" });
    await sizeSection.getByRole("button", { name: "By Degree" }).click();

    await expect(
      sizeSection.getByRole("button", { name: "By Degree" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      sizeSection.getByRole("button", { name: "Uniform" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("switching to By Betweenness size mode activates that button", async ({
    page,
  }) => {
    const sidebar = page.locator('[aria-label="Plan controls"]');
    // "By Betweenness" appears in both Color and Node Size sections — scope to Node Size.
    const sizeSection = sidebar
      .locator("section")
      .filter({ hasText: "Node Size" });
    await sizeSection.getByRole("button", { name: "By Betweenness" }).click();

    await expect(
      sizeSection.getByRole("button", { name: "By Betweenness" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
