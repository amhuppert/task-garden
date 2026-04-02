import type { PlanAnalysisSnapshot } from "../../lib/graph/plan-analysis-engine";
import type {
  ReferenceResolutionFailure,
  ReferenceResolverService,
  ResolvedReference,
} from "../../lib/plan/reference-resolver";
import {
  formatEstimate,
  getPriorityLabel,
  getStatusLabel,
} from "./plan-details-panel.helpers";
import type { PlanExplorerStateValue } from "./plan-explorer.store";
import {
  getPriorityAccentColor,
  getStatusAccentColor,
} from "./plan-graph-canvas.helpers";
import { deriveReferenceLabel } from "./plan-overview-header.helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanDetailsPanelProps {
  /** The full analysis snapshot for the ready plan. */
  snapshot: PlanAnalysisSnapshot;
  /** Explorer store state — used to derive the selected work item. */
  explorer: PlanExplorerStateValue;
  /** Reference resolver — inject for testability, use singleton in production. */
  resolver: ReferenceResolverService;
  /**
   * True when the selected item is shown only as a context node because it
   * doesn't match the active filter set. Sourced from FlowProjection.summary.selectedNodeFilteredOut.
   */
  selectedNodeFilteredOut: boolean;
  /** Called when the user navigates to a dependency or dependent item. */
  onSelectWorkItem?: (id: string) => void;
  /** Called when a successfully resolved bundled document reference is activated. */
  onDocumentPreview?: (documentPath: string, rawDocument: string) => void;
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
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.68rem] text-muted-foreground">
          {id}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: getStatusAccentColor(
                status as Parameters<typeof getStatusAccentColor>[0],
              ),
            }}
            aria-label={status}
          />
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
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
// Resolved link item
// ---------------------------------------------------------------------------

type ResolveResult =
  | { ok: true; value: ResolvedReference }
  | { ok: false; error: ReferenceResolutionFailure };

interface ResolvedLinkItemProps {
  label: string;
  result: ResolveResult;
  onDocumentPreview?: (documentPath: string, rawDocument: string) => void;
}

function ResolvedLinkItem({
  label,
  result,
  onDocumentPreview,
}: ResolvedLinkItemProps) {
  if (!result.ok) {
    return (
      <button
        type="button"
        disabled
        title={result.error.message}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-2.5 py-1 font-mono text-xs text-muted-foreground opacity-50 cursor-not-allowed"
      >
        <span aria-hidden="true">⊘</span>
        {label}
      </button>
    );
  }

  const ref = result.value;

  if (ref.kind === "external_url") {
    return (
      <a
        href={ref.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted"
      >
        <span aria-hidden="true">↗</span>
        {label}
      </a>
    );
  }

  // bundled_document
  return (
    <button
      type="button"
      onClick={() => onDocumentPreview?.(ref.documentPath, ref.rawDocument)}
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted"
    >
      <span aria-hidden="true">⊞</span>
      {label}
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
  resolver,
  selectedNodeFilteredOut,
  onSelectWorkItem,
  onDocumentPreview,
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

  const lane = snapshot.plan.lanes.find((l) => l.id === item.lane);

  const statusColor = getStatusAccentColor(item.status);
  const priorityColor = getPriorityAccentColor(item.priority);

  return (
    <article
      className="flex flex-col gap-6"
      aria-label={`Details: ${item.title}`}
    >
      {/* Context-only banner */}
      {selectedNodeFilteredOut && <ContextOnlyBanner />}

      {/* ------------------------------------------------------------------ */}
      {/* Core: id, title, summary                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground">
          {item.id}
        </p>
        <h2 className="atlas-title text-xl leading-tight text-foreground">
          {item.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.summary}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metadata chips: lane, status, priority                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-2">
        {/* Lane */}
        {lane && (
          <span
            className="atlas-chip"
            style={
              lane.color
                ? { borderColor: lane.color, color: lane.color }
                : undefined
            }
          >
            {lane.label}
          </span>
        )}

        {/* Status */}
        <span
          className="atlas-chip"
          style={{
            borderColor: `color-mix(in oklab, ${statusColor} 46%, transparent)`,
            color: statusColor,
          }}
        >
          {getStatusLabel(item.status)}
        </span>

        {/* Priority */}
        <span
          className="atlas-chip"
          style={{
            borderColor: `color-mix(in oklab, ${priorityColor} 46%, transparent)`,
            color: priorityColor,
          }}
        >
          {getPriorityLabel(item.priority)}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tags                                                                */}
      {/* ------------------------------------------------------------------ */}
      {item.tags.length > 0 && (
        <Section label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="atlas-chip">
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Estimate                                                            */}
      {/* ------------------------------------------------------------------ */}
      {item.estimate && (
        <Section label="Estimate">
          <p className="font-mono text-sm text-foreground">
            {formatEstimate(item.estimate)}
          </p>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dependencies                                                        */}
      {/* ------------------------------------------------------------------ */}
      {analysis.dependencyIds.length > 0 && (
        <Section label={`Dependencies (${analysis.dependencyIds.length})`}>
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
      {/* Dependents                                                          */}
      {/* ------------------------------------------------------------------ */}
      {analysis.dependentIds.length > 0 && (
        <Section label={`Dependents (${analysis.dependentIds.length})`}>
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
      {/* Deliverables                                                        */}
      {/* ------------------------------------------------------------------ */}
      {item.deliverables.length > 0 && (
        <Section label="Deliverables">
          <ul className="flex flex-col gap-1 pl-1">
            {item.deliverables.map((d) => (
              <li
                key={d}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                >
                  ·
                </span>
                {d}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Reuse Candidates                                                    */}
      {/* ------------------------------------------------------------------ */}
      {item.reuse_candidates.length > 0 && (
        <Section label="Reuse Candidates">
          <ul className="flex flex-col gap-1 pl-1">
            {item.reuse_candidates.map((rc) => (
              <li
                key={rc}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                >
                  ↺
                </span>
                {rc}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Notes                                                               */}
      {/* ------------------------------------------------------------------ */}
      {item.notes && (
        <Section label="Notes">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {item.notes}
          </p>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Links (resolved)                                                    */}
      {/* ------------------------------------------------------------------ */}
      {item.links.length > 0 && (
        <Section label="Links">
          <div className="flex flex-wrap gap-2">
            {item.links.map((link) => {
              const label = link.label || deriveReferenceLabel(link.href);
              const result = resolver.resolve(link.href, label);
              return (
                <ResolvedLinkItem
                  key={link.href}
                  label={label}
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
