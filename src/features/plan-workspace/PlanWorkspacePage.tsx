import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  type FlowProjection,
  flowProjectionService,
} from "../../lib/graph/flow-projection-service";
import {
  type PlanAnalysisSnapshot,
  usePlanProcessing,
} from "../../lib/plan/plan-processing-pipeline";
import type { TaskGardenStatus } from "../../lib/plan/task-garden-plan.schema";
import { PlanDetailsPanel } from "./PlanDetailsPanel";
import { PlanGraphCanvas } from "./PlanGraphCanvas";
import { PlanInsightsPanel } from "./PlanInsightsPanel";
import {
  PlanOverviewHeader,
  type PlanOverviewHeaderProps,
} from "./PlanOverviewHeader";
import { PlanToolbar } from "./PlanToolbar";
import type {
  PlanToolbarAvailableFilters,
  PlanToolbarProjectionSummary,
} from "./PlanToolbar";
import { PlanValidationState } from "./PlanValidationState";
import { DocumentPreviewModal } from "./document-preview/DocumentPreviewModal";
import { NewItemForm } from "./editing/NewItemForm";
import { PlanOverviewEditor } from "./editing/PlanOverviewEditor";
import { ValidationToast } from "./editing/ValidationToast";
import { WriteThroughStatusFooter } from "./editing/WriteThroughStatusFooter";
import {
  type NewItemFormPrefill,
  useEditingHotkeys,
} from "./editing/editing-keyboard";
import {
  selectCanGoBack,
  selectCanGoForward,
  useNavigationHistoryStore,
} from "./navigation-history.store";
import {
  type InsightMode,
  type PlanDisplayStateValue,
  selectColorMode,
  selectInsightMode,
  selectScheduleOverlay,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import {
  type PlanExplorerStateValue,
  selectActiveScope,
  selectLaneIds,
  selectSearchQuery,
  selectSelectedWorkItemId,
  selectStatuses,
  selectTags,
  usePlanExplorerStore,
} from "./plan-explorer.store";

// ---------------------------------------------------------------------------
// Info popover button
// ---------------------------------------------------------------------------

interface InfoPopoverButtonProps extends PlanOverviewHeaderProps {
  baseRevision: number;
}

function InfoPopoverButton({
  plan,
  estimateSummary,
  estimateUnit,
  classify,
  onDocumentPreview,
  baseRevision,
}: InfoPopoverButtonProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 12 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label="Plan details"
        aria-expanded={open}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:bg-surface-muted"
        {...getReferenceProps()}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <rect
            x="7.25"
            y="7"
            width="1.5"
            height="5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="7.25"
            y="4"
            width="1.5"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
        </svg>
      </button>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, maxHeight: "70vh" }}
            className="atlas-panel z-50 max-w-[360px] overflow-y-auto"
            {...getFloatingProps()}
          >
            <div className="flex flex-col gap-4 p-4">
              <PlanOverviewEditor plan={plan} baseRevision={baseRevision} />
              <PlanOverviewHeader
                plan={plan}
                estimateSummary={estimateSummary}
                estimateUnit={estimateUnit}
                classify={classify}
                onDocumentPreview={onDocumentPreview}
                hideEditableSections
              />
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanWorkspacePageProps {
  /** Raw YAML source for the current plan. */
  source: string;
  /** Monotonic revision counter; bumped on every source change. */
  revision: number;
  /** Basename of the plan file, used for display. */
  planFileName: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Full plan workspace. Handles loading → invalid → ready state transitions,
 * wires all surfaces together through shared stores, and computes FlowProjection
 * from the processing snapshot + current store state.
 */
export function PlanWorkspacePage({
  source,
  revision,
}: PlanWorkspacePageProps) {
  const processingInput = useMemo(
    () => ({ source, revision }),
    [source, revision],
  );
  const processingState = usePlanProcessing(processingInput);

  // ── Local UI state (unconditional hooks — must come before early returns) ──
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"details" | "insights">("details");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [newItemFormState, setNewItemFormState] = useState<{
    open: boolean;
    prefill?: NewItemFormPrefill;
  }>({ open: false });

  const openNewItemForm = useCallback((prefill?: NewItemFormPrefill) => {
    setNewItemFormState({ open: true, prefill });
  }, []);
  const closeNewItemForm = useCallback(() => {
    setNewItemFormState({ open: false });
  }, []);

  // ── Explorer store subscriptions ──────────────────────────────────────────
  const selectedWorkItemId = usePlanExplorerStore(selectSelectedWorkItemId);
  const searchQuery = usePlanExplorerStore(selectSearchQuery);
  const activeScope = usePlanExplorerStore(selectActiveScope);
  const laneIds = usePlanExplorerStore(selectLaneIds);
  const statuses = usePlanExplorerStore(selectStatuses);
  const tags = usePlanExplorerStore(selectTags);
  const selectWorkItem = usePlanExplorerStore((s) => s.selectWorkItem);
  const clearSelection = usePlanExplorerStore((s) => s.clearSelection);

  // ── Navigation history store subscriptions ─────────────────────────────────
  const canGoBack = useNavigationHistoryStore(selectCanGoBack);
  const canGoForward = useNavigationHistoryStore(selectCanGoForward);
  const navPush = useNavigationHistoryStore((s) => s.push);
  const navGoBack = useNavigationHistoryStore((s) => s.goBack);
  const navGoForward = useNavigationHistoryStore((s) => s.goForward);

  // ── Display store subscriptions ───────────────────────────────────────────
  const colorMode = usePlanDisplayStore(selectColorMode);
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const insightMode = usePlanDisplayStore(selectInsightMode);
  const setInsightMode = usePlanDisplayStore((s) => s.setInsightMode);

  // ── Derived state objects (memos — unconditional) ─────────────────────────
  const explorerState: PlanExplorerStateValue = useMemo(
    () => ({
      selectedWorkItemId,
      searchQuery,
      activeScope,
      laneIds,
      statuses,
      tags,
    }),
    [selectedWorkItemId, searchQuery, activeScope, laneIds, statuses, tags],
  );

  const displayState: PlanDisplayStateValue = useMemo(
    () => ({ colorMode, sizeMode, insightMode, scheduleOverlay }),
    [colorMode, sizeMode, insightMode, scheduleOverlay],
  );

  // Snapshot is only non-null in ready state
  const snapshot: PlanAnalysisSnapshot | null =
    processingState.status === "ready" ? processingState.snapshot : null;

  // Topology — depends only on snapshot + explorer state (no display state)
  const topology = useMemo(() => {
    if (!snapshot) return null;
    return flowProjectionService.projectTopology(snapshot, explorerState);
  }, [snapshot, explorerState]);

  // Legends — depend on snapshot + display state + visible IDs from topology
  const legends = useMemo(() => {
    if (!snapshot || !topology) return null;
    return flowProjectionService.buildLegendsForView(
      snapshot,
      displayState,
      topology.visibleIds,
    );
  }, [snapshot, displayState, topology]);

  // Compose topology and legends into a single FlowProjection for downstream consumers
  const projection: FlowProjection | null = useMemo(() => {
    if (!topology || !legends) return null;
    return {
      nodes: topology.nodes,
      edges: topology.edges,
      emptyStateMessage: topology.emptyStateMessage,
      summary: topology.summary,
      ...legends,
    };
  }, [topology, legends]);

  // Available filter options derived from plan data
  const availableFilters: PlanToolbarAvailableFilters = useMemo(() => {
    if (!snapshot) {
      return { lanes: [], statuses: [], tags: [] };
    }
    const items = Object.values(snapshot.workItems);
    return {
      lanes: snapshot.plan.lanes,
      statuses: [...new Set(items.map((i) => i.status))] as TaskGardenStatus[],
      tags: [...new Set(items.flatMap((i) => i.tags))],
    };
  }, [snapshot]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleDocumentPreview = useCallback((documentPath: string) => {
    setPreviewPath(documentPath);
  }, []);

  const closePreview = useCallback(() => setPreviewPath(null), []);

  const handleSelectWorkItem = useCallback(
    (id: string) => {
      navPush(id);
      selectWorkItem(id);
      setRightTab("details");
    },
    [navPush, selectWorkItem],
  );

  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleGoBack = useCallback(() => {
    const id = navGoBack();
    if (id) {
      selectWorkItem(id);
      setRightTab("details");
    }
  }, [navGoBack, selectWorkItem]);

  const handleGoForward = useCallback(() => {
    const id = navGoForward();
    if (id) {
      selectWorkItem(id);
      setRightTab("details");
    }
  }, [navGoForward, selectWorkItem]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useHotkeys(
    "alt+left",
    handleGoBack,
    { enabled: canGoBack, preventDefault: true },
    [handleGoBack, canGoBack],
  );
  useHotkeys(
    "alt+right",
    handleGoForward,
    { enabled: canGoForward, preventDefault: true },
    [handleGoForward, canGoForward],
  );

  const activeLaneScope = laneIds.length === 1 ? laneIds[0] : null;
  const firstLaneId = snapshot?.plan.lanes[0]?.id ?? null;
  const openDetailsAndFocusTitle = useCallback(() => {
    setRightTab("details");
    setRightOpen(true);
    // Defer focus until the details panel paints the editable title.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="editable-title"]',
      );
      el?.focus();
    });
  }, []);

  useEditingHotkeys({
    openNewItemForm,
    selectedWorkItemId,
    activeLaneScope,
    firstLaneId,
    openDetailsAndFocusTitle,
  });

  const handleSetInsightMode = useCallback(
    (mode: InsightMode) => {
      setInsightMode(mode);
      setRightTab("insights");
    },
    [setInsightMode],
  );

  const closeMobilePanels = useCallback(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, []);

  // ── Loading / invalid — render validation state ───────────────────────────
  if (processingState.status !== "ready") {
    return (
      <div className="atlas-page flex min-h-screen items-center justify-center p-6">
        <div className="w-full">
          <PlanValidationState state={processingState} />
        </div>
      </div>
    );
  }

  // ── Ready state ───────────────────────────────────────────────────────────
  // Both snapshot and projection are guaranteed non-null here.
  const readySnapshot = snapshot!;
  const readyProjection = projection!;

  const projectionSummary: PlanToolbarProjectionSummary = {
    hiddenNodeCount: readyProjection.summary.hiddenNodeCount,
    selectedNodeFilteredOut: readyProjection.summary.selectedNodeFilteredOut,
  };

  return (
    <>
      {/* ── Document preview modal ─────────────────────────────────────── */}
      <DocumentPreviewModal documentPath={previewPath} onClose={closePreview} />

      {/* ── Workspace ──────────────────────────────────────────────────── */}
      <div className="atlas-page flex h-screen overflow-hidden">
        {/* Mobile backdrop — dismisses open panels */}
        {(leftOpen || rightOpen) && (
          // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click
          <div
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobilePanels}
            aria-hidden="true"
          />
        )}

        {/* ============================================================ */}
        {/* Left sidebar — Plan overview + Toolbar                       */}
        {/* ============================================================ */}
        <aside
          className={[
            // Base styles (shared mobile + desktop)
            "flex flex-col border-r border-border",
            // Mobile: fixed overlay, toggle via leftOpen
            "fixed inset-y-0 left-0 z-40 w-72 bg-panel/98 backdrop-blur-xl",
            "transition-transform duration-300 ease-in-out",
            leftOpen ? "translate-x-0" : "-translate-x-full",
            // Desktop: in-flow, always visible
            "lg:relative lg:z-auto lg:translate-x-0 lg:bg-panel lg:backdrop-blur-none",
          ].join(" ")}
          aria-label="Plan controls"
        >
          {/* Compact plan header with info popover */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
            <h1 className="atlas-title min-w-0 flex-1 truncate text-lg text-foreground">
              {readySnapshot.plan.title}
            </h1>
            <InfoPopoverButton
              plan={readySnapshot.plan}
              estimateSummary={readySnapshot.estimateSummary}
              estimateUnit={readySnapshot.estimateUnit}
              onDocumentPreview={handleDocumentPreview}
              baseRevision={processingState.input.revision}
            />
          </div>

          {/* Filter + encoding controls */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PlanToolbar
              availableFilters={availableFilters}
              projectionSummary={projectionSummary}
              baseRevision={processingState.input.revision}
              onNewItem={() => {
                const lane = activeLaneScope ?? firstLaneId ?? undefined;
                openNewItemForm(lane ? { lane } : undefined);
              }}
            />
          </div>
        </aside>

        {/* ============================================================ */}
        {/* Center + right column                                        */}
        {/* ============================================================ */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile top bar — shown only on narrow viewports */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-panel/90 px-4 py-2.5 backdrop-blur-sm lg:hidden">
            <button
              type="button"
              onClick={() => {
                setLeftOpen((v) => !v);
                setRightOpen(false);
              }}
              aria-expanded={leftOpen}
              aria-label="Toggle controls panel"
              className="atlas-chip text-[0.65rem]"
            >
              ☰ Controls
            </button>
            <span className="atlas-title text-sm text-foreground">
              Task Garden
            </span>
            <button
              type="button"
              onClick={() => {
                setRightOpen((v) => !v);
                setLeftOpen(false);
              }}
              aria-expanded={rightOpen}
              aria-label="Toggle details panel"
              className="atlas-chip text-[0.65rem]"
            >
              Details ⊞
            </button>
          </div>

          {/* Graph canvas + right panel — the main content row */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* ──────────────────────────────────────────────────── */}
            {/* Graph canvas                                         */}
            {/* ──────────────────────────────────────────────────── */}
            <main
              className="relative min-w-0 flex-1"
              aria-label="Plan graph visualization"
            >
              {/* ReactFlow requires an explicit-height container */}
              <div className="absolute inset-0">
                <PlanGraphCanvas
                  projection={readyProjection}
                  selectedWorkItemId={selectedWorkItemId}
                  onSelectWorkItem={handleSelectWorkItem}
                  onClearSelection={handleClearSelection}
                  lanes={readySnapshot.plan.lanes}
                  onAddInLane={(laneId) => openNewItemForm({ lane: laneId })}
                />
              </div>
            </main>

            {/* ──────────────────────────────────────────────────── */}
            {/* Right panel — Details / Insights                     */}
            {/* ──────────────────────────────────────────────────── */}
            <aside
              className={[
                "flex flex-col border-l border-border",
                "fixed inset-y-0 right-0 z-40 w-80 bg-panel/98 backdrop-blur-xl",
                "transition-transform duration-300 ease-in-out",
                rightOpen ? "translate-x-0" : "translate-x-full",
                "lg:relative lg:z-auto lg:translate-x-0 lg:bg-panel lg:backdrop-blur-none",
              ].join(" ")}
              aria-label="Details and insights"
            >
              {/* Tab bar */}
              <div
                className="flex shrink-0 border-b border-border"
                role="tablist"
                aria-label="Right panel tabs"
              >
                {(["details", "insights"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={rightTab === tab}
                    onClick={() => setRightTab(tab)}
                    className={[
                      "flex-1 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                      rightTab === tab
                        ? "border-moss text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab === "details" ? "Details" : "Insights"}
                  </button>
                ))}
              </div>

              {/* Panel content */}
              <div
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4"
                role="tabpanel"
                aria-label={
                  rightTab === "details" ? "Details panel" : "Insights panel"
                }
              >
                {rightTab === "details" ? (
                  <PlanDetailsPanel
                    snapshot={readySnapshot}
                    explorer={explorerState}
                    baseRevision={processingState.input.revision}
                    selectedNodeFilteredOut={
                      readyProjection.summary.selectedNodeFilteredOut
                    }
                    onSelectWorkItem={handleSelectWorkItem}
                    onDocumentPreview={handleDocumentPreview}
                    onBranchNewDependent={
                      selectedWorkItemId
                        ? () =>
                            openNewItemForm({ dependsOn: [selectedWorkItemId] })
                        : undefined
                    }
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={handleGoBack}
                    onGoForward={handleGoForward}
                  />
                ) : (
                  <PlanInsightsPanel
                    snapshot={readySnapshot}
                    display={displayState}
                    explorer={explorerState}
                    projection={readyProjection}
                    onSelectWorkItem={handleSelectWorkItem}
                    onSetInsightMode={handleSetInsightMode}
                  />
                )}
              </div>

              {/* Write-through footer — always mounted so phase transitions are visible */}
              <div className="shrink-0 border-t border-border bg-panel">
                <WriteThroughStatusFooter />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Page-level validation toast (rendered via FloatingPortal internally) */}
      <ValidationToast />

      {/* New work item form — opened via toolbar, ghost-node, or N/⇧N hotkeys */}
      <NewItemForm
        open={newItemFormState.open}
        onClose={closeNewItemForm}
        prefill={newItemFormState.prefill}
        lanes={readySnapshot.plan.lanes}
        baseRevision={processingState.input.revision}
      />
    </>
  );
}
