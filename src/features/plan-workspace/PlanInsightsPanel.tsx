import type { FlowProjection } from "../../lib/graph/flow-projection-service";
import type {
  MetricKey,
  PlanAnalysisSnapshot,
} from "../../lib/graph/plan-analysis-engine";
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

const METRIC_LABELS: Record<MetricKey, string> = {
  degree: "Degree",
  in_degree: "In-Degree",
  out_degree: "Out-Degree",
  betweenness: "Betweenness",
  dependency_span: "Dependency Span",
};

const METRIC_DESCRIPTIONS: Record<MetricKey, string> = {
  degree: "Total direct connections (dependencies + dependents).",
  in_degree: "Number of direct dependencies this item has.",
  out_degree: "Number of items that directly depend on this item.",
  betweenness:
    "How often this item appears on shortest paths between other items. High values indicate structural bridges.",
  dependency_span:
    "How many additional dependency levels lie below this item. Higher means more work downstream.",
};

// ---------------------------------------------------------------------------
// Color encoding explanations
// ---------------------------------------------------------------------------

const COLOR_MODE_EXPLANATIONS: Record<ColorEncodingMode, string> = {
  default: "Nodes use neutral specimen styling with moss selection highlight.",
  lane: "Node color reflects the authored lane each item belongs to.",
  status: "Node color reflects the current status of each item.",
  priority: "Node color reflects the priority level of each item.",
  degree:
    "Color encodes total connections. Items with more connections appear more saturated.",
  betweenness:
    "Color encodes structural bridging importance. Highlighted items are on many dependency paths.",
  dependency_span:
    "Color encodes downstream reach. Items with more dependent levels below appear more saturated.",
};

const SIZE_MODE_EXPLANATIONS: Record<SizeEncodingMode, string> = {
  uniform: "All nodes use the same size.",
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <span className="atlas-kicker">{label}</span>
      {children}
    </section>
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

      {/* Longest Dependency Chain */}
      <Section
        label={`Longest Dependency Chain (${longestDependencyChain.length} items)`}
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
        <Section label={`Roots (${roots.length})`}>
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
        <Section label={`Leaves (${leaves.length})`}>
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
        <Section label="High-Importance Items">
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
  const { topologicalOrder, workItems, analysisById } = snapshot;

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
                            ? `${analysis.dependencyIds.length}↑ ${analysis.dependentIds.length}↓`
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
  const { metricRanges, workItems, topologicalOrder, analysisById } = snapshot;

  const scopeExplanation = getScopeExplanation(explorer, snapshot);

  // Legend from projection (authoritative source of encoding explanation)
  const colorLegend = projection?.colorLegend ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Active scope context */}
      <Section label="Active Scope">
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-foreground">
            {scopeExplanation}
          </p>
        </div>
      </Section>

      {/* Color encoding */}
      <Section label="Color Encoding">
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
      <Section label="Size Encoding">
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
      <Section label="Metric Ranges">
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
                    {METRIC_LABELS[key]}
                  </span>
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {isFlat
                      ? range.min.toFixed(2)
                      : `${range.min.toFixed(2)} – ${range.max.toFixed(2)}`}
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
      <Section label="Interpretation Note">
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Structural metrics reflect dependency topology only — not estimated
            effort or schedule. High betweenness or degree indicates structural
            importance, not necessarily critical schedule risk. Use these
            comparisons to identify coordination bottlenecks and sequencing
            constraints, not as schedule predictions.
          </p>
        </div>
      </Section>

      {/* Per-item metric table (top 10 by degree) */}
      <Section label="Top Items by Degree">
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
