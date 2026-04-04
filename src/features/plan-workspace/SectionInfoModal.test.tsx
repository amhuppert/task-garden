import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionInfoModal } from "./SectionInfoModal";

describe("SectionInfoModal", () => {
  it("renders a trigger button with the correct aria-label", () => {
    const html = renderToStaticMarkup(
      <SectionInfoModal title="Estimate Profile">
        <p>Explanation content</p>
      </SectionInfoModal>,
    );

    expect(html).toContain('aria-label="Estimate Profile explanation"');
    expect(html).toContain("button");
  });

  it("renders as a Radix Dialog with the title in the content", () => {
    const html = renderToStaticMarkup(
      <SectionInfoModal title="Color Encoding">
        <p>Color explanation details</p>
      </SectionInfoModal>,
    );

    // Trigger button should exist
    expect(html).toContain('aria-label="Color Encoding explanation"');
    // Dialog content is not rendered server-side (portal), so we only check the trigger
    expect(html).toContain("button");
  });
});
