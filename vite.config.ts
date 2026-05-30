import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const isAI = process.env.CLAUDECODE === "1";
const isCI = process.env.CI === "true";

function getReporters(): string[] {
  if (isCI) return ["dot", "github-actions"];
  if (isAI) return ["dot"];
  return ["default"];
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    // The plan YAML is owned by taskGardenPlanServerPlugin: it watches the
    // file and pushes updates via SSE. Letting vite watch it too causes a
    // full HMR page reload on every edit (visible as a loading-state flash).
    // `.debug/**` is the debug-mode log/artifact dir; watching it creates a
    // feedback loop when in-app probes append to logs.jsonl.
    watch: { ignored: ["**/src/plans/**", "**/.debug/**"] },
  },
  test: {
    environment: "node",
    exclude: ["e2e/**", "node_modules/**"],
    reporters: getReporters(),
    ...(isAI && {
      bail: 3,
      onConsoleLog() {
        return false;
      },
      onStackTrace(_error, { file }) {
        if (file.includes("node_modules")) return false;
      },
      diff: {
        truncateThreshold: 2000,
        truncateAnnotation: "... diff truncated",
        expand: false,
      },
    }),
  },
});
