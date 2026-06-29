import { PlanInsightsPanel } from "task-garden";
import { displayState, explorerStateAll, snapshot } from "../preview-fixtures";

// PlanInsightsPanel: tabbed analytics (Overview / Ready / Ordering) over the plan
// analysis snapshot — estimate profile, ready-work ranking, suggested order.

export function Overview() {
  return (
    <div style={{ width: 420, padding: 16 }}>
      <PlanInsightsPanel
        snapshot={snapshot}
        display={{ ...displayState, insightMode: "overview" }}
        explorer={explorerStateAll}
        projection={null}
      />
    </div>
  );
}

export function ReadyQueue() {
  return (
    <div style={{ width: 420, padding: 16 }}>
      <PlanInsightsPanel
        snapshot={snapshot}
        display={{ ...displayState, insightMode: "ready" }}
        explorer={explorerStateAll}
        projection={null}
      />
    </div>
  );
}
