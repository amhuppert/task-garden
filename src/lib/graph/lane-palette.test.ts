import { describe, expect, it } from "vitest";
import { getLanePaletteColor } from "./lane-palette";

describe("getLanePaletteColor", () => {
  it("returns a CSS custom-property color", () => {
    expect(getLanePaletteColor(0)).toMatch(/^var\(--color-/);
  });

  it("is stable for the same index", () => {
    expect(getLanePaletteColor(3)).toBe(getLanePaletteColor(3));
  });

  it("gives distinct colors within the first cycle", () => {
    const colors = Array.from({ length: 8 }, (_, i) => getLanePaletteColor(i));
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("cycles after the palette is exhausted", () => {
    expect(getLanePaletteColor(8)).toBe(getLanePaletteColor(0));
  });
});
