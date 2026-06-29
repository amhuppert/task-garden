import { PlanWorkspacePage } from "task-garden";
import { stringify } from "yaml";
import { samplePlan } from "../preview-fixtures";

// PlanWorkspacePage is the whole application screen: it takes raw plan YAML, parses
// and validates it, then renders the dependency-graph canvas with the overview
// header, toolbar, and details/insights panels. We serialize the shared samplePlan
// fixture to YAML so the page renders its full, valid workspace state.

const source = stringify(samplePlan);

export function FullWorkspace() {
  return (
    <div style={{ width: 1180, height: 760 }}>
      <PlanWorkspacePage
        source={source}
        revision={1}
        planFileName="task-garden.taskgarden.yaml"
      />
    </div>
  );
}
