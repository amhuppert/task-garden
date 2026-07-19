import type { FlowProjection } from "../../../lib/graph/flow-projection-service";
import {
  METRIC_KEYS,
  formatMetricValue,
  getMetricLabel,
  getMetricSummary,
  isUnitBearingMetric,
} from "../../../lib/graph/metric-registry";
import type {
  EstimateUnit,
  MetricKey,
  PlanAnalysisSnapshot,
} from "../../../lib/graph/plan-analysis-engine";
import { rankTopByDegree } from "../../../lib/graph/plan-insights";
import { compactUnitSuffix } from "../plan-details-panel.helpers";
import type {
  ColorEncodingMode,
  PlanDisplayStateValue,
  SizeEncodingMode,
} from "../plan-display.store";
import type { PlanExplorerStateValue } from "../plan-explorer.store";
import { resolveLegendItemColor } from "../plan-graph-canvas.helpers";
import { ItemRow } from "./ItemRow";
import { HowItWorks, Section } from "./Section";

/** Estimate-based metric labels carry the plan's unit; structural ones don't. */
function metricLabelWithUnit(key: MetricKey, unit: EstimateUnit): string {
  if (isUnitBearingMetric(key)) {
    return `${getMetricLabel(key)} (${compactUnitSuffix(unit)})`;
  }
  return getMetricLabel(key);
}

const COLOR_MODE_EXPLANATIONS: Record<ColorEncodingMode, string> = {
  default: "Nodes use neutral specimen styling with moss selection highlight.",
  lane: "Node color reflects the authored lane each item belongs to.",
  status: "Node color reflects the current status of each item.",
  value: "Node color reflects the authored value of each item.",
  value_per_effort:
    "Node color reflects authored value divided by authored estimate.",
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
  value: "Node size scales with authored value.",
  value_per_effort:
    "Node size scales with authored value divided by authored estimate.",
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

function ActiveScopeExplanation() {
  return (
    <>
      <p>
        Shows which slice of the plan the graph is displaying right now. Useful
        when filters and selection make the canvas look smaller than the full
        plan.
      </p>
      <HowItWorks>
        Combine the current selection with the chosen scope rule, then keep only
        the items that match that dependency slice.
      </HowItWorks>
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
      <HowItWorks>
        Authored modes use lane or status directly. Metric modes compute the
        selected value for each item and map lower values to lighter color and
        higher values to stronger color.
      </HowItWorks>
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
      <HowItWorks>
        Uniform keeps all nodes the same size. Metric modes compute the selected
        value for each item and scale larger values to larger nodes.
      </HowItWorks>
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
      <HowItWorks>
        Compute each metric for every item, then keep the minimum and maximum
        values.
      </HowItWorks>
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
      <HowItWorks>
        Structural metrics use dependency links only. Value and estimate metrics
        add authored scoring and effort on top of those same dependency links.
      </HowItWorks>
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
      <HowItWorks>
        Add the number of direct dependencies and direct dependents for each
        item, then sort from highest to lowest.
      </HowItWorks>
    </>
  );
}

interface MetricsModeProps {
  snapshot: PlanAnalysisSnapshot;
  display: PlanDisplayStateValue;
  explorer: PlanExplorerStateValue;
  projection: FlowProjection | null;
  onSelectWorkItem?: (id: string) => void;
}

/** "Metrics" insight mode: active scope/encoding context, metric ranges, and degree leaders. */
export function MetricsMode({
  snapshot,
  display,
  explorer,
  projection,
  onSelectWorkItem,
}: MetricsModeProps) {
  const { colorMode, sizeMode } = display;
  const { metricRanges, estimateUnit } = snapshot;
  const scopeExplanation = getScopeExplanation(explorer, snapshot);

  // Legend from projection (authoritative source of encoding explanation)
  const colorLegend = projection?.colorLegend ?? null;

  const topByDegree = rankTopByDegree(snapshot, 10);

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

        {/* Legend items from projection — color values render as swatches,
            never as raw CSS variable strings */}
        {colorLegend &&
          colorLegend.items.length > 0 &&
          colorMode !== "default" && (
            <div className="mt-1 flex flex-col gap-1">
              {colorLegend.items.map((legendItem) => {
                const dotColor = resolveLegendItemColor(colorMode, legendItem);
                const valueIsColor =
                  colorMode === "lane" || colorMode === "status";
                return (
                  <div
                    key={legendItem.key}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      {dotColor && (
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                      )}
                      <span className="truncate">{legendItem.label}</span>
                    </span>
                    {!valueIsColor && (
                      <span className="shrink-0 font-mono text-[0.65rem] text-foreground">
                        {legendItem.value}
                      </span>
                    )}
                  </div>
                );
              })}
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
                    {metricLabelWithUnit(key, estimateUnit)}
                  </span>
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {isFlat
                      ? formatMetricValue(key, range.min, estimateUnit)
                      : `${formatMetricValue(key, range.min, estimateUnit)} – ${formatMetricValue(
                          key,
                          range.max,
                          estimateUnit,
                        )}`}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {getMetricSummary(key)}
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
          {topByDegree.map(({ item, analysis }) => (
            <li key={item.id}>
              <ItemRow
                id={item.id}
                title={item.title}
                badge={`deg ${analysis.metrics.degree}`}
                badgeLabel={`Degree: ${analysis.metrics.degree} (${analysis.metrics.in_degree} in, ${analysis.metrics.out_degree} out)`}
                onClick={onSelectWorkItem}
              />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
