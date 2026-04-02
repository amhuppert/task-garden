import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Task Garden browser tests.
 *
 * Three test projects cover three app boot scenarios:
 *   default      - valid plan (VITE_PLAN_KEY=task-garden-v1) on port 5173
 *   invalid-plan - schema-invalid plan on port 5174
 *   missing-key  - unregistered plan key on port 5175
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
      testIgnore: ["**/invalid-plan.spec.ts", "**/missing-key.spec.ts"],
    },
    {
      name: "invalid-plan",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
      testMatch: ["**/invalid-plan.spec.ts"],
    },
    {
      name: "missing-key",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5175",
      },
      testMatch: ["**/missing-key.spec.ts"],
    },
  ],

  webServer: [
    {
      // Default project: valid plan loaded via .env (VITE_PLAN_KEY=task-garden-v1)
      command: "bun run dev --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Invalid plan project: plan parses as valid YAML but fails schema
      command: "bun run dev --port 5174",
      url: "http://localhost:5174",
      env: { VITE_PLAN_KEY: "invalid-plan-test" },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Missing-key project: plan key not registered in the plan registry
      command: "bun run dev --port 5175",
      url: "http://localhost:5175",
      env: { VITE_PLAN_KEY: "unregistered-plan-key" },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
