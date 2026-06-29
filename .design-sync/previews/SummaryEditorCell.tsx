import { SummaryEditorCell } from "task-garden";

// SummaryEditorCell renders the work item summary inside a parchment-surface
// contentEditable box with a "Summary" kicker and save indicator. patchPlan
// omitted = the static read/display state. Sweep realistic summaries of varying
// length; distinct workItemIds keep each cell's draft/save state isolated.

export function Concise() {
  return (
    <div style={{ width: 320 }}>
      <SummaryEditorCell
        workItemId="summary-schema"
        committedValue="Zod schema for plans; reject cycles and dangling dependencies."
        baseRevision={8}
      />
    </div>
  );
}

export function Detailed() {
  return (
    <div style={{ width: 320 }}>
      <SummaryEditorCell
        workItemId="summary-canvas"
        committedValue="Pan/zoom canvas with lane bands, focus mode, and metric encodings driven by the projected dependency graph."
        baseRevision={5}
      />
    </div>
  );
}

export function Technical() {
  return (
    <div style={{ width: 320 }}>
      <SummaryEditorCell
        workItemId="summary-overlay"
        committedValue="Critical-path and slack-heatmap overlays computed from per-item estimates."
        baseRevision={3}
      />
    </div>
  );
}
