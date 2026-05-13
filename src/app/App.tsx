import { PlanWorkspacePage } from "../features/plan-workspace/PlanWorkspacePage";
import { useTaskGardenPlanState } from "../lib/plan/use-task-garden-plan-state";

export function App() {
  const state = useTaskGardenPlanState();

  if (state.phase === "loading") {
    return (
      <div className="atlas-page flex min-h-screen items-center justify-center p-6">
        <output
          className="flex flex-col items-center justify-center gap-4 text-center"
          aria-label="Loading plan"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-moss"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">Loading plan</p>
        </output>
      </div>
    );
  }

  const { snapshot } = state;

  if (snapshot.source === null) {
    const message =
      snapshot.sourceError?.message ?? "Plan file is currently unavailable.";
    return (
      <div
        className="atlas-page flex min-h-screen items-center justify-center p-6"
        role="alert"
        aria-live="polite"
      >
        <div className="atlas-panel max-w-lg px-6 py-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl text-petal" aria-hidden="true">
              ⚠
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-medium text-foreground">
                Plan file unavailable
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlanWorkspacePage
      source={snapshot.source}
      revision={snapshot.revision}
      planFileName={snapshot.planFileName}
    />
  );
}
