import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  ReferenceClassification,
  ReferenceClassificationFailure,
} from "../../lib/plan/reference-resolver";
import { ResourceLink } from "./ResourceLink";

type ClassifyResult =
  | { ok: true; value: ReferenceClassification }
  | { ok: false; error: ReferenceClassificationFailure };

describe("ResourceLink", () => {
  describe("success state — external_url", () => {
    const result: ClassifyResult = {
      ok: true,
      value: {
        kind: "external_url",
        label: "GitHub Repo",
        href: "https://github.com/org/repo",
      },
    };

    it("renders an anchor element with target=_blank", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="GitHub Repo"
          target="https://github.com/org/repo"
          result={result}
        />,
      );
      expect(html).toContain("<a ");
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("renders the authored label verbatim", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="GitHub Repo"
          target="https://github.com/org/repo"
          result={result}
        />,
      );
      expect(html).toContain("GitHub Repo");
    });

    it("uses the icon preset from detectLinkPreset, not label text", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="GitHub Repo"
          target="https://github.com/org/repo"
          result={result}
        />,
      );
      expect(html).toContain('data-icon="github"');
    });
  });

  describe("success state — document_path", () => {
    const result: ClassifyResult = {
      ok: true,
      value: {
        kind: "document_path",
        label: "Focus",
        documentPath: "memory-bank/focus.md",
      },
    };

    it("renders a button element", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Focus"
          target="memory-bank/focus.md"
          result={result}
        />,
      );
      expect(html).toContain('<button type="button"');
    });

    it("renders the authored label verbatim", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Focus"
          target="memory-bank/focus.md"
          result={result}
        />,
      );
      expect(html).toContain("Focus");
    });

    it("uses the file icon preset for document_path references", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Focus"
          target="memory-bank/focus.md"
          result={result}
        />,
      );
      expect(html).toContain('data-icon="file"');
    });
  });

  describe("failure state", () => {
    const failedResult: ClassifyResult = {
      ok: false,
      error: {
        type: "unsupported_target_format",
        target: "docs/missing.md",
        message:
          'Reference target "docs/missing.md" is not a supported format.',
      },
    };

    it("renders a disabled button", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Missing Doc"
          target="docs/missing.md"
          result={failedResult}
        />,
      );
      expect(html).toContain("<button");
      expect(html).toContain("disabled");
    });

    it("renders the authored label unchanged", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Missing Doc"
          target="docs/missing.md"
          result={failedResult}
        />,
      );
      expect(html).toContain("Missing Doc");
    });

    it("includes the error message in the title attribute", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Missing Doc"
          target="docs/missing.md"
          result={failedResult}
        />,
      );
      expect(html).toContain("title=");
      expect(html).toContain("docs/missing.md");
    });

    it("uses the file icon for a .md target even on failure", () => {
      const html = renderToStaticMarkup(
        <ResourceLink
          label="Missing Doc"
          target="docs/missing.md"
          result={failedResult}
        />,
      );
      expect(html).toContain('data-icon="file"');
    });

    it("uses the brand icon for a github URL even on failure", () => {
      const githubFail: ClassifyResult = {
        ok: false,
        error: {
          type: "unsupported_target_format",
          target: "https://github.com/org/repo",
          message: "Something went wrong",
        },
      };
      const html = renderToStaticMarkup(
        <ResourceLink
          label="GH Link"
          target="https://github.com/org/repo"
          result={githubFail}
        />,
      );
      expect(html).toContain('data-icon="github"');
    });
  });
});
