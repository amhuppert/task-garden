import { PlanWorkspacePage } from "@/features/plan-workspace/PlanWorkspacePage";
import { PlanRuntimeConfig } from "@/lib/plan/plan-runtime-config";
import { useSelectedPlanSource } from "@/lib/plan/plan-source-subscription";

// Resolve plan key once at module load — stable for the lifetime of this instance.
const configResult = PlanRuntimeConfig.resolve();

function PlanWorkspace({ planKey }: { planKey: string }) {
  const sourceResult = useSelectedPlanSource(planKey);

  if (!sourceResult.ok) {
    return (
      <div className="atlas-page flex min-h-screen items-center justify-center p-6">
        <div className="atlas-panel max-w-lg p-8 text-center">
          <h1 className="atlas-title mb-3 text-2xl text-foreground">
            Plan Source Error
          </h1>
          <p className="text-sm text-muted-foreground">
            {sourceResult.error.type === "plan_not_registered"
              ? `Plan "${sourceResult.error.planKey}" is not registered. Add src/plans/${sourceResult.error.planKey}.yaml and restart the dev server.`
              : `Plan source unavailable for "${sourceResult.error.planKey}".`}
          </p>
        </div>
      </div>
    );
  }

  return <PlanWorkspacePage source={sourceResult.value} />;
}

export function App() {
  if (!configResult.ok) {
    return (
      <div className="atlas-page flex min-h-screen items-center justify-center p-6">
        <div className="atlas-panel max-w-lg p-8 text-center">
          <h1 className="atlas-title mb-3 text-2xl text-foreground">
            Configuration Error
          </h1>
          <p className="text-sm text-muted-foreground">
            {configResult.error.message}
          </p>
        </div>
      </div>
    );
  }

  return <PlanWorkspace planKey={configResult.value.planKey} />;
}
