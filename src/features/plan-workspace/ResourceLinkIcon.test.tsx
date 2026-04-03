import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResourceLinkIcon } from "./ResourceLinkIcon";

describe("ResourceLinkIcon", () => {
  describe("fallback icons", () => {
    it("renders an SVG with data-icon='file' for the file preset", () => {
      const html = renderToStaticMarkup(<ResourceLinkIcon preset="file" />);
      expect(html).toContain('data-icon="file"');
      expect(html).toContain("<svg");
    });

    it("renders an SVG with data-icon='external' for the external preset", () => {
      const html = renderToStaticMarkup(<ResourceLinkIcon preset="external" />);
      expect(html).toContain('data-icon="external"');
      expect(html).toContain("<svg");
    });

    it("renders all icons as aria-hidden", () => {
      for (const preset of ["file", "external"] as const) {
        const html = renderToStaticMarkup(<ResourceLinkIcon preset={preset} />);
        expect(html).toContain('aria-hidden="true"');
      }
    });
  });

  describe("brand icons", () => {
    it("renders a distinct SVG with data-icon='github'", () => {
      const html = renderToStaticMarkup(<ResourceLinkIcon preset="github" />);
      expect(html).toContain('data-icon="github"');
      expect(html).toContain("<svg");
    });

    it("renders a distinct SVG with data-icon='gitlab'", () => {
      const html = renderToStaticMarkup(<ResourceLinkIcon preset="gitlab" />);
      expect(html).toContain('data-icon="gitlab"');
      expect(html).toContain("<svg");
    });

    it("renders a distinct SVG with data-icon='jira'", () => {
      const html = renderToStaticMarkup(<ResourceLinkIcon preset="jira" />);
      expect(html).toContain('data-icon="jira"');
      expect(html).toContain("<svg");
    });

    it("renders a distinct SVG with data-icon='confluence'", () => {
      const html = renderToStaticMarkup(
        <ResourceLinkIcon preset="confluence" />,
      );
      expect(html).toContain('data-icon="confluence"');
      expect(html).toContain("<svg");
    });

    it("renders all brand icons as aria-hidden", () => {
      for (const preset of [
        "github",
        "gitlab",
        "jira",
        "confluence",
      ] as const) {
        const html = renderToStaticMarkup(<ResourceLinkIcon preset={preset} />);
        expect(html).toContain('aria-hidden="true"');
      }
    });
  });
});
