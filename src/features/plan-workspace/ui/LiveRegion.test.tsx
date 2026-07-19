// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LiveRegion } from "./LiveRegion";

afterEach(cleanup);

describe("LiveRegion", () => {
  describe('kind="status"', () => {
    it("exposes the status role with polite, atomic announcements", () => {
      render(<LiveRegion kind="status">Saved</LiveRegion>);

      const region = screen.getByRole("status");
      expect(region.getAttribute("aria-live")).toBe("polite");
      expect(region.getAttribute("aria-atomic")).toBe("true");
      expect(region.textContent).toBe("Saved");
    });

    it("renders the region even when there is nothing to announce", () => {
      render(<LiveRegion kind="status">{null}</LiveRegion>);

      expect(screen.getByRole("status").textContent).toBe("");
    });

    it("keeps the same region element when the announced text changes", () => {
      const { rerender } = render(
        <LiveRegion kind="status">{null}</LiveRegion>,
      );
      const before = screen.getByRole("status");

      rerender(<LiveRegion kind="status">Saving</LiveRegion>);
      const during = screen.getByRole("status");
      expect(during).toBe(before);
      expect(during.textContent).toBe("Saving");

      rerender(<LiveRegion kind="status">{null}</LiveRegion>);
      expect(screen.getByRole("status")).toBe(before);
      expect(before.textContent).toBe("");
    });

    it("adds no tab stop", () => {
      render(<LiveRegion kind="status">Saved</LiveRegion>);

      expect(screen.getByRole("status").hasAttribute("tabindex")).toBe(false);
    });
  });

  describe('kind="alert"', () => {
    it("exposes the alert role", () => {
      render(<LiveRegion kind="alert">Save failed</LiveRegion>);

      expect(screen.getByRole("alert").textContent).toBe("Save failed");
    });

    it("carries no aria-live attribute that could contradict the alert role", () => {
      render(<LiveRegion kind="alert">Save failed</LiveRegion>);

      expect(screen.getByRole("alert").hasAttribute("aria-live")).toBe(false);
    });

    it("keeps the same region element when the error text changes", () => {
      const { rerender } = render(<LiveRegion kind="alert">{null}</LiveRegion>);
      const before = screen.getByRole("alert");
      expect(before.textContent).toBe("");

      rerender(<LiveRegion kind="alert">Duplicate tag</LiveRegion>);
      const after = screen.getByRole("alert");
      expect(after).toBe(before);
      expect(after.textContent).toBe("Duplicate tag");
    });
  });

  it("applies the caller's className to the region element", () => {
    render(
      <LiveRegion kind="status" className="atlas-microchip">
        Saved
      </LiveRegion>,
    );

    expect(
      screen.getByRole("status").classList.contains("atlas-microchip"),
    ).toBe(true);
  });
});
