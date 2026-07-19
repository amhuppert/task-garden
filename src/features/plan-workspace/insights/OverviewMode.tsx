import type { PlanAnalysisSnapshot } from "../../../lib/graph/plan-analysis-engine";
import {
  buildOverviewRollups,
  rankHighImportance,
  rankUnlockedEffortLeaders,
} from "../../../lib/graph/plan-insights";
import { STATUS_LABELS } from "../../../lib/plan/status-presentation";
import {
  formatCompactUnitValue,
  formatUnitCount,
} from "../plan-details-panel.helpers";
import { getStatusAccentColor } from "../plan-graph-canvas.helpers";
import { ItemRow } from "./ItemRow";
import { HowItWorks, Section } from "./Section";

function ProgressExplanation() {
  return (
    <>
      <p>
        How much of the plan is complete, by item count and — when estimates
        exist — by estimated effort. Useful for a quick read on delivery state
        without scanning every node.
      </p>
      <HowItWorks>
        Count items per status. Done percent divides done items by all items.
        Effort done divides the summed estimates of done items by the summed
        estimates of all estimated items.
      </HowItWorks>
    </>
  );
}

function EstimateProfileExplanation() {
  return (
    <>
      <p>
        A compact summary of the estimate data in the plan. Useful for seeing
        how complete the estimates are and how trustworthy the schedule view is.
      </p>
      <HowItWorks>
        Coverage counts items that have estimates. Total effort adds those
        estimates together. Schedule floor finds the longest estimated
        dependency route. Parallelism divides total effort by that route.
        Critical items counts tasks with no schedule buffer.
      </HowItWorks>
    </>
  );
}

function EstimatedCriticalPathExplanation() {
  return (
    <>
      <p>
        The estimated route most likely to set the minimum delivery time. Useful
        for spotting the sequence where delays matter most — slips on this path
        directly push back delivery.
      </p>
      <HowItWorks>
        Walk each dependency route from start to finish, add the estimates along
        each route, and keep the route with the largest total.
      </HowItWorks>
    </>
  );
}

function MostUnlockingItemsExplanation() {
  return (
    <>
      <p>
        Tasks that unlock the most estimated work behind them. Useful for
        spotting items that release a lot of follow-on progress — finishing
        these first can unblock the most work for others.
      </p>
      <HowItWorks>
        Start from a task, collect every reachable dependent below it, and add
        their estimates without double-counting shared items.
      </HowItWorks>
    </>
  );
}

function LongestDependencyChainExplanation() {
  return (
    <>
      <p>
        The longest prerequisite sequence in the plan, regardless of whether
        items have estimates. Useful for seeing the deepest handoff chain —
        longer chains mean more sequential coordination.
      </p>
      <HowItWorks>
        Follow dependency links and keep the route with the most items from
        start to finish.
      </HowItWorks>
    </>
  );
}

function RootsExplanation() {
  return (
    <>
      <p>
        Starting points of the plan — tasks that can begin immediately without
        waiting on anything else. Useful for identifying where work can kick off
        right away.
      </p>
      <HowItWorks>Count items that have zero dependencies.</HowItWorks>
    </>
  );
}

function LeavesExplanation() {
  return (
    <>
      <p>
        Endpoints of the plan — tasks that sit at the ends of delivery paths
        with nothing depending on them. Useful for seeing what the final
        deliverables are.
      </p>
      <HowItWorks>Count items that no other tasks depend on.</HowItWorks>
    </>
  );
}

function HighImportanceExplanation() {
  return (
    <>
      <p>
        Items that connect many different parts of the plan, acting as bridges
        between separate groups of work. Useful for spotting tasks where delays
        can ripple outward and affect unrelated work streams.
      </p>
      <HowItWorks>
        For many pairs of tasks, find the shortest dependency route between them
        and count how often each item sits in the middle of those routes. Items
        that appear on many routes score higher.
      </HowItWorks>
    </>
  );
}

interface OverviewModeProps {
  snapshot: PlanAnalysisSnapshot;
  onSelectWorkItem?: (id: string) => void;
}

