import type { PlanPatch } from "../../../cli/shared/patch-schema";
import type { PlanAnalysisSnapshot } from "../../lib/graph/plan-analysis-engine";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../lib/plan/edit-api-client";
import { classifyReference } from "../../lib/plan/reference-resolver";
import { ResourceLink } from "./ResourceLink";
import { DependencyEditorCell } from "./editing/DependencyEditorCell";
import { EditableTitleCell } from "./editing/EditableTitleCell";
import { EstimateStepperCell } from "./editing/EstimateStepperCell";
import { LanePickerCell } from "./editing/LanePickerCell";
import { LinksEditorCell } from "./editing/LinksEditorCell";
import { NotesEditorCell } from "./editing/NotesEditorCell";
import { PriorityPickerCell } from "./editing/PriorityPickerCell";
import { StatusPickerCell } from "./editing/StatusPickerCell";
import { StringListEditorCell } from "./editing/StringListEditorCell";
import { SummaryEditorCell } from "./editing/SummaryEditorCell";
import { TagEditorCell } from "./editing/TagEditorCell";
import {
  formatCompactUnitValue,
  formatUnitCount,
  getPriorityLabel,
  getStatusLabel,
} from "./plan-details-panel.helpers";
import type { PlanExplorerStateValue } from "./plan-explorer.store";
import {
  getPriorityAccentColor,
  getStatusAccentColor,
} from "./plan-graph-canvas.helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanDetailsPanelProps {
  /** The full analysis snapshot for the ready plan. */
  snapshot: PlanAnalysisSnapshot;
  /** Explorer store state — used to derive the selected work item. */
  explorer: PlanExplorerStateValue;
  /**
   * Revision of the snapshot being rendered. Forwarded to editable cells so
   * dispatched patches carry an accurate baseRevision for optimistic-concurrency.
   */
  baseRevision: number;
  /** Reference classifier — inject for testability, defaults to classifyReference. */
  classify?: typeof classifyReference;
  /**
   * True when the selected item is shown only as a context node because it
   * doesn't match the active filter set. Sourced from FlowProjection.summary.selectedNodeFilteredOut.
   */
  selectedNodeFilteredOut: boolean;
  /** Called when the user navigates to a dependency or dependent item. */
  onSelectWorkItem?: (id: string) => void;
  /** Called when a document_path reference is activated. */
  onDocumentPreview?: (documentPath: string) => void;
  /**
   * Opens the new-item form prefilled with depends_on = [selected work item id],
   * so the new item is created as a dependent of the current one.
   */
  onBranchNewDependent?: () => void;
  /** Whether the back button should be enabled. */
  canGoBack?: boolean;
  /** Whether the forward button should be enabled. */
  canGoForward?: boolean;
  /** Navigate to the previous work item in history. */
  onGoBack?: () => void;
  /** Navigate to the next work item in history. */
  onGoForward?: () => void;
  /**
   * Override the PATCH transport used by all editable cells. Used in tests to
   * inject a mock and assert behavioural integration of the panel + cells.
   * In production this is omitted and each cell falls back to the default client.
   */
  patchPlan?: (
    patch: PlanPatch,
    opts: PatchPlanOptions,
  ) => Promise<EditApiResult>;
}

// ---------------------------------------------------------------------------
// Neutral state
// ---------------------------------------------------------------------------

function NeutralState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="text-3xl opacity-30 select-none" aria-hidden="true">
        ⊞
      </span>
      <p className="atlas-kicker">Work Item Details</p>
      <p className="mt-1 max-w-[22ch] text-sm leading-relaxed text-muted-foreground">
        Select a work item in the graph to see its details
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context-only banner
// ---------------------------------------------------------------------------

