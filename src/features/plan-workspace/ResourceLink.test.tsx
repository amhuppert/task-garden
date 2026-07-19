// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ReferenceClassification,
  ReferenceClassificationFailure,
} from "../../lib/plan/reference-resolver";
import { ResourceLink } from "./ResourceLink";
import { TooltipProvider } from "./ui/Tooltip";
import { installRadixDomShims } from "./ui/test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

type ClassifyResult =
  | { ok: true; value: ReferenceClassification }
  | { ok: false; error: ReferenceClassificationFailure };

function renderChip(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

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

    function renderExternal() {
      return renderChip(
        <ResourceLink
          label="GitHub Repo"
          target="https://github.com/org/repo"
          result={result}
        />,
      );
    }

    it("renders an anchor element with target=_blank", () => {
      renderExternal();
      const link = screen.getByRole("link");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("renders the authored label verbatim", () => {
      renderExternal();
      expect(screen.getByText("GitHub Repo")).toBeTruthy();
    });

    it("announces that the link opens in a new tab via visually-hidden text", () => {
      renderExternal();
      const link = screen.getByRole("link");
      expect(link.textContent).toContain("(opens in new tab)");
    });

    it("uses the icon preset from detectLinkPreset, not label text", () => {
      const { container } = renderExternal();
      expect(container.querySelector('[data-icon="github"]')).toBeTruthy();
    });

    it("shows the label and target in a tooltip on focus", async () => {
      const user = userEvent.setup();
      renderExternal();
      await user.tab();

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip.textContent).toBe(
        "GitHub Repo — https://github.com/org/repo",
      );
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

    function renderDocument(onDocumentPreview?: (path: string) => void) {
      return renderChip(
        <ResourceLink
          label="Focus"
          target="memory-bank/focus.md"
          result={result}
          onDocumentPreview={onDocumentPreview}
        />,
      );
    }

    it("renders a button element", () => {
      renderDocument();
      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("type")).toBe("button");
    });

    it("renders the authored label verbatim", () => {
      renderDocument();
      expect(screen.getByText("Focus")).toBeTruthy();
    });

    it("uses the file icon preset for document_path references", () => {
      const { container } = renderDocument();
      expect(container.querySelector('[data-icon="file"]')).toBeTruthy();
    });

    it("invokes onDocumentPreview with the document path on click", async () => {
      const user = userEvent.setup();
      const onDocumentPreview = vi.fn();
      renderDocument(onDocumentPreview);

      await user.click(screen.getByRole("button"));

      expect(onDocumentPreview).toHaveBeenCalledWith("memory-bank/focus.md");
    });

    it("shows the label and target in a tooltip on hover", async () => {
      const user = userEvent.setup();
      renderDocument();
      await user.hover(screen.getByRole("button"));

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip.textContent).toBe("Focus — memory-bank/focus.md");
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

    function renderFailed() {
      return renderChip(
        <ResourceLink
          label="Missing Doc"
          target="docs/missing.md"
          result={failedResult}
        />,
      );
    }

    it("renders an aria-disabled button that stays focusable", async () => {
      const user = userEvent.setup();
      renderFailed();
      const button = screen.getByRole("button");
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.hasAttribute("disabled")).toBe(false);

      await user.tab();
      expect(document.activeElement).toBe(button);
    });

    it("renders the authored label unchanged", () => {
      renderFailed();
      expect(screen.getByText("Missing Doc")).toBeTruthy();
    });

    it("shows the error message in a tooltip on focus", async () => {
      const user = userEvent.setup();
      renderFailed();
      await user.tab();

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip.textContent).toBe(
        'Reference target "docs/missing.md" is not a supported format.',
      );
    });

    it("uses the file icon for a .md target even on failure", () => {
      const { container } = renderFailed();
      expect(container.querySelector('[data-icon="file"]')).toBeTruthy();
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
      const { container } = renderChip(
        <ResourceLink
          label="GH Link"
          target="https://github.com/org/repo"
          result={githubFail}
        />,
      );
      expect(container.querySelector('[data-icon="github"]')).toBeTruthy();
    });
  });
});
