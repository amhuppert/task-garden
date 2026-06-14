import type { FlowProjection } from "../../lib/graph/flow-projection-service";
import type {
  EstimateUnit,
  MetricKey,
  PlanAnalysisSnapshot,
} from "../../lib/graph/plan-analysis-engine";
import { SectionInfoModal } from "./SectionInfoModal";
import {
  compactUnitSuffix,
  formatCompactUnitValue,
  formatUnitCount,
} from "./plan-details-panel.helpers";
import type {
  ColorEncodingMode,
  InsightMode,
  PlanDisplayStateValue,
  SizeEncodingMode,
} from "./plan-display.store";
import type { PlanExplorerStateValue } from "./plan-explorer.store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanInsightsPanelProps {
  /** The full analysis snapshot for the ready plan. */
  snapshot: PlanAnalysisSnapshot;
  /** Display store state — drives insightMode and encoding labels. */
  display: PlanDisplayStateValue;
  /** Explorer store state — used for active scope context explanation. */
  explorer: PlanExplorerStateValue;
  /**
   * The current flow projection — used for legend and filtered-state context.
   * Optional: pass null when projection is not yet available.
   */
  projection: FlowProjection | null;
  /** Called when the user clicks a work item to select it. */
  onSelectWorkItem?: (id: string) => void;
  /** Called when the insight mode tab is changed. */
  onSetInsightMode?: (mode: InsightMode) => void;
}

// ---------------------------------------------------------------------------
// Metric labels and explanations
// ---------------------------------------------------------------------------

const STRUCTURAL_METRIC_LABELS: Record<MetricKey, string> = {
  degree: "Degree",
  in_degree: "In-Degree",
  out_degree: "Out-Degree",
  betweenness: "Betweenness",
  dependency_span: "Dependency Span",
  estimate_days: "Estimate",
  remaining_days: "Remaining Chain",
  downstream_effort_days: "Unlocked Effort",
};

/** Estimate-based metric labels carry the plan's unit; structural ones don't. */
function getMetricLabel(key: MetricKey, unit: EstimateUnit): string {
  if (
    key === "estimate_days" ||
    key === "remaining_days" ||
    key === "downstream_effort_days"
  ) {
    return `${STRUCTURAL_METRIC_LABELS[key]} (${compactUnitSuffix(unit)})`;
  }
  return STRUCTURAL_METRIC_LABELS[key];
}

const METRIC_DESCRIPTIONS: Record<MetricKey, string> = {
  degree: "Total direct connections (dependencies + dependents).",
  in_degree: "Number of direct dependencies this item has.",
  out_degree: "Number of items that directly depend on this item.",
  betweenness:
    "How often this item appears on shortest paths between other items. High values indicate structural bridges.",
  dependency_span:
    "How many additional dependency levels lie below this item. Higher means more work downstream.",
  estimate_days: "Authored estimate for the item.",
  remaining_days:
    "The longest estimated chain from this item to a leaf, including this item.",
  downstream_effort_days:
    "The total unique downstream estimated workload unlocked by this item.",
};

// ---------------------------------------------------------------------------
// Color encoding explanations
// ---------------------------------------------------------------------------

const COLOR_MODE_EXPLANATIONS: Record<ColorEncodingMode, string> = {
  default: "Nodes use neutral specimen styling with moss selection highlight.",
  lane: "Node color reflects the authored lane each item belongs to.",
  status: "Node color reflects the current status of each item.",
  priority: "Node color reflects the priority level of each item.",
  estimate_days:
    "Color encodes authored task size. Stronger color means a larger individual estimate.",
  remaining_days:
    "Color encodes how much estimated sequential runway remains below each item.",
  downstream_effort_days:
    "Color encodes how much unique downstream effort sits behind each item.",
  degree:
    "Color encodes total connections. Items with more connections appear more saturated.",
  betweenness:
    "Color encodes structural bridging importance. Highlighted items are on many dependency paths.",
  dependency_span:
    "Color encodes downstream reach. Items with more dependent levels below appear more saturated.",
};

