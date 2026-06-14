import type {
  EstimateSummary,
  EstimateUnit,
} from "../../lib/graph/plan-analysis-engine";
import { classifyReference } from "../../lib/plan/reference-resolver";
import type { TaskGardenPlan } from "../../lib/plan/task-garden-plan.schema";
import { ResourceLink } from "./ResourceLink";
import { SectionInfoModal } from "./SectionInfoModal";
import { formatCompactUnitValue } from "./plan-details-panel.helpers";
import { formatLastUpdated } from "./plan-overview-header.helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanOverviewHeaderProps {
  /** The validated, ready plan snapshot. */
  plan: TaskGardenPlan;
  /** Optional estimate summary for schedule-aware overview stats. */
  estimateSummary?: EstimateSummary;
  /** Estimate unit used to label effort/schedule values. Defaults to days. */
  estimateUnit?: EstimateUnit;
  /** Reference classifier — inject for testability, defaults to classifyReference. */
  classify?: typeof classifyReference;
  /** Called when a document_path reference is activated. */
  onDocumentPreview?: (documentPath: string) => void;
  /**
   * When true, suppress the title/summary/last_updated/references sections so
   * they don't double up with PlanOverviewEditor in the popover.
   */
  hideEditableSections?: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanOverviewHeader({
  plan,
  estimateSummary,
  estimateUnit = "days",
  classify = classifyReference,
  onDocumentPreview,
  hideEditableSections = false,
}: PlanOverviewHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b border-border pb-6">
      {/* ------------------------------------------------------------------ */}
      {/* Plan identity                                                        */}
      {/* ------------------------------------------------------------------ */}
      {!hideEditableSections && (
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
      )}

      {estimateSummary && estimateSummary.estimatedItemCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="atlas-kicker">Estimate Profile</span>
            <SectionInfoModal title="Estimate Profile">
              <p>
                A compact summary of the estimate data in the plan. Useful for
                seeing how complete the estimates are and what they imply for
                effort and minimum schedule.
              </p>
              <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                Coverage counts items with estimates. Total effort adds those
                estimates together. Schedule floor finds the longest estimated
                dependency route. Parallelism divides total effort by that
                route.
              </div>
            </SectionInfoModal>
          </div>
          <div className="atlas-metric-grid">
            {[
              {
                label: "Coverage",
                value: `${estimateSummary.estimatedItemCount}/${estimateSummary.totalWorkItemCount}`,
              },
              {
                label: "Total Effort",
                value: formatCompactUnitValue(
                  estimateSummary.totalEstimatedDays,
                  estimateUnit,
                ),
              },
              {
                label: "Schedule Floor",
                value: formatCompactUnitValue(
                  estimateSummary.estimatedCriticalPath.totalDays,
                  estimateUnit,
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
      {!hideEditableSections && plan.references.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="atlas-kicker">Plan References</span>
          <div className="flex flex-wrap gap-2">
            {plan.references.map((ref) => {
              const result = classify(ref.href, ref.label);
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
