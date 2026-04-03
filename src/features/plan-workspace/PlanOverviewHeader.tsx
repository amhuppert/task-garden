import type { ReferenceResolverService } from "../../lib/plan/reference-resolver";
import type { TaskGardenPlan } from "../../lib/plan/task-garden-plan.schema";
import { ResourceLink } from "./ResourceLink";
import { formatLastUpdated } from "./plan-overview-header.helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanOverviewHeaderProps {
  /** The validated, ready plan snapshot. */
  plan: TaskGardenPlan;
  /** Reference resolver — inject for testability, use singleton in production. */
  resolver: ReferenceResolverService;
  /** Called when a successfully resolved bundled document is activated. */
  onDocumentPreview?: (documentPath: string, rawDocument: string) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanOverviewHeader({
  plan,
  resolver,
  onDocumentPreview,
}: PlanOverviewHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b border-border pb-6">
      {/* ------------------------------------------------------------------ */}
      {/* Plan identity                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-2">
        <h1 className="atlas-title text-3xl leading-tight text-foreground">
          {plan.title}
        </h1>
        {plan.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {plan.summary}
          </p>
        )}
        <p className="atlas-kicker mt-1">
          Updated {formatLastUpdated(plan.last_updated)}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Lanes                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-2">
        <span className="atlas-kicker">Lanes</span>
        <ul className="flex flex-col gap-1.5">
          {plan.lanes.map((lane) => (
            <li key={lane.id} className="flex flex-col">
              <div className="flex items-center gap-2">
                {lane.color && (
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.color }}
                  />
                )}
                <span className="text-sm font-medium text-foreground">
                  {lane.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground opacity-60">
                  {lane.id}
                </span>
              </div>
              {lane.description && (
                <p className="mt-0.5 pl-4 text-xs text-muted-foreground">
                  {lane.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* References (only when the plan has references)                      */}
      {/* ------------------------------------------------------------------ */}
      {plan.references.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="atlas-kicker">Plan References</span>
          <div className="flex flex-wrap gap-2">
            {plan.references.map((ref) => {
              const result = resolver.resolve(ref.href, ref.label);
              return (
                <ResourceLink
                  key={`${ref.label}:${ref.href}`}
                  label={ref.label}
                  target={ref.href}
                  result={result}
                  onDocumentPreview={onDocumentPreview}
                />
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
