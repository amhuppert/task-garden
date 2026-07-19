// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SectionInfoModal } from "./SectionInfoModal";

afterEach(cleanup);

describe("SectionInfoModal", () => {
  it("renders a trigger button with the correct aria-label and no open dialog", () => {
    render(
      <SectionInfoModal title="Estimate Profile">
        <p>Explanation content</p>
      </SectionInfoModal>,
    );

    expect(
      screen.getByRole("button", { name: "Estimate Profile explanation" }),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on trigger click, showing the title and content", async () => {
    const user = userEvent.setup();
    render(
      <SectionInfoModal title="Color Encoding">
        <p>Color explanation details</p>
      </SectionInfoModal>,
    );

    await user.click(
      screen.getByRole("button", { name: "Color Encoding explanation" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Color Encoding" });
    expect(dialog.textContent).toContain("Color Encoding");
    expect(screen.getByText("Color explanation details")).toBeTruthy();
  });

  it("exposes the scrollable body as a focusable labelled region so keyboard users can scroll it", async () => {
    const user = userEvent.setup();
    render(
      <SectionInfoModal title="Color Encoding">
        <p>Color explanation details</p>
      </SectionInfoModal>,
    );

    await user.click(
      screen.getByRole("button", { name: "Color Encoding explanation" }),
    );

    // The body holds only static text; without a tab stop the overflowing
    // content would be unreachable by keyboard (WCAG 2.1.1).
    const region = screen.getByRole("region", { name: "Color Encoding" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.textContent).toContain("Color explanation details");
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <SectionInfoModal title="Estimate Profile">
        <p>Explanation content</p>
      </SectionInfoModal>,
    );

    await user.click(
      screen.getByRole("button", { name: "Estimate Profile explanation" }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the trigger after closing", async () => {
    const user = userEvent.setup();
    render(
      <SectionInfoModal title="Estimate Profile">
        <p>Explanation content</p>
      </SectionInfoModal>,
    );

    const trigger = screen.getByRole("button", {
      name: "Estimate Profile explanation",
    });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(document.activeElement).toBe(trigger);
  });
});
