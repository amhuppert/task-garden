import { describe, expect, it } from "vitest";
import { createReferenceResolver } from "./reference-resolver";

// Glob keys use absolute-from-root paths (leading slash), just like import.meta.glob produces.
const mockDocuments: Record<string, string> = {
  "/memory-bank/specs/design.md": "# Design Document\nContent here.",
  "/memory-bank/focus.md": "# Focus\nCurrent work.",
  "/src/docs/architecture.md": "# Architecture\nDetails here.",
};

describe("createReferenceResolver", () => {
  const resolver = createReferenceResolver(mockDocuments);

  describe("external URLs", () => {
    it("resolves an http URL as external_url without modification", () => {
      const result = resolver.resolve("http://example.com", "Example");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe("external_url");
        expect(result.value.href).toBe("http://example.com");
        expect(result.value.label).toBe("Example");
      }
    });

    it("resolves an https URL as external_url without modification", () => {
      const result = resolver.resolve("https://github.com/org/repo", "Repo");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe("external_url");
        expect(result.value.href).toBe("https://github.com/org/repo");
        expect(result.value.label).toBe("Repo");
      }
    });

    it("preserves the provided label for external URLs", () => {
      const result = resolver.resolve("https://example.com", "My Label");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.label).toBe("My Label");
      }
    });
  });

  describe("repo-relative Markdown paths", () => {
    it("resolves a registered document as bundled_document with raw content", () => {
      const result = resolver.resolve("memory-bank/specs/design.md", "Design");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe("bundled_document");
        expect(result.value.documentPath).toBe("memory-bank/specs/design.md");
        expect(result.value.rawDocument).toBe(
          "# Design Document\nContent here.",
        );
        expect(result.value.label).toBe("Design");
      }
    });

    it("resolves a nested registered document", () => {
      const result = resolver.resolve("src/docs/architecture.md", "Arch");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe("bundled_document");
        expect(result.value.documentPath).toBe("src/docs/architecture.md");
        expect(result.value.rawDocument).toBe("# Architecture\nDetails here.");
      }
    });

    it("returns document_not_registered for a well-formed path absent from the registry", () => {
      const result = resolver.resolve("docs/missing.md", "Missing");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("document_not_registered");
        expect(result.error.target).toBe("docs/missing.md");
        expect(result.error.message).toContain("docs/missing.md");
      }
    });

    it("returns document_not_registered for a root-level file not in registry", () => {
      const result = resolver.resolve("README.md", "Readme");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("document_not_registered");
      }
    });
  });

  describe("unsupported target formats", () => {
    it("returns unsupported_target_format for an ftp URL", () => {
      const result = resolver.resolve(
        "ftp://example.com/file" as string,
        "FTP",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
        expect(result.error.target).toBe("ftp://example.com/file");
        expect(result.error.message).toContain("ftp://example.com/file");
      }
    });

    it("returns unsupported_target_format for an absolute path", () => {
      const result = resolver.resolve(
        "/absolute/path.md" as string,
        "Absolute",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
      }
    });

    it("returns unsupported_target_format for a path starting with a dot", () => {
      const result = resolver.resolve("../traversal.md" as string, "Traversal");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
      }
    });

    it("returns unsupported_target_format for a non-md path with no URL scheme", () => {
      const result = resolver.resolve("some/file.txt" as string, "Text");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unsupported_target_format");
      }
    });
  });

  describe("empty registry", () => {
    const emptyResolver = createReferenceResolver({});

    it("still resolves external URLs with an empty registry", () => {
      const result = emptyResolver.resolve("https://example.com", "Link");
      expect(result.ok).toBe(true);
    });

    it("returns document_not_registered for any .md path with an empty registry", () => {
      const result = emptyResolver.resolve("memory-bank/focus.md", "Focus");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("document_not_registered");
      }
    });
  });
});