function ContextOnlyBanner() {
  return (
    <div
      className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3.5 py-2.5"
      role="note"
      aria-label="Item filtered out notice"
    >
      <span className="mt-0.5 shrink-0 text-sm text-pollen" aria-hidden="true">
        ◎
      </span>
      <p className="text-xs leading-snug text-muted-foreground">
        This item is shown in context only — it doesn't match the active
        filters.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work item reference (dependency / dependent)
// ---------------------------------------------------------------------------

interface WorkItemRefButtonProps {
  id: string;
  title: string;
  status: string;
  priority: string;
  onClick?: (id: string) => void;
}

function WorkItemRefButton({
  id,
  title,
  status,
  priority,
  onClick,
}: WorkItemRefButtonProps) {
  const handleClick = onClick ? () => onClick(id) : undefined;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onClick}
      className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-muted disabled:cursor-default"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate font-mono text-[0.68rem] text-muted-foreground">
          {id}
        </span>
        <div
          className="flex shrink-0 items-center gap-1.5"
          title={`${getStatusLabel(status as Parameters<typeof getStatusLabel>[0])} · ${getPriorityLabel(priority as Parameters<typeof getPriorityLabel>[0])}`}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: getStatusAccentColor(
                status as Parameters<typeof getStatusAccentColor>[0],
              ),
            }}
            aria-label={status}
          />
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: getPriorityAccentColor(
                priority as Parameters<typeof getPriorityAccentColor>[0],
              ),
            }}
            aria-label={priority}
          />
        </div>
      </div>
      <p className="mt-0.5 text-sm text-foreground">{title}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <span className="atlas-kicker">{label}</span>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanDetailsPanel({
  snapshot,
  explorer,
  baseRevision,
  classify = classifyReference,
  selectedNodeFilteredOut,
  onSelectWorkItem,
  onDocumentPreview,
  onBranchNewDependent,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  patchPlan,
}: PlanDetailsPanelProps) {
  const { selectedWorkItemId } = explorer;

  if (!selectedWorkItemId) {
    return <NeutralState />;
  }

  const item = snapshot.workItems[selectedWorkItemId];
  const analysis = snapshot.analysisById[selectedWorkItemId];

  // Guard: if somehow the selected id points to a non-existent item, show neutral
  if (!item || !analysis) {
    return <NeutralState />;
  }

  const allWorkItems = Object.values(snapshot.workItems);
  const hasScheduleEstimate = analysis.schedule.estimateDays !== null;
  const estimateUnit = snapshot.estimateUnit;

  return (
    <article
      className="flex min-w-0 flex-col gap-6"
      aria-label={`Details: ${item.title}`}
    >
      {/* Context-only banner */}
      {selectedNodeFilteredOut && <ContextOnlyBanner />}

      {/* ------------------------------------------------------------------ */}
      {/* Navigation + Core: id, title, summary                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="min-w-0 truncate font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground">
            {item.id}
          </p>
          <nav
            className="flex shrink-0 items-center gap-0.5"
            aria-label="History navigation"
          >
            <button
              type="button"
              aria-label="Go back (Alt+Left)"
              disabled={!canGoBack}
              onClick={onGoBack}
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8.5 3L4.5 7L8.5 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Go forward (Alt+Right)"
              disabled={!canGoForward}
              onClick={onGoForward}
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5.5 3L9.5 7L5.5 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </nav>
        </div>
        <EditableTitleCell
          workItemId={item.id}
          committedValue={item.title}
          baseRevision={baseRevision}
          patchPlan={patchPlan}
        />
        <SummaryEditorCell
          workItemId={item.id}
          committedValue={item.summary}
          baseRevision={baseRevision}
          patchPlan={patchPlan}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Editable metadata: lane, status, priority                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LanePickerCell
          workItemId={item.id}
          committedValue={item.lane}
          baseRevision={baseRevision}
          lanes={snapshot.plan.lanes}
          patchPlan={patchPlan}
        />
        <StatusPickerCell
          workItemId={item.id}
          committedValue={item.status}
          baseRevision={baseRevision}
          patchPlan={patchPlan}
        />
        <PriorityPickerCell
          workItemId={item.id}
          committedValue={item.priority}
          baseRevision={baseRevision}
          patchPlan={patchPlan}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tags (editable)                                                     */}
      {/* ------------------------------------------------------------------ */}
      <TagEditorCell
        workItemId={item.id}
        committedValue={item.tags}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Estimate (editable)                                                 */}
      {/* ------------------------------------------------------------------ */}
      <EstimateStepperCell
        workItemId={item.id}
        committedValue={item.estimate ?? null}
        estimateUnit={estimateUnit}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Schedule (computed)                                                 */}
      {/* ------------------------------------------------------------------ */}
      {hasScheduleEstimate && (
        <Section label="Schedule">
          <div className="atlas-metric-grid">
            {hasScheduleEstimate && (
              <>
                <div className="atlas-stat-card">
                  <span className="atlas-kicker text-[0.58rem]">
                    Remaining Chain
                  </span>
                  <span className="mt-1 block font-mono text-base text-foreground">
                    {formatCompactUnitValue(
                      analysis.schedule.remainingDays,
                      estimateUnit,
                    )}
                  </span>
                  <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
                    Longest estimated path to a leaf.
                  </span>
                </div>

                <div className="atlas-stat-card">
                  <span className="atlas-kicker text-[0.58rem]">
                    Unlocked Effort
                  </span>
                  <span className="mt-1 block font-mono text-base text-foreground">
                    {formatCompactUnitValue(
                      analysis.schedule.downstreamEffortDays,
                      estimateUnit,
                    )}
                  </span>
                  <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
                    Unique downstream work gated behind this item.
                  </span>
                </div>

                <div
                  className="atlas-stat-card"
                  style={
                    analysis.schedule.isOnCriticalPath
                      ? {
                          borderColor:
                            "color-mix(in oklab, var(--color-pollen) 44%, transparent)",
                          background:
                            "linear-gradient(180deg, color-mix(in oklab, var(--color-pollen) 14%, var(--color-surface)), var(--color-surface))",
                        }
                      : undefined
                  }
                >
                  <span className="atlas-kicker text-[0.58rem]">Slack</span>
                  <span className="mt-1 block font-mono text-base text-foreground">
                    {formatCompactUnitValue(
                      analysis.schedule.slackDays,
                      estimateUnit,
                    )}
                  </span>
                  <span className="mt-1 block text-[0.68rem] leading-snug text-muted-foreground">
                    {analysis.schedule.isOnCriticalPath
                      ? "Critical path item with no schedule buffer."
                      : `${formatUnitCount(analysis.schedule.slackDays, estimateUnit)} of schedule flexibility.`}
                  </span>
                </div>
              </>
            )}
          </div>

          {hasScheduleEstimate && (
            <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
              Earliest finish at{" "}
              <span className="font-mono text-foreground">
                {formatCompactUnitValue(
                  analysis.schedule.earliestFinishDay,
                  estimateUnit,
                )}
              </span>
              {analysis.schedule.isOnCriticalPath
                ? ", on the estimated critical path."
                : ` with a latest safe start around ${formatCompactUnitValue(analysis.schedule.latestStartDay, estimateUnit)}.`}
            </p>
          )}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dependencies (editable upstream links + navigable refs)             */}
      {/* ------------------------------------------------------------------ */}
      <DependencyEditorCell
        workItemId={item.id}
        committedValue={item.depends_on}
        baseRevision={baseRevision}
        mode="upstream"
        allWorkItems={allWorkItems}
        snapshot={snapshot}
        patchPlan={patchPlan}
      />
      {analysis.dependencyIds.length > 0 && (
        <Section label={`Open dependency (${analysis.dependencyIds.length})`}>
          <ul className="flex flex-col gap-1.5">
            {analysis.dependencyIds.map((depId) => {
              const dep = snapshot.workItems[depId];
              if (!dep) return null;
              return (
                <li key={depId}>
                  <WorkItemRefButton
                    id={dep.id}
                    title={dep.title}
                    status={dep.status}
                    priority={dep.priority}
                    onClick={onSelectWorkItem}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dependents (derived list + branch-new-dependent affordance)         */}
      {/* ------------------------------------------------------------------ */}
      <DependencyEditorCell
        workItemId={item.id}
        committedValue={analysis.dependentIds}
        baseRevision={baseRevision}
        mode="dependents"
        allWorkItems={allWorkItems}
        snapshot={snapshot}
        patchPlan={patchPlan}
        onBranchNewDependent={onBranchNewDependent}
      />
      {analysis.dependentIds.length > 0 && (
        <Section label={`Open dependent (${analysis.dependentIds.length})`}>
          <ul className="flex flex-col gap-1.5">
            {analysis.dependentIds.map((depId) => {
              const dep = snapshot.workItems[depId];
              if (!dep) return null;
              return (
                <li key={depId}>
                  <WorkItemRefButton
                    id={dep.id}
                    title={dep.title}
                    status={dep.status}
                    priority={dep.priority}
                    onClick={onSelectWorkItem}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Deliverables (editable)                                             */}
      {/* ------------------------------------------------------------------ */}
      <StringListEditorCell
        workItemId={item.id}
        committedValue={item.deliverables}
        baseRevision={baseRevision}
        field="deliverables"
        patchPlan={patchPlan}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Reuse Candidates (editable)                                         */}
      {/* ------------------------------------------------------------------ */}
      <StringListEditorCell
        workItemId={item.id}
        committedValue={item.reuse_candidates}
        baseRevision={baseRevision}
        field="reuse_candidates"
        patchPlan={patchPlan}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Notes (editable)                                                    */}
      {/* ------------------------------------------------------------------ */}
      <NotesEditorCell
        workItemId={item.id}
        committedValue={item.notes ?? null}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Links (editable)                                                    */}
      {/* ------------------------------------------------------------------ */}
      <LinksEditorCell
        workItemId={item.id}
        committedValue={item.links}
        baseRevision={baseRevision}
        patchPlan={patchPlan}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Links (resolved navigation preview)                                 */}
      {/* ------------------------------------------------------------------ */}
      {item.links.length > 0 && (
        <Section label="Open link">
          <div className="flex flex-wrap gap-2">
            {item.links.map((link) => {
              const result = classify(link.href, link.label);
              return (
                <ResourceLink
                  key={`${link.label}:${link.href}`}
                  label={link.label}
                  target={link.href}
                  result={result}
                  onDocumentPreview={onDocumentPreview}
                />
              );
            })}
          </div>
        </Section>
      )}
    </article>
  );
}
