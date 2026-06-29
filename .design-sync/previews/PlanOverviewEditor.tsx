import { PlanOverviewEditor } from "task-garden";
import { samplePlan } from "../preview-fixtures";

// PlanOverviewEditor is the plan-identity edit form: inline Title / Summary /
// Last updated fields plus an editable Plan References list (label + href rows
// with add/remove). Each field carries a dirty dot and save indicator. patchPlan
// is omitted, so this is the committed read state — the form mirrors the sample
// plan's title, summary, date, and three reference rows exactly as persisted.

export function Editing() {
  return (
    <div style={{ width: 460, padding: 16 }}>
      <PlanOverviewEditor plan={samplePlan} baseRevision={7} />
    </div>
  );
}
