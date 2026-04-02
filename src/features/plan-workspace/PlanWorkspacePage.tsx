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
import {
  type FlowProjection,
  flowProjectionService,
} from "../../lib/graph/flow-projection-service";
import {
  type PlanAnalysisSnapshot,
  usePlanProcessing,
} from "../../lib/plan/plan-processing-pipeline";
import type { PlanSourceEmission } from "../../lib/plan/plan-source-subscription";
import { referenceResolver } from "../../lib/plan/reference-resolver";
import type {
  TaskGardenPriority,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";
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
import {
  type InsightMode,
  type PlanDisplayStateValue,
  selectColorMode,
  selectInsightMode,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import {
  type PlanExplorerStateValue,
  selectActiveScope,
  selectLaneIds,
  selectPriorities,
  selectSearchQuery,
  selectSelectedWorkItemId,
  selectStatuses,
  selectTags,
  usePlanExplorerStore,
} from "./plan-explorer.store";

// ---------------------------------------------------------------------------
// Info popover button
// ---------------------------------------------------------------------------

function InfoPopoverButton({
  plan,
  resolver,
  onDocumentPreview,
}: PlanOverviewHeaderProps) {
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
            <div className="p-4">
              <PlanOverviewHeader
                plan={plan}
                resolver={resolver}
                onDocumentPreview={onDocumentPreview}
              />
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Document preview modal
// ---------------------------------------------------------------------------

interface DocumentPreviewProps {
  documentPath: string;
  rawDocument: string;
  onClose: () => void;
}

function DocumentPreviewModal({
  documentPath,
  rawDocument,
  onClose,
}: DocumentPreviewProps) {
  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex h-full w-full max-h-none max-w-none items-center justify-center bg-background/80 backdrop-blur-sm m-0 p-0 border-none"
      aria-modal="true"
      aria-label={`Document preview: ${documentPath}`}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="atlas-panel relative mx-4 flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="atlas-kicker mb-0.5">Document Preview</p>
            <p className="font-mono text-xs text-muted-foreground">
              {documentPath}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-muted"
          >
            ✕
          </button>
        </div>

        {/* Raw content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
            {rawDocument}
          </pre>
        </div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanWorkspacePageProps {
  /** Current plan source emission, or null while loading. */
  source: PlanSourceEmission | null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Full plan workspace. Handles loading → invalid → ready state transitions,
 * wires all surfaces together through shared stores, and computes FlowProjection
 * from the processing snapshot + current store state.
 */
export function PlanWorkspacePage({ source }: PlanWorkspacePageProps) {
  const processingState = usePlanProcessing(source);

  // ── Local UI state (unconditional hooks — must come before early returns) ──
  const [preview, setPreview] = useState<{
    documentPath: string;
    rawDocument: string;
  } | null>(null);
  const [rightTab, setRightTab] = useState<"details" | "insights">("details");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // ── Explorer store subscriptions ──────────────────────────────────────────
  const selectedWorkItemId = usePlanExplorerStore(selectSelectedWorkItemId);
  const searchQuery = usePlanExplorerStore(selectSearchQuery);
  const activeScope = usePlanExplorerStore(selectActiveScope);
  const laneIds = usePlanExplorerStore(selectLaneIds);
  const statuses = usePlanExplorerStore(selectStatuses);
  const priorities = usePlanExplorerStore(selectPriorities);
  const tags = usePlanExplorerStore(selectTags);
  const selectWorkItem = usePlanExplorerStore((s) => s.selectWorkItem);

  // ── Display store subscriptions ───────────────────────────────────────────
  const colorMode = usePlanDisplayStore(selectColorMode);
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
      priorities,
      tags,
    }),
    [
      selectedWorkItemId,
      searchQuery,
      activeScope,
      laneIds,
      statuses,
      priorities,
      tags,
    ],
  );

  const displayState: PlanDisplayStateValue = useMemo(
    () => ({ colorMode, sizeMode, insightMode }),
    [colorMode, sizeMode, insightMode],
  );

  // Snapshot is only non-null in ready state
  const snapshot: PlanAnalysisSnapshot | null =
    processingState.status === "ready" ? processingState.snapshot : null;

  // FlowProjection — null when not ready
  const projection: FlowProjection | null = useMemo(() => {
    if (!snapshot) return null;
    return flowProjectionService.project(snapshot, explorerState, displayState);
  }, [snapshot, explorerState, displayState]);

  // Available filter options derived from plan data
  const availableFilters: PlanToolbarAvailableFilters = useMemo(() => {
    if (!snapshot) {
      return { lanes: [], statuses: [], priorities: [], tags: [] };
    }
    const items = Object.values(snapshot.workItems);
    return {
      lanes: snapshot.plan.lanes.map((l) => ({ id: l.id, label: l.label })),
      statuses: [...new Set(items.map((i) => i.status))] as TaskGardenStatus[],
      priorities: [
        ...new Set(items.map((i) => i.priority)),
      ] as TaskGardenPriority[],
      tags: [...new Set(items.flatMap((i) => i.tags))],
    };
  }, [snapshot]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleDocumentPreview = useCallback(
    (documentPath: string, rawDocument: string) => {
      setPreview({ documentPath, rawDocument });
    },
    [],
  );

  const closePreview = useCallback(() => setPreview(null), []);

  const handleSelectWorkItem = useCallback(
    (id: string) => {
      selectWorkItem(id);
      setRightTab("details");
    },
    [selectWorkItem],
  );

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
      {preview && (
        <DocumentPreviewModal
          documentPath={preview.documentPath}
          rawDocument={preview.rawDocument}
          onClose={closePreview}
        />
      )}

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
              resolver={referenceResolver}
              onDocumentPreview={handleDocumentPreview}
            />
          </div>

          {/* Filter + encoding controls */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PlanToolbar
              availableFilters={availableFilters}
              projectionSummary={projectionSummary}
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
                <PlanGraphCanvas projection={readyProjection} />
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
                className="min-h-0 flex-1 overflow-y-auto p-4"
                role="tabpanel"
                aria-label={
                  rightTab === "details" ? "Details panel" : "Insights panel"
                }
              >
                {rightTab === "details" ? (
                  <PlanDetailsPanel
                    snapshot={readySnapshot}
                    explorer={explorerState}
                    resolver={referenceResolver}
                    selectedNodeFilteredOut={
                      readyProjection.summary.selectedNodeFilteredOut
                    }
                    onSelectWorkItem={handleSelectWorkItem}
                    onDocumentPreview={handleDocumentPreview}
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
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
