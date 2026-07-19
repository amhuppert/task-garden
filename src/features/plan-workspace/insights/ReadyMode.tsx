import type {
  EstimateUnit,
  PlanAnalysisSnapshot,
} from "../../../lib/graph/plan-analysis-engine";
import {
  type ReadyCandidate,
  buildReadyCandidates,
  rankReadyByValue,
  rankReadyByValueDensity,
} from "../../../lib/graph/plan-insights";
import {
  formatCompactUnitValue,
  formatValue,
  formatValueDensity,
} from "../plan-details-panel.helpers";
import { HowItWorks, Section } from "./Section";

function ReadyWorkExplanation() {
  return (
    <>
      <p>
        Tasks that can be worked on next, ranked by impact and by impact per
        effort. Useful for deciding what to pick up when multiple tasks are
        unblocked.
      </p>
      <HowItWorks>
        Include tasks marked ready, plus planned tasks whose dependencies are
        all done. Value comes from the authored value field; value density is
        value divided by estimate.
      </HowItWorks>
    </>
  );
}

interface ReadyItemRowProps {
  candidate: ReadyCandidate;
  estimateUnit: EstimateUnit;
  onClick?: (id: string) => void;
}

/**
 * Ready-queue row: id + title with the value / effort / value-density metric
 * cluster. The terse metric glyphs are described to AT with visually-hidden
 * labels (the cluster is not interactive, so no tooltips).
 */
function ReadyItemRow({ candidate, estimateUnit, onClick }: ReadyItemRowProps) {
  const { item, effort, valueDensity } = candidate;
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(item.id) : undefined}
      aria-disabled={onClick ? undefined : true}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-muted aria-disabled:cursor-default"
    >
      <div className="min-w-0">
        <span className="block truncate font-mono text-[0.65rem] text-muted-foreground">
          {item.id}
        </span>
        <span className="mt-0.5 block truncate text-sm text-foreground">
          {item.title}
        </span>
      </div>
      <div className="grid min-w-[7.5rem] grid-cols-3 gap-1 text-right font-mono text-[0.65rem]">
        <span className="text-foreground">
          <span className="sr-only">Value </span>
          <span aria-hidden="true">V</span>
          {formatValue(item.value)}
        </span>
        <span className="text-muted-foreground">
          <span className="sr-only">Effort </span>
          {effort !== null ? formatCompactUnitValue(effort, estimateUnit) : "—"}
        </span>
        <span className="text-foreground">
          <span className="sr-only">Value divided by effort </span>
          {valueDensity !== null ? formatValueDensity(valueDensity) : "—"}
        </span>
      </div>
    </button>
  );
}

interface ReadyModeProps {
  snapshot: PlanAnalysisSnapshot;
  onSelectWorkItem?: (id: string) => void;
}

/** "Ready" insight mode: the unblocked-work queue ranked by value and value density. */
export function ReadyMode({ snapshot, onSelectWorkItem }: ReadyModeProps) {
  const candidates = buildReadyCandidates(snapshot);
  const byDensity = rankReadyByValueDensity(candidates);
  const byValue = rankReadyByValue(candidates);
  const estimatedCount = candidates.filter((c) => c.effort !== null).length;

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Section label="Ready Work" description={<ReadyWorkExplanation />}>
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-4 text-sm leading-relaxed text-muted-foreground">
            No unblocked tasks are ready to start. Mark an item ready or finish
            its dependencies to bring it into this queue.
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Section label="Ready Work" description={<ReadyWorkExplanation />}>
        <div className="atlas-metric-grid">
          <div className="atlas-stat-card">
            <span className="atlas-kicker text-[0.58rem]">Ready Items</span>
            <span className="mt-1 block font-mono text-base text-foreground">
              {candidates.length}
            </span>
            <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
              Explicitly ready or dependency-unblocked.
            </span>
          </div>
          <div className="atlas-stat-card">
            <span className="atlas-kicker text-[0.58rem]">With Effort</span>
            <span className="mt-1 block font-mono text-base text-foreground">
              {estimatedCount}/{candidates.length}
            </span>
            <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
              {estimatedCount === candidates.length
                ? "All ready items have estimates."
                : `${candidates.length - estimatedCount} need an estimate for value density.`}
            </span>
          </div>
        </div>
      </Section>

      <Section label="Best Value / Effort">
        <p className="text-xs text-muted-foreground">
          Ranked by value divided by estimate. Items without effort are listed
          last until an estimate is added.
        </p>
        <ol className="flex flex-col gap-1">
          {byDensity.map((candidate, index) => (
            <li key={candidate.item.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 font-mono text-[0.65rem] text-muted-foreground text-right">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <ReadyItemRow
                  candidate={candidate}
                  estimateUnit={snapshot.estimateUnit}
                  onClick={onSelectWorkItem}
                />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="Highest Value">
        <p className="text-xs text-muted-foreground">
          Ranked by authored value alone when impact matters more than task
          size.
        </p>
        <ol className="flex flex-col gap-1">
          {byValue.map((candidate, index) => (
            <li key={candidate.item.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 font-mono text-[0.65rem] text-muted-foreground text-right">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <ReadyItemRow
                  candidate={candidate}
                  estimateUnit={snapshot.estimateUnit}
                  onClick={onSelectWorkItem}
                />
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
