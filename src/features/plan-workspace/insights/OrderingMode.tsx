import type { PlanAnalysisSnapshot } from "../../../lib/graph/plan-analysis-engine";
import {
  formatCompactUnitValue,
  formatUnitCount,
} from "../plan-details-panel.helpers";
import { ItemRow } from "./ItemRow";

interface OrderingModeProps {
  snapshot: PlanAnalysisSnapshot;
  onSelectWorkItem?: (id: string) => void;
}

/** "Ordering" insight mode: items grouped by dependency level in topological order. */
export function OrderingMode({
  snapshot,
  onSelectWorkItem,
}: OrderingModeProps) {
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
                const pos = (analysis?.topologicalIndex ?? 0) + 1;
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
                        badgeLabel={
                          analysis
                            ? `${
                                item.estimate != null
                                  ? `${formatUnitCount(item.estimate, estimateUnit)} estimated, `
                                  : ""
                              }${analysis.dependencyIds.length} dependencies, ${analysis.dependentIds.length} dependents`
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
