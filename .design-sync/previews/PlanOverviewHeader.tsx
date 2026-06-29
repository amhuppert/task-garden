import { PlanOverviewHeader } from "task-garden";
import { estimateSummary, samplePlan } from "../preview-fixtures";

// PlanOverviewHeader is the text-heavy plan identity block: display-serif title,
// summary, estimate-profile stat grid, lane legend, and reference chips.

export function WithEstimateProfile() {
  return (
    <div style={{ width: 440, padding: 20 }}>
      <PlanOverviewHeader
        plan={samplePlan}
        estimateSummary={estimateSummary}
        estimateUnit="days"
      />
    </div>
  );
}

export function IdentityOnly() {
  return (
    <div style={{ width: 440, padding: 20 }}>
      <PlanOverviewHeader plan={samplePlan} />
    </div>
  );
}