/** "Overview" insight mode: plan stats, progress, estimate profile, and structural highlights. */
export function OverviewMode({
  snapshot,
  onSelectWorkItem,
}: OverviewModeProps) {
  const {
    workItems,
    roots,
    leaves,
    longestDependencyChain,
    estimateSummary,
    estimateUnit,
  } = snapshot;

  const {
    totalItems,
    laneCount,
    statusSegments,
    doneCount,
    donePercent,
    doneEffort,
    estimatedTotalEffort,
    effortPercent,
  } = buildOverviewRollups(snapshot);

  const highImportance = rankHighImportance(snapshot, 5);
  const unlockedEffortLeaders = rankUnlockedEffortLeaders(snapshot, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Plan stats */}
      <Section label="Plan Stats">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Items", value: totalItems },
            { label: "Lanes", value: laneCount },
            { label: "Roots", value: roots.length },
            { label: "Leaves", value: leaves.length },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2"
            >
              <span className="atlas-kicker text-[0.6rem]">{label}</span>
              <span className="font-mono text-lg text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Progress */}
      <Section label="Progress" description={<ProgressExplanation />}>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={totalItems}
          aria-valuenow={doneCount}
          aria-valuetext={`${doneCount} of ${totalItems} items done`}
          aria-label="Progress"
        >
          {statusSegments.map((segment) => (
            <div
              key={segment.status}
              style={{
                width: `${(segment.count / totalItems) * 100}%`,
                backgroundColor: getStatusAccentColor(segment.status),
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {statusSegments.map((segment) => (
            <span
              key={segment.status}
              className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: getStatusAccentColor(segment.status),
                }}
              />
              {STATUS_LABELS[segment.status]} {segment.count}
            </span>
          ))}
        </div>
        <div className="atlas-metric-grid">
          <div className="atlas-stat-card">
            <span className="atlas-kicker text-[0.58rem]">Items Done</span>
            <span className="mt-1 block font-mono text-base text-foreground">
              {doneCount}/{totalItems}
            </span>
            <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
              {donePercent.toFixed(0)}% of items complete.
            </span>
          </div>
          {effortPercent !== null && (
            <div className="atlas-stat-card">
              <span className="atlas-kicker text-[0.58rem]">Effort Done</span>
              <span className="mt-1 block font-mono text-base text-foreground">
                {formatCompactUnitValue(doneEffort, estimateUnit)}/
                {formatCompactUnitValue(estimatedTotalEffort, estimateUnit)}
              </span>
              <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
                {effortPercent.toFixed(0)}% of estimated effort complete.
              </span>
            </div>
          )}
        </div>
      </Section>

      {estimateSummary.estimatedItemCount > 0 && (
        <>
          <Section
            label="Estimate Profile"
            description={<EstimateProfileExplanation />}
          >
            <div className="atlas-metric-grid">
              {[
                {
                  label: "Coverage",
                  value: `${estimateSummary.estimatedItemCount}/${estimateSummary.totalWorkItemCount}`,
                  detail: "Items with estimates",
                },
                {
                  label: "Total Effort",
                  value: formatCompactUnitValue(
                    estimateSummary.totalEstimatedDays,
                    estimateUnit,
                  ),
                  detail: formatUnitCount(
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
                  detail: "Estimated critical path",
                },
                {
                  label: "Parallelism",
                  value: `${estimateSummary.parallelismRatio.toFixed(1)}x`,
                  detail: "Effort / schedule floor",
                },
                {
                  label: "Critical Items",
                  value: `${estimateSummary.criticalItemCount}`,
                  detail: "Tasks with no time buffer",
                },
              ].map((stat) => (
                <div key={stat.label} className="atlas-stat-card">
                  <span className="atlas-kicker text-[0.58rem]">
                    {stat.label}
                  </span>
                  <span className="mt-1 block font-mono text-base text-foreground">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
                    {stat.detail}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {estimateSummary.estimatedCriticalPath.workItemIds.length > 0 && (
            <Section
              label={`Estimated Critical Path (${formatCompactUnitValue(
                estimateSummary.estimatedCriticalPath.totalDays,
                estimateUnit,
              )})`}
              description={<EstimatedCriticalPathExplanation />}
            >
              <p className="text-xs text-muted-foreground">
                Minimum delivery floor assuming authored estimates are
                directionally correct and independent branches can run in
                parallel.
              </p>
              <ol className="flex flex-col gap-1">
                {estimateSummary.estimatedCriticalPath.workItemIds.map(
                  (id, index) => {
                    const item = workItems[id];
                    if (!item) return null;
                    return (
                      <li key={id} className="flex items-center gap-2">
                        <span className="w-5 shrink-0 font-mono text-[0.65rem] text-muted-foreground text-right">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <ItemRow
                            id={id}
                            title={item.title}
                            badge={
                              item.estimate != null
                                ? formatCompactUnitValue(
                                    item.estimate,
                                    estimateUnit,
                                  )
                                : undefined
                            }
                            onClick={onSelectWorkItem}
                          />
                        </div>
                      </li>
                    );
                  },
                )}
              </ol>
            </Section>
          )}

          {unlockedEffortLeaders.length > 0 && (
            <Section
              label="Most Unlocking Items"
              description={<MostUnlockingItemsExplanation />}
            >
              <p className="text-xs text-muted-foreground">
                Items that gate the most estimated downstream effort.
              </p>
              <ul className="flex flex-col gap-1">
                {unlockedEffortLeaders.map(({ item, analysis }) => (
                  <li key={item.id}>
                    <ItemRow
                      id={item.id}
                      title={item.title}
                      badge={formatCompactUnitValue(
                        analysis.metrics.downstream_effort_days,
                        estimateUnit,
                      )}
                      badgeLabel={formatUnitCount(
                        analysis.metrics.downstream_effort_days,
                        estimateUnit,
                      )}
                      onClick={onSelectWorkItem}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {/* Longest Dependency Chain */}
      <Section
        label={`Longest Dependency Chain (${longestDependencyChain.length} items)`}
        description={<LongestDependencyChainExplanation />}
      >
        <p className="text-xs text-muted-foreground">
          The sequence of items with the longest prerequisite chain, from first
          to last.
        </p>
        <ol className="flex flex-col gap-1">
          {longestDependencyChain.workItemIds.map((id, index) => {
            const item = workItems[id];
            if (!item) return null;
            return (
              <li key={id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 font-mono text-[0.65rem] text-muted-foreground text-right">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <ItemRow
                    id={id}
                    title={item.title}
                    onClick={onSelectWorkItem}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Roots */}
      {roots.length > 0 && (
        <Section
          label={`Roots (${roots.length})`}
          description={<RootsExplanation />}
        >
          <p className="text-xs text-muted-foreground">
            Items with no dependencies — starting points of the plan.
          </p>
          <ul className="flex flex-col gap-1">
            {roots.map((id) => {
              const item = workItems[id];
              if (!item) return null;
              return (
                <li key={id}>
                  <ItemRow
                    id={id}
                    title={item.title}
                    onClick={onSelectWorkItem}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Leaves */}
      {leaves.length > 0 && (
        <Section
          label={`Leaves (${leaves.length})`}
          description={<LeavesExplanation />}
        >
          <p className="text-xs text-muted-foreground">
            Items with no dependents — endpoints of the plan.
          </p>
          <ul className="flex flex-col gap-1">
            {leaves.map((id) => {
              const item = workItems[id];
              if (!item) return null;
              return (
                <li key={id}>
                  <ItemRow
                    id={id}
                    title={item.title}
                    onClick={onSelectWorkItem}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* High-importance items */}
      {highImportance.length > 0 && (
        <Section
          label="High-Importance Items"
          description={<HighImportanceExplanation />}
        >
          <p className="text-xs text-muted-foreground">
            Items with the highest structural centrality — removing them would
            most disrupt the plan's dependency paths.
          </p>
          <ul className="flex flex-col gap-1">
            {highImportance.map(({ item, analysis }) => (
              <li key={item.id}>
                <ItemRow
                  id={item.id}
                  title={item.title}
                  badge={`B ${analysis.metrics.betweenness.toFixed(2)}`}
                  badgeLabel={`Betweenness: ${analysis.metrics.betweenness.toFixed(4)}`}
                  onClick={onSelectWorkItem}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
