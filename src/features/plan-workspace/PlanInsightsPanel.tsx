import type { FlowProjection } from "../../lib/graph/flow-projection-service";
import type { PlanAnalysisSnapshot } from "../../lib/graph/plan-analysis-engine";
import { MetricsMode } from "./insights/MetricsMode";
import { OrderingMode } from "./insights/OrderingMode";
import { OverviewMode } from "./insights/OverviewMode";
import { ReadyMode } from "./insights/ReadyMode";
import type { InsightMode, PlanDisplayStateValue } from "./plan-display.store";
import type { PlanExplorerStateValue } from "./plan-explorer.store";
import { TabPanel, Tabs } from "./ui/Tabs";

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

const MODE_TABS: { value: InsightMode; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "ready", label: "Ready" },
  { value: "ordering", label: "Ordering" },
  { value: "metrics", label: "Metrics" },
];

/**
 * Insights side panel: a tabbed host (APG Tabs via the `Tabs` primitive)
 * switching between the four insight modes, each of which owns its own
 * analysis presentation. Fully controlled by the display store's insightMode.
 */
export function PlanInsightsPanel({
  snapshot,
  display,
  explorer,
  projection,
  onSelectWorkItem,
  onSetInsightMode,
}: PlanInsightsPanelProps) {
  return (
    <article className="flex flex-col gap-6" aria-label="Plan Insights">
      <Tabs
        value={display.insightMode}
        onValueChange={(value) => {
          const tab = MODE_TABS.find((t) => t.value === value);
          if (tab) onSetInsightMode?.(tab.value);
        }}
        tabs={MODE_TABS}
        ariaLabel="Insight mode"
        className="flex flex-col gap-6"
        listClassName="flex gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-muted p-0.5 [&>button]:rounded-[calc(var(--radius-sm)-2px)] [&>button]:px-3 [&>button]:py-1.5 [&>button]:text-xs [&>button]:font-medium [&>button[data-state=active]]:bg-surface [&>button[data-state=active]]:shadow-sm"
      >
        <TabPanel value="overview">
          <OverviewMode
            snapshot={snapshot}
            onSelectWorkItem={onSelectWorkItem}
          />
        </TabPanel>
        <TabPanel value="ready">
          <ReadyMode snapshot={snapshot} onSelectWorkItem={onSelectWorkItem} />
        </TabPanel>
        <TabPanel value="ordering">
          <OrderingMode
            snapshot={snapshot}
            onSelectWorkItem={onSelectWorkItem}
          />
        </TabPanel>
        <TabPanel value="metrics">
          <MetricsMode
            snapshot={snapshot}
            display={display}
            explorer={explorer}
            projection={projection}
            onSelectWorkItem={onSelectWorkItem}
          />
        </TabPanel>
      </Tabs>
    </article>
  );
}