const SIZE_MODE_EXPLANATIONS: Record<SizeEncodingMode, string> = {
  uniform: "All nodes use the same size.",
  estimate_days:
    "Node size scales with authored task size. Larger nodes are larger tasks.",
  remaining_days:
    "Node size scales with estimated remaining chain length. Larger nodes sit above longer sequential runways.",
  downstream_effort_days:
    "Node size scales with downstream unlocked effort. Larger nodes gate more work.",
  degree:
    "Node size scales with total connections. Larger nodes are more connected.",
  betweenness:
    "Node size scales with bridging importance. Larger nodes are on more paths.",
  dependency_span:
    "Node size scales with downstream reach. Larger nodes have more dependent levels below.",
};

// ---------------------------------------------------------------------------
// Scope explanations
// ---------------------------------------------------------------------------

function getScopeExplanation(
  explorer: PlanExplorerStateValue,
  snapshot: PlanAnalysisSnapshot,
): string {
  const { selectedWorkItemId, activeScope } = explorer;

  if (!selectedWorkItemId) {
    return "All work items are shown. Select an item to scope the view.";
  }

  const item = snapshot.workItems[selectedWorkItemId];
  const name = item?.title ?? selectedWorkItemId;

  switch (activeScope) {
    case "all":
      return `Showing all items. "${name}" is selected.`;
    case "upstream":
      return `Showing items that "${name}" depends on (upstream prerequisites).`;
    case "downstream":
      return `Showing items that depend on "${name}" (downstream dependents).`;
    case "chain":
      return `Showing the full dependency chain for "${name}" — both upstream and downstream.`;
  }
}

// ---------------------------------------------------------------------------
// Mode tab bar
// ---------------------------------------------------------------------------

const TABS: { mode: InsightMode; label: string }[] = [
  { mode: "overview", label: "Overview" },
  { mode: "ordering", label: "Ordering" },
  { mode: "metrics", label: "Metrics" },
];

interface ModeSelectorProps {
  active: InsightMode;
  onSelect?: (mode: InsightMode) => void;
}

