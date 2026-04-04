import type { EstimateSummary } from "../../lib/graph/plan-analysis-engine";
import type { ReferenceResolverService } from "../../lib/plan/reference-resolver";
import type { TaskGardenPlan } from "../../lib/plan/task-garden-plan.schema";
import { ResourceLink } from "./ResourceLink";
import { SectionInfoTooltip } from "./SectionInfoTooltip";
import { formatCompactDayCount } from "./plan-details-panel.helpers";
import { formatLastUpdated } from "./plan-overview-header.helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanOverviewHeaderProps {
  /** The validated, ready plan snapshot. */
  plan: TaskGardenPlan;
  /** Optional estimate summary for schedule-aware overview stats. */
  estimateSummary?: EstimateSummary;
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
  estimateSummary,
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

      {estimateSummary && estimateSummary.estimatedItemCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="atlas-kicker">Estimate Profile</span>
            <SectionInfoTooltip label="Estimate Profile explanation">
              <p>
                This is a compact summary of the estimate data in the plan. It
                helps you see how complete the estimates are and what they imply
                for effort and minimum schedule.
              </p>
              <p>
                Calculation: coverage counts items with day estimates, total
                effort adds those estimates, schedule floor keeps the longest
                estimated dependency route, and parallelism compares total
                effort to that route.
              </p>
            </SectionInfoTooltip>
          </div>
          <div className="atlas-metric-grid">
            {[
              {
                label: "Coverage",
                value: `${estimateSummary.estimatedItemCount}/${estimateSummary.totalWorkItemCount}`,
              },
              {
                label: "Total Effort",
                value: formatCompactDayCount(
                  estimateSummary.totalEstimatedDays,
                ),
              },
              {
                label: "Schedule Floor",
                value: formatCompactDayCount(
                  estimateSummary.estimatedCriticalPath.totalDays,
                ),
              },
              {
                label: "Parallelism",
                value: `${estimateSummary.parallelismRatio.toFixed(1)}x`,
              },
            ].map((stat) => (
              <div key={stat.label} className="atlas-stat-card">
                <span className="atlas-kicker text-[0.58rem]">
                  {stat.label}
                </span>
                <span className="mt-1 block font-mono text-base text-foreground">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
