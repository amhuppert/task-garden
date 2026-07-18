import {
  FloatingFocusManager,
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
import { memo, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type {
  TaskGardenLane,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";
import { SectionInfoModal } from "./SectionInfoModal";
import { LaneInlineEditor } from "./editing/LaneInlineEditor";
import { PencilGlyph } from "./editing/glyphs";
import {
  selectColorMode,
  selectScheduleOverlay,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import {
  selectActiveScope,
  selectHasActiveFilters,
  selectLaneIds,
  selectSearchQuery,
  selectSelectedWorkItemId,
  selectStatuses,
  selectTags,
  usePlanExplorerStore,
} from "./plan-explorer.store";
import {
  COLOR_MODE_OPTIONS,
  METRIC_SIZE_DESCRIPTIONS,
  type MetricSizeMode,
  SCHEDULE_OVERLAY_DESCRIPTIONS,
  SCHEDULE_OVERLAY_OPTIONS,
  SCOPE_OPTIONS,
  SIZE_MODE_OPTIONS,
  getColorModeDescription,
  getColorModeLabel,
  getScheduleOverlayLabel,
  getScopeLabel,
  getSizeModeLabel,
} from "./plan-toolbar.helpers";

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TaskGardenStatus, string> = {
  planned: "Planned",
  ready: "Ready",
  blocked: "Blocked",
  in_progress: "In Progress",
  done: "Done",
  future: "Future",
};

const METRIC_SIZE_MODES = Object.keys(
  METRIC_SIZE_DESCRIPTIONS,
) as MetricSizeMode[];

// ---------------------------------------------------------------------------
// Info modals (static — never re-render with store changes)
// ---------------------------------------------------------------------------

function ScopeInfoModal() {
  return (
    <SectionInfoModal title="Scope">
      <p>
        Scope narrows the graph around the selected item. It is useful when you
        want to focus on just the work before it, after it, or both.
      </p>
      <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
        <span className="font-semibold text-foreground/70">How it works: </span>
        The app follows dependency links from the selected item. Upstream shows
        prerequisites, downstream shows follow-on work, and full chain shows
        both directions together.
      </div>
    </SectionInfoModal>
  );
}

function ColorInfoModal() {
  return (
    <SectionInfoModal title="Color Encoding">
      <dl className="flex flex-col gap-4">
        {COLOR_MODE_OPTIONS.map((mode) => {
          const desc = getColorModeDescription(mode);
          return (
            <div key={mode}>
              <dt className="text-[0.72rem] font-semibold text-foreground">
                {getColorModeLabel(mode).replace("By ", "")}
              </dt>
              <dd className="mt-0.5">{desc.summary}</dd>
              <dd className="mt-1.5 rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                {desc.calculation}
              </dd>
            </div>
          );
        })}
      </dl>
    </SectionInfoModal>
  );
}

function SizeInfoModal() {
  return (
    <SectionInfoModal title="Node Size">
      <dl className="flex flex-col gap-4">
        {METRIC_SIZE_MODES.map((mode) => {
          const desc = METRIC_SIZE_DESCRIPTIONS[mode];
          return (
            <div key={mode}>
              <dt className="text-[0.72rem] font-semibold text-foreground">
                {getSizeModeLabel(mode).replace("By ", "")}
              </dt>
              <dd className="mt-0.5">{desc.summary}</dd>
              <dd className="mt-1.5 rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                {desc.calculation}
              </dd>
            </div>
          );
        })}
      </dl>
    </SectionInfoModal>
  );
}

function ScheduleOverlayInfoModal() {
  return (
    <SectionInfoModal title="Schedule Overlay">
      <dl className="flex flex-col gap-4">
        {SCHEDULE_OVERLAY_OPTIONS.map((mode) => {
          const desc = SCHEDULE_OVERLAY_DESCRIPTIONS[mode];
          return (
            <div key={mode}>
              <dt className="text-[0.72rem] font-semibold text-foreground">
                {getScheduleOverlayLabel(mode)}
              </dt>
              <dd className="mt-0.5">{desc.summary}</dd>
              <dd className="mt-1.5 rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                {desc.calculation}
              </dd>
            </div>
          );
        })}
      </dl>
    </SectionInfoModal>
  );
}

// ---------------------------------------------------------------------------
// Section components — each subscribes only to the store slices it needs so
// that store updates only re-render the affected section, not the whole toolbar.
// ---------------------------------------------------------------------------

interface VisibilitySummarySectionProps {
  hiddenNodeCount: number;
  selectedNodeFilteredOut: boolean;
}

const VisibilitySummarySection = memo(function VisibilitySummarySection({
  hiddenNodeCount,
  selectedNodeFilteredOut,
}: VisibilitySummarySectionProps) {
  if (hiddenNodeCount === 0 && !selectedNodeFilteredOut) return null;
  return (
    <div className="flex flex-col gap-2">
      {hiddenNodeCount > 0 && (
        <output className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-pollen"
            aria-hidden="true"
          />
          {hiddenNodeCount} item{hiddenNodeCount !== 1 ? "s" : ""} hidden by
          filters
        </output>
      )}
      {selectedNodeFilteredOut && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-2 text-xs text-petal"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-petal"
            aria-hidden="true"
          />
          Selected item is hidden by active filters
        </div>
      )}
    </div>
  );
});

function SearchSection() {
  const searchQuery = usePlanExplorerStore(selectSearchQuery);
  const setSearchQuery = usePlanExplorerStore((s) => s.setSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local input state — typing only re-renders this section. The store is
  // updated 150ms after the last keystroke so the projection doesn't rebuild
  // mid-burst. We mirror external changes (e.g. clearFilters) back in.
  const [searchInput, setSearchInput] = useState(searchQuery);
  useEffect(() => {
    setSearchInput((prev) => (prev === searchQuery ? prev : searchQuery));
  }, [searchQuery]);
  useEffect(() => {
    if (searchInput === searchQuery) return;
    const id = setTimeout(() => setSearchQuery(searchInput), 150);
    return () => clearTimeout(id);
  }, [searchInput, searchQuery, setSearchQuery]);

  useHotkeys(
    "slash",
    (event) => {
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    { enableOnFormTags: false, enableOnContentEditable: false },
  );

  return (
    <section>
      <label>
        <span className="atlas-kicker mb-2 flex items-center justify-between">
          Search
          <span className="font-mono normal-case tracking-normal opacity-70">
            /
          </span>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="atlas-field atlas-field-focus"
          placeholder="Search id, title, summary, tag, lane…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </label>
    </section>
  );
}

function ClearFiltersButton() {
  const hasActiveFilters = usePlanExplorerStore(selectHasActiveFilters);
  const clearFilters = usePlanExplorerStore((s) => s.clearFilters);
  if (!hasActiveFilters) return null;
  return (
    <button
      type="button"
      onClick={clearFilters}
      className="atlas-button-secondary w-full text-xs"
    >
      Clear all filters
    </button>
  );
}

interface LaneChipProps {
  lane: TaskGardenLane;
  active: boolean;
  onToggle: () => void;
  baseRevision: number;
}

function LaneChip({ lane, active, onToggle, baseRevision }: LaneChipProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: editorOpen,
    onOpenChange: setEditorOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        onClick={onToggle}
        className={`atlas-chip hover:border-border-strong${active ? " atlas-chip-active" : ""}`}
      >
        {lane.label}
      </button>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={`Edit lane ${lane.label}`}
        data-testid={`lane-edit-${lane.id}`}
        className="ml-0.5 inline-flex items-center rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        {...getReferenceProps()}
      >
        <PencilGlyph size={10} />
      </button>
      {editorOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="atlas-panel z-50 w-64"
              aria-label={`Edit lane ${lane.label}`}
              {...getFloatingProps()}
            >
              <LaneInlineEditor
                laneId={lane.id}
                committedLane={lane}
                baseRevision={baseRevision}
              />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </span>
  );
}

interface LaneFilterSectionProps {
  lanes: readonly TaskGardenLane[];
  baseRevision: number;
}

const LaneFilterSection = memo(function LaneFilterSection({
  lanes,
  baseRevision,
}: LaneFilterSectionProps) {
  const activeLaneIds = usePlanExplorerStore(selectLaneIds);
  const toggleLaneFilter = usePlanExplorerStore((s) => s.toggleLaneFilter);
  if (lanes.length === 0) return null;
  return (
    <section>
      <span className="atlas-kicker mb-2 block">Lane</span>
      <div className="flex flex-wrap gap-1.5">
        {lanes.map((lane) => (
          <LaneChip
            key={lane.id}
            lane={lane}
            active={activeLaneIds.includes(lane.id)}
            onToggle={() => toggleLaneFilter(lane.id)}
            baseRevision={baseRevision}
          />
        ))}
      </div>
    </section>
  );
});

interface StatusFilterSectionProps {
  availableStatuses: readonly TaskGardenStatus[];
}

const StatusFilterSection = memo(function StatusFilterSection({
  availableStatuses,
}: StatusFilterSectionProps) {
  const activeStatuses = usePlanExplorerStore(selectStatuses);
  const toggleStatusFilter = usePlanExplorerStore((s) => s.toggleStatusFilter);
  if (availableStatuses.length === 0) return null;
  return (
    <section>
      <span className="atlas-kicker mb-2 block">Status</span>
      <div className="flex flex-wrap gap-1.5">
        {availableStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatusFilter(status)}
            className={`atlas-chip hover:border-border-strong${activeStatuses.includes(status) ? " atlas-chip-active" : ""}`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </section>
  );
});

interface TagFilterSectionProps {
  availableTags: readonly string[];
}

const TagFilterSection = memo(function TagFilterSection({
  availableTags,
}: TagFilterSectionProps) {
  const activeTags = usePlanExplorerStore(selectTags);
  const toggleTagFilter = usePlanExplorerStore((s) => s.toggleTagFilter);
  const [tagsExpanded, setTagsExpanded] = useState(
    () => availableTags.length <= 5,
  );
  if (availableTags.length === 0) return null;

  const visibleTags = (() => {
    if (tagsExpanded) return availableTags;
    const active = availableTags.filter((t) => activeTags.includes(t));
    return active.length > 0 ? active : availableTags.slice(0, 3);
  })();
  const hiddenCount = tagsExpanded
    ? 0
    : availableTags.length - visibleTags.length;

  return (
    <section>
      <button
        type="button"
        onClick={() => setTagsExpanded((v) => !v)}
        className="atlas-kicker mb-2 flex w-full items-center justify-between"
      >
        <span>Tags</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={`text-muted-foreground transition-transform duration-200${tagsExpanded ? " rotate-180" : ""}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTagFilter(tag)}
            className={`atlas-chip hover:border-border-strong${activeTags.includes(tag) ? " atlas-chip-active" : ""}`}
          >
            {tag}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground self-center">
            +{hiddenCount} more
          </span>
        )}
      </div>
    </section>
  );
});

function ScopeSection() {
  const activeScope = usePlanExplorerStore(selectActiveScope);
  const selectedWorkItemId = usePlanExplorerStore(selectSelectedWorkItemId);
  const setScope = usePlanExplorerStore((s) => s.setScope);
  const hasSelection = selectedWorkItemId !== null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="atlas-kicker flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          Scope
          <ScopeInfoModal />
        </span>
        <span className="min-w-0 truncate whitespace-nowrap font-mono text-xs text-muted-foreground">
          {getScopeLabel(activeScope)}
        </span>
      </div>
      {!hasSelection && (
        <p className="mb-2 text-xs text-muted-foreground">
          Select an item to scope the view
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {SCOPE_OPTIONS.map((scope) => {
          const isDisabled = !hasSelection && scope !== "all";
          return (
            <button
              key={scope}
              type="button"
              onClick={() => setScope(scope)}
              disabled={isDisabled}
              aria-pressed={activeScope === scope}
              className={`atlas-chip hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40${activeScope === scope ? " atlas-chip-active" : ""}`}
            >
              {getScopeLabel(scope)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ColorEncodingSection() {
  const colorMode = usePlanDisplayStore(selectColorMode);
  const setColorMode = usePlanDisplayStore((s) => s.setColorMode);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="atlas-kicker flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          Color
          <ColorInfoModal />
        </span>
        <span className="min-w-0 truncate whitespace-nowrap font-mono text-xs text-muted-foreground">
          {getColorModeLabel(colorMode)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_MODE_OPTIONS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setColorMode(mode)}
            aria-pressed={colorMode === mode}
            className={`atlas-chip hover:border-border-strong${colorMode === mode ? " atlas-chip-active" : ""}`}
          >
            {getColorModeLabel(mode)}
          </button>
        ))}
      </div>
    </section>
  );
}

function ScheduleOverlaySection() {
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const setScheduleOverlay = usePlanDisplayStore((s) => s.setScheduleOverlay);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="atlas-kicker flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          Schedule Overlay
          <ScheduleOverlayInfoModal />
        </span>
        <span className="min-w-0 truncate whitespace-nowrap font-mono text-xs text-muted-foreground">
          {getScheduleOverlayLabel(scheduleOverlay)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SCHEDULE_OVERLAY_OPTIONS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setScheduleOverlay(mode)}
            aria-pressed={scheduleOverlay === mode}
            className={`atlas-chip hover:border-border-strong${scheduleOverlay === mode ? " atlas-chip-active" : ""}`}
          >
            {getScheduleOverlayLabel(mode)}
          </button>
        ))}
      </div>
    </section>
  );
}

function SizeEncodingSection() {
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const setSizeMode = usePlanDisplayStore((s) => s.setSizeMode);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="atlas-kicker flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          Node Size
          <SizeInfoModal />
        </span>
        <span className="min-w-0 truncate whitespace-nowrap font-mono text-xs text-muted-foreground">
          {getSizeModeLabel(sizeMode)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SIZE_MODE_OPTIONS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSizeMode(mode)}
            aria-pressed={sizeMode === mode}
            className={`atlas-chip hover:border-border-strong${sizeMode === mode ? " atlas-chip-active" : ""}`}
          >
            {getSizeModeLabel(mode)}
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanToolbarAvailableFilters {
  lanes: readonly TaskGardenLane[];
  statuses: readonly TaskGardenStatus[];
  tags: readonly string[];
}

export interface PlanToolbarProjectionSummary {
  hiddenNodeCount: number;
  selectedNodeFilteredOut: boolean;
}

export interface PlanToolbarProps {
  availableFilters: PlanToolbarAvailableFilters;
  projectionSummary: PlanToolbarProjectionSummary;
  baseRevision: number;
  /** Opens the new-item form (toolbar entry point). */
  onNewItem: () => void;
}

// ---------------------------------------------------------------------------
// Container — a thin shell that passes prop slices to each section. The
// shell itself does not subscribe to any store, so it only re-renders when
// its parent passes new props (i.e. when the projection or available filters
// change).
// ---------------------------------------------------------------------------

export function PlanToolbar({
  availableFilters,
  projectionSummary,
  baseRevision,
  onNewItem,
}: PlanToolbarProps) {
  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      <button
        type="button"
        onClick={onNewItem}
        data-testid="toolbar-new-item"
        className="atlas-button-primary w-full text-xs"
      >
        + New item <span className="ml-1 font-mono opacity-70">N</span>
      </button>
      <VisibilitySummarySection
        hiddenNodeCount={projectionSummary.hiddenNodeCount}
        selectedNodeFilteredOut={projectionSummary.selectedNodeFilteredOut}
      />
      <SearchSection />
      <ClearFiltersButton />
      <LaneFilterSection
        lanes={availableFilters.lanes}
        baseRevision={baseRevision}
      />
      <StatusFilterSection availableStatuses={availableFilters.statuses} />
      <TagFilterSection availableTags={availableFilters.tags} />
      <ScopeSection />
      <ColorEncodingSection />
      <ScheduleOverlaySection />
      <SizeEncodingSection />
    </div>
  );
}
