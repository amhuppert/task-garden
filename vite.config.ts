import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
/// <reference types="vitest/config" />
import { defineConfig } from "vite";

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
