import { ResourceLinkIcon } from "task-garden";
import type { CSSProperties } from "react";

// ResourceLinkIcon maps a detected link preset to a 14px glyph: file / external
// links draw in currentColor (inherit the chip's text color), while github,
// gitlab, jira, and confluence carry their own brand marks. The first cell
// sweeps every preset; the second shows the currentColor glyphs inheriting tint.

const PRESETS = [
  "github",
  "gitlab",
  "jira",
  "confluence",
  "file",
  "external",
] as const;

const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: "var(--radius-md, 10px)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-foreground)",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  letterSpacing: "0.02em",
};

export function AllPresets() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        padding: 16,
        maxWidth: 360,
      }}
    >
      {PRESETS.map((preset) => (
        <span key={preset} style={chip}>
          <ResourceLinkIcon preset={preset} />
          {preset}
        </span>
      ))}
    </div>
  );
}

export function InheritsTextColor() {
  return (
    <div style={{ display: "flex", gap: 12, padding: 16 }}>
      <span style={{ ...chip, color: "var(--color-foreground)" }}>
        <ResourceLinkIcon preset="file" />
        document
      </span>
      <span style={{ ...chip, color: "var(--color-moss)" }}>
        <ResourceLinkIcon preset="external" />
        external
      </span>
      <span style={{ ...chip, color: "var(--color-muted-foreground)" }}>
        <ResourceLinkIcon preset="file" />
        muted
      </span>
    </div>
  );
}
