import { LinksEditorCell } from "task-garden";

// LinksEditorCell edits a work item's reference links: each row is a label + href
// input pair on a parchment surface with a remove ×, plus a dashed "Add link" row.
// committedValue is the readonly TaskGardenLink[] ({label, href}). patchPlan omitted =
// the static read/display state. Sweep multiple links vs empty; distinct workItemIds
// keep each cell's draft state isolated.

export function MultipleLinks() {
  return (
    <div style={{ width: 340 }}>
      <LinksEditorCell
        workItemId="links-plan-schema"
        committedValue={[
          {
            label: "Schema PR",
            href: "https://github.com/org/task-garden/pull/142",
          },
          {
            label: "Design Atlas",
            href: "memory-bank/botanical-systems-atlas.md",
          },
          { label: "Spec", href: "https://example.com/specs/task-garden" },
        ]}
        baseRevision={8}
      />
    </div>
  );
}

export function SingleLink() {
  return (
    <div style={{ width: 340 }}>
      <LinksEditorCell
        workItemId="links-flow-projection"
        committedValue={[
          { label: "Schema", href: "schemas/task-garden-plan.schema.json" },
        ]}
        baseRevision={4}
      />
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ width: 340 }}>
      <LinksEditorCell
        workItemId="links-estimate-overlays"
        committedValue={[]}
        baseRevision={3}
      />
    </div>
  );
}