function ModeSelector({ active, onSelect }: ModeSelectorProps) {
  return (
    <div
      className="flex gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-muted p-0.5"
      role="tablist"
      aria-label="Insight mode"
    >
      {TABS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={active === mode}
          onClick={() => onSelect?.(mode)}
          className={`flex-1 rounded-[calc(var(--radius-sm)-2px)] px-3 py-1.5 text-xs font-medium transition-colors ${
            active === mode
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="atlas-kicker">{label}</span>
        {description ? (
          <SectionInfoModal title={label}>{description}</SectionInfoModal>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EstimateProfileExplanation() {
  return (
    <>
      <p>
        A compact summary of the estimate data in the plan. Useful for seeing
        how complete the estimates are and how trustworthy the schedule view is.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Coverage counts items that have estimates. Total effort adds those
        estimates together. Schedule floor finds the longest estimated
        dependency route. Parallelism divides total effort by that route.
        Critical items counts tasks with no schedule buffer.
      </div>
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
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Walk each dependency route from start to finish, add the estimates along
        each route, and keep the route with the largest total.
      </div>
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
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Start from a task, collect every reachable dependent below it, and add
        their estimates without double-counting shared items.
      </div>
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
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Follow dependency links and keep the route with the most items from
        start to finish.
      </div>
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
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Count items that have zero dependencies.
      </div>
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
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Count items that no other tasks depend on.
      </div>
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
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        For many pairs of tasks, find the shortest dependency route between them
        and count how often each item sits in the middle of those routes. Items
        that appear on many routes score higher.
      </div>
    </>
  );
}

function ActiveScopeExplanation() {
  return (
    <>
      <p>
        Shows which slice of the plan the graph is displaying right now. Useful
        when filters and selection make the canvas look smaller than the full
        plan.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Combine the current selection with the chosen scope rule, then keep only
        the items that match that dependency slice.
      </div>
    </>
  );
}

function ColorEncodingExplanation() {
  return (
    <>
      <p>
        What node color means right now. Useful for reading the graph quickly
        without guessing what the palette stands for.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Authored modes use lane, status, or priority directly. Metric modes
        compute the selected value for each item and map lower values to lighter
        color and higher values to stronger color.
      </div>
    </>
  );
}

function SizeEncodingExplanation() {
  return (
    <>
      <p>
        What node size means right now. Useful for seeing which items stand out
        by the currently selected measure.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Uniform keeps all nodes the same size. Metric modes compute the selected
        value for each item and scale larger values to larger nodes.
      </div>
    </>
  );
}

function MetricRangesExplanation() {
  return (
    <>
      <p>
        The smallest and largest values for each metric across the whole plan.
        Useful for interpreting what "low" and "high" mean when reading the
        graph’s color and size scales.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Compute each metric for every item, then keep the minimum and maximum
        values.
      </div>
    </>
  );
}

function InterpretationNoteExplanation() {
  return (
    <>
      <p>
        How to read structural metrics alongside estimate-based metrics. Useful
        for knowing when a number reflects dependency shape versus estimated
        time.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Structural metrics use dependency links only. Estimate metrics add
        authored estimates on top of those same dependency links.
      </div>
    </>
  );
}

function TopItemsByDegreeExplanation() {
  return (
    <>
      <p>
        The most connected items in the plan. Useful for spotting work that
        touches many other tasks directly — these items often need extra
        coordination attention.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        Add the number of direct dependencies and direct dependents for each
        item, then sort from highest to lowest.
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Clickable work item row
// ---------------------------------------------------------------------------

interface ItemRowProps {
  id: string;
  title: string;
  badge?: string;
  badgeTitle?: string;
  onClick?: (id: string) => void;
}

function ItemRow({ id, title, badge, badgeTitle, onClick }: ItemRowProps) {
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(id) : undefined}
      disabled={!onClick}
      className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-muted disabled:cursor-default"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-[0.65rem] text-muted-foreground">
          {id}
        </span>
        <span className="truncate text-sm text-foreground">{title}</span>
      </div>
      {badge !== undefined && (
        <span
          className="shrink-0 font-mono text-[0.65rem] text-muted-foreground"
          title={badgeTitle}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Overview mode
// ---------------------------------------------------------------------------

interface OverviewModeProps {
  snapshot: PlanAnalysisSnapshot;
  onSelectWorkItem?: (id: string) => void;
}

function OverviewMode({ snapshot, onSelectWorkItem }: OverviewModeProps) {
  const {
    plan,
    workItems,
    roots,
    leaves,
    longestDependencyChain,
    analysisById,
    estimateSummary,
    estimateUnit,
  } = snapshot;

  const totalItems = Object.keys(workItems).length;
  const laneCount = plan.lanes.length;

  // High-importance items: top 5 by betweenness, then by degree as tiebreaker
  const highImportance = Object.values(workItems)
    .map((item) => ({ item, analysis: analysisById[item.id] }))
    .filter(
      (
        x,
      ): x is {
        item: (typeof x)["item"];
        analysis: NonNullable<(typeof x)["analysis"]>;
      } => x.analysis !== undefined,
    )
    .sort((a, b) => {
      const bDiff =
        b.analysis.metrics.betweenness - a.analysis.metrics.betweenness;
      if (Math.abs(bDiff) > 1e-9) return bDiff;
      return b.analysis.metrics.degree - a.analysis.metrics.degree;
    })
    .slice(0, 5);

  const unlockedEffortLeaders = Object.values(workItems)
    .map((item) => ({ item, analysis: analysisById[item.id] }))
    .filter(
      (
        x,
      ): x is {
        item: (typeof x)["item"];
        analysis: NonNullable<(typeof x)["analysis"]>;
      } => x.analysis !== undefined,
    )
    .filter((x) => x.analysis.metrics.downstream_effort_days > 0)
    .sort(
      (a, b) =>
        b.analysis.metrics.downstream_effort_days -
        a.analysis.metrics.downstream_effort_days,
    )
    .slice(0, 5);

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
                      badgeTitle={formatUnitCount(
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
                  badgeTitle={`Betweenness: ${analysis.metrics.betweenness.toFixed(4)}`}
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

// ---------------------------------------------------------------------------
// Ordering mode
// ---------------------------------------------------------------------------

interface OrderingModeProps {
  snapshot: PlanAnalysisSnapshot;
  onSelectWorkItem?: (id: string) => void;
}

function OrderingMode({ snapshot, onSelectWorkItem }: OrderingModeProps) {
  const { topologicalOrder, workItems, analysisById, estimateUnit } = snapshot;

  // Group items by level
  const byLevel = new Map<number, string[]>();
  for (const id of topologicalOrder) {
    const analysis = analysisById[id];
    if (!analysis) continue;
    const level = analysis.level;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(id);
  }

  const levels = Array.from(byLevel.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Items ordered by dependency level — earlier items have no unresolved
        prerequisites at that depth. Items at the same level can be worked in
        parallel.
      </p>

      <ol className="flex flex-col gap-4">
        {levels.map(([level, ids]) => (
          <li key={level}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-mono text-[0.65rem] text-muted-foreground">
                Level {level}
              </span>
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
              <span className="font-mono text-[0.65rem] text-muted-foreground">
                {ids.length} {ids.length === 1 ? "item" : "items"}
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {ids.map((id) => {
                const item = workItems[id];
                if (!item) return null;
                const analysis = analysisById[id];
                const pos = topologicalOrder.indexOf(id) + 1;
                return (
                  <li key={id} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 font-mono text-[0.65rem] text-muted-foreground text-right">
                      {pos}
                    </span>
                    <div className="min-w-0 flex-1">
                      <ItemRow
                        id={id}
                        title={item.title}
                        badge={
                          analysis
                            ? item.estimate != null
                              ? `${formatCompactUnitValue(
                                  item.estimate,
                                  estimateUnit,
                                )} · ${analysis.dependencyIds.length}↑ ${analysis.dependentIds.length}↓`
                              : `${analysis.dependencyIds.length}↑ ${analysis.dependentIds.length}↓`
                            : undefined
                        }
                        badgeTitle={
                          analysis
                            ? `${analysis.dependencyIds.length} dependencies, ${analysis.dependentIds.length} dependents`
                            : undefined
                        }
                        onClick={onSelectWorkItem}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics mode
// ---------------------------------------------------------------------------

const METRIC_KEYS: MetricKey[] = [
  "estimate_days",
  "remaining_days",
  "downstream_effort_days",
  "degree",
  "in_degree",
  "out_degree",
  "betweenness",
  "dependency_span",
];

interface MetricsModeProps {
  snapshot: PlanAnalysisSnapshot;
  display: PlanDisplayStateValue;
  explorer: PlanExplorerStateValue;
  projection: FlowProjection | null;
  onSelectWorkItem?: (id: string) => void;
}

function MetricsMode({
  snapshot,
  display,
  explorer,
  projection,
  onSelectWorkItem,
}: MetricsModeProps) {
  const { colorMode, sizeMode } = display;
  const {
    metricRanges,
    workItems,
    topologicalOrder,
    analysisById,
    estimateUnit,
  } = snapshot;
  const formatRangeValue = (key: MetricKey, value: number): string => {
    if (
      key === "estimate_days" ||
      key === "remaining_days" ||
      key === "downstream_effort_days"
    ) {
      return formatCompactUnitValue(value, estimateUnit);
    }
    return value.toFixed(2);
  };

  const scopeExplanation = getScopeExplanation(explorer, snapshot);

  // Legend from projection (authoritative source of encoding explanation)
  const colorLegend = projection?.colorLegend ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Active scope context */}
      <Section label="Active Scope" description={<ActiveScopeExplanation />}>
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-foreground">
            {scopeExplanation}
          </p>
        </div>
      </Section>

      {/* Color encoding */}
      <Section
        label="Color Encoding"
        description={<ColorEncodingExplanation />}
      >
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">
            {colorMode === "default" ? "Default" : colorMode.replace(/_/g, " ")}
          </p>
          <p className="text-xs leading-relaxed text-foreground">
            {COLOR_MODE_EXPLANATIONS[colorMode]}
          </p>
        </div>

        {/* Legend items from projection */}
        {colorLegend && colorLegend.items.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            {colorLegend.items.map((legendItem) => (
              <div
                key={legendItem.key}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1"
              >
                <span className="text-xs text-muted-foreground">
                  {legendItem.label}
                </span>
                <span className="font-mono text-[0.65rem] text-foreground">
                  {legendItem.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {colorLegend?.fallbackMessage && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            {colorLegend.fallbackMessage}
          </p>
        )}
      </Section>

      {/* Size encoding */}
      <Section label="Size Encoding" description={<SizeEncodingExplanation />}>
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-1">
            {sizeMode === "uniform" ? "Uniform" : sizeMode.replace(/_/g, " ")}
          </p>
          <p className="text-xs leading-relaxed text-foreground">
            {SIZE_MODE_EXPLANATIONS[sizeMode]}
          </p>
        </div>
      </Section>

      {/* Per-metric ranges */}
      <Section label="Metric Ranges" description={<MetricRangesExplanation />}>
        <p className="text-xs text-muted-foreground">
          Computed across all items in the plan. Use these to interpret color
          and size encodings.
        </p>
        <div className="flex flex-col gap-2">
          {METRIC_KEYS.map((key) => {
            const range = metricRanges[key];
            const isFlat = range.min === range.max;
            return (
              <div
                key={key}
                className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    {getMetricLabel(key, estimateUnit)}
                  </span>
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {isFlat
                      ? formatRangeValue(key, range.min)
                      : `${formatRangeValue(key, range.min)} – ${formatRangeValue(
                          key,
                          range.max,
                        )}`}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {METRIC_DESCRIPTIONS[key]}
                </p>
                {isFlat && (
                  <p className="mt-1 text-[0.65rem] text-muted-foreground italic">
                    All items share the same value — encoding has no visual
                    variation.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Structural importance note */}
      <Section
        label="Interpretation Note"
        description={<InterpretationNoteExplanation />}
      >
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Structural metrics reflect dependency topology. Estimate-based
            metrics reflect authored estimates and assume parallel work can
            happen across independent branches. Use both lenses together:
            topology shows coordination structure, while estimate metrics show
            likely schedule pressure and gated effort.
          </p>
        </div>
      </Section>

      {/* Per-item metric table (top 10 by degree) */}
      <Section
        label="Top Items by Degree"
        description={<TopItemsByDegreeExplanation />}
      >
        <p className="text-xs text-muted-foreground">
          Items with the most total connections.
        </p>
        <ul className="flex flex-col gap-1">
          {topologicalOrder
            .slice()
            .sort((a, b) => {
              const aA = analysisById[a];
              const bA = analysisById[b];
              return (bA?.metrics.degree ?? 0) - (aA?.metrics.degree ?? 0);
            })
            .slice(0, 10)
            .map((id) => {
              const item = workItems[id];
              const analysis = analysisById[id];
              if (!item || !analysis) return null;
              return (
                <li key={id}>
                  <ItemRow
                    id={id}
                    title={item.title}
                    badge={`deg ${analysis.metrics.degree}`}
                    badgeTitle={`Degree: ${analysis.metrics.degree} (${analysis.metrics.in_degree} in, ${analysis.metrics.out_degree} out)`}
                    onClick={onSelectWorkItem}
                  />
                </li>
              );
            })}
        </ul>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanInsightsPanel({
  snapshot,
  display,
  explorer,
  projection,
  onSelectWorkItem,
  onSetInsightMode,
}: PlanInsightsPanelProps) {
  const { insightMode } = display;

  return (
    <article className="flex flex-col gap-5" aria-label="Plan Insights">
      {/* Mode selector */}
      <ModeSelector active={insightMode} onSelect={onSetInsightMode} />

      {/* Mode content */}
      {insightMode === "overview" && (
        <OverviewMode snapshot={snapshot} onSelectWorkItem={onSelectWorkItem} />
      )}
      {insightMode === "ordering" && (
        <OrderingMode snapshot={snapshot} onSelectWorkItem={onSelectWorkItem} />
      )}
      {insightMode === "metrics" && (
        <MetricsMode
          snapshot={snapshot}
          display={display}
          explorer={explorer}
          projection={projection}
          onSelectWorkItem={onSelectWorkItem}
        />
      )}
    </article>
  );
}
