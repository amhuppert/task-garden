import { describe, expect, it } from "vitest";
import { classifyReference } from "./reference-resolver";

describe("classifyReference", () => {
  describe("external URLs", () => {
    it("classifies an http URL as external_url", () => {
      const result = classifyReference("http://example.com", "Example");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe("external_url");
        if (result.value.kind === "external_url") {
          expect(result.value.href).toBe("http://example.com");
          expect(result.value.label).toBe("Example");
        }
      }
    });

    it("classifies an https URL as external_url", () => {
      const result = classifyReference("https://github.com/org/repo", "Repo");
      expect(result.ok).toBe(true);
      if (result.ok && result.value.kind === "external_url") {
        expect(result.value.href).toBe("https://github.com/org/repo");
        expect(result.value.label).toBe("Repo");
      }
    });

    it("preserves the provided label for external URLs", () => {
      const result = classifyReference("https://example.com", "My Label");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.label).toBe("My Label");
      }
    });
  });

  describe("relative file paths", () => {
    it("classifies a nested .md path as document_path", () => {
      const result = classifyReference("memory-bank/specs/design.md", "Design");
      expect(result.ok).toBe(true);
      if (result.ok && result.value.kind === "document_path") {
        expect(result.value.documentPath).toBe("memory-bank/specs/design.md");
        expect(result.value.label).toBe("Design");
      }
    });

    it("classifies a root-level .md path as document_path", () => {
      const result = classifyReference("README.md", "Readme");
      expect(result.ok).toBe(true);
      if (result.ok && result.value.kind === "document_path") {
        expect(result.value.documentPath).toBe("README.md");
      }
    });

    it("classifies a deeply nested .md path as document_path", () => {
      const result = classifyReference("src/docs/architecture.md", "Arch");
      expect(result.ok).toBe(true);
      if (result.ok && result.value.kind === "document_path") {
        expect(result.value.documentPath).toBe("src/docs/architecture.md");
      }
    });

    it("classifies dot-prefixed and extensionless file paths as document_path", () => {
      const targets = [
        ".taskgarden-notes.md",
        ".kiro/specs/task-garden/design.md",
        "docs/README",
        "docs/release..notes.md",
        "./local.md",
      ];

      for (const target of targets) {
        const result = classifyReference(target, "Reference");
        expect(result.ok, `expected ok for ${target}`).toBe(true);
        if (result.ok && result.value.kind === "document_path") {
          expect(result.value.documentPath).toBe(target);
        }
      }
    });
  });

  describe("unsupported target formats", () => {
    it("rejects an ftp URL", () => {
      const result = classifyReference("ftp://example.com/file", "FTP");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
        expect(result.error.target).toBe("ftp://example.com/file");
        expect(result.error.message).toContain("ftp://example.com/file");
      }
    });

    it("rejects an absolute path", () => {
      const result = classifyReference("/absolute/path.md", "Absolute");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
      }
    });

    it("rejects a path containing '..'", () => {
      const result = classifyReference("../traversal.md", "Traversal");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
      }
    });

    it("rejects a path with no file name", () => {
      const result = classifyReference("docs/", "Directory");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
      }
    });
  });
});
