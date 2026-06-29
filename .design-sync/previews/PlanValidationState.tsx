import { PlanValidationState } from "task-garden";

// PlanValidationState renders the non-ready phases of the plan processing pipeline:
// a centered loading spinner, then the parchment alert panels for parse failures and
// schema-validation failures (each issue tagged with its code + document path).
// Shown as one stacked card — the three states read top to bottom as the pipeline's
// failure surface. (status "ready" renders null, so it isn't shown.)

const input = { source: "plan.yaml", revision: 4 };

export function ProcessingStates() {
  return (
    <div
      style={{
        width: 560,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 16,
      }}
    >
      <PlanValidationState state={{ status: "loading" }} />

      <PlanValidationState
        state={{
          status: "invalid",
          input,
          failure: {
            type: "parse",
            issues: [
              "Nested mappings are not allowed in compact mappings at line 14, column 7:\n\n  lane: graph\n      ^",
            ],
          },
        }}
      />

      <PlanValidationState
        state={{
          status: "invalid",
          input,
          failure: {
            type: "validation",
            issues: [
              {
                path: ["work_items", 3, "depends_on", 0],
                code: "unknown_dependency",
                message:
                  'Dependency "graph-canvs" does not match any declared work item id.',
              },
              {
                path: ["work_items", 5, "lane"],
                code: "unknown_lane",
                message: 'Lane "polsh" is not declared in the plan lanes.',
              },
              {
                path: [],
                code: "cycle_detected",
                message:
                  "Dependency cycle detected: inline-editing → graph-canvas → inline-editing.",
              },
            ],
          },
        }}
      />
    </div>
  );
}
