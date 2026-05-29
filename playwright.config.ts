import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Task Garden browser tests.
 *
 * Two test projects cover two app boot scenarios:
 *   default      - valid plan (src/plans/task-garden-v1.taskgarden.yaml) on port 5173
 *   invalid-plan - schema-invalid plan (src/plans/invalid-plan-test.taskgarden.yaml) on port 5174
 *
 * All projects use a 1280×720 desktop viewport so the fixed sidebar layout
 * is always visible without mobile drawer toggling.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",

  use: {
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "default",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5173",
      },
      testIgnore: ["**/invalid-plan.spec.ts"],
    },
    {
      name: "invalid-plan",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
      testMatch: ["**/invalid-plan.spec.ts"],
    },
  ],

  webServer: [
    {
      command: "bun run dev src/plans/task-garden-v1.taskgarden.yaml --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "bun run dev src/plans/invalid-plan-test.taskgarden.yaml --port 5174",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
