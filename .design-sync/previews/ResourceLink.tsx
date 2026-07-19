import { ResourceLink } from "task-garden";
import { brokenRef, docPath, extUrl } from "../preview-fixtures";

// ResourceLink renders a mono chip with a preset icon (GitHub, file, external…)
// inferred from the target. Sweep the kinds: external links, an in-repo document
// path, and an unresolved reference (disabled).

export function ExternalLinks() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 8 }}>
      <ResourceLink
        label="GitHub Repo"
        target="https://github.com/org/task-garden"
        result={extUrl("GitHub Repo", "https://github.com/org/task-garden")}
      />
      <ResourceLink
        label="Project Spec"
        target="https://example.com/specs/task-garden"
        result={extUrl("Project Spec", "https://example.com/specs/task-garden")}
      />
    </div>
  );
}

export function DocumentLink() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 8 }}>
      <ResourceLink
        label="Design System"
        target="memory-bank/botanical-systems-atlas.md"
        result={docPath(
          "Design System",
          "memory-bank/botanical-systems-atlas.md",
        )}
      />
    </div>
  );
}

export function Unresolved() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 8 }}>
      <ResourceLink
        label="Missing doc"
        target="docs/does-not-exist.md"
        result={brokenRef("Reference target not found")}
      />
    </div>
  );
}
