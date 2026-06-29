import { PlanDetailsPanel } from "task-garden";
import { explorerStateSelected, snapshot } from "../preview-fixtures";

// PlanDetailsPanel: the inspector for a selected work item — title, status,
// estimate, value, dependencies, links, and inline editable cells.

export function SelectedItem() {
  return (
    <div style={{ width: 440, padding: 16 }}>
      <PlanDetailsPanel
        snapshot={snapshot}
        explorer={explorerStateSelected}
        baseRevision={1}
        selectedNodeFilteredOut={false}
        canGoBack
        canGoForward={false}
      />
    </div>
  );
}
