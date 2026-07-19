import {
  type ReactNode,
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { STATUS_LABELS } from "../../lib/plan/status-presentation";
import type {
  TaskGardenLane,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";
import { SectionInfoModal } from "./SectionInfoModal";
import { LaneInlineEditor } from "./editing/LaneInlineEditor";
import { PencilGlyph } from "./editing/glyphs";
import {
  type ColorEncodingMode,
  type ScheduleOverlayMode,
  type SizeEncodingMode,
  selectColorMode,
  selectScheduleOverlay,
  selectSizeMode,
  usePlanDisplayStore,
} from "./plan-display.store";
import {
  type GraphScope,
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
import { FilterListGroup } from "./ui/FilterListGroup";
import { LiveRegion } from "./ui/LiveRegion";
import { Popover } from "./ui/Popover";
import { Select } from "./ui/Select";

const METRIC_SIZE_MODES: readonly MetricSizeMode[] = SIZE_MODE_OPTIONS.filter(
  (mode): mode is MetricSizeMode => mode !== "uniform",
);

/** ToggleGroup reports the whole next selection; the store exposes per-value
    toggle actions, so recover the single value that flipped. */
function findToggled(
  previous: readonly string[],
  next: readonly string[],
): string | null {
  return (
    next.find((value) => !previous.includes(value)) ??
    previous.find((value) => !next.includes(value)) ??
    null
  );
}

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
// Section header — kicker label + optional active-count badge + info slot
// ---------------------------------------------------------------------------

interface FilterSectionHeaderProps {
  labelId: string;
  label: string;
  activeCount: number;
}

function FilterSectionHeader({
  labelId,
  label,
  activeCount,
}: FilterSectionHeaderProps) {
  return (
    <span className="atlas-kicker mb-1.5 flex items-center gap-1.5">
      <span id={labelId}>{label}</span>
      {activeCount > 0 && (
        <span
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-moss px-1 font-mono text-[0.58rem] text-primary-foreground"
          aria-label={`${activeCount} active`}
        >
          {activeCount}
        </span>
      )}
    </span>
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

const SUMMARY_BOX_CLASS =
  "flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-2 text-xs";

const VisibilitySummarySection = memo(function VisibilitySummarySection({
  hiddenNodeCount,
  selectedNodeFilteredOut,
}: VisibilitySummarySectionProps) {
  const showHiddenCount = hiddenNodeCount > 0;
  const showAnything = showHiddenCount || selectedNodeFilteredOut;
  return (
    // Live regions only announce mutations inside an already-mounted region,
    // so both regions stay mounted. Empty regions go `sr-only` (out of flow)
    // and the wrapper `contents`, keeping layout identical to the previous
    // conditional rendering.
    <div className={showAnything ? "flex flex-col gap-2" : "contents"}>
      <LiveRegion
        kind="status"
        className={
          showHiddenCount
            ? `${SUMMARY_BOX_CLASS} text-muted-foreground`
            : "sr-only"
        }
      >
        {showHiddenCount && (
          <>
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-pollen"
              aria-hidden="true"
            />
            {hiddenNodeCount} item{hiddenNodeCount !== 1 ? "s" : ""} hidden by
            filters
          </>
        )}
      </LiveRegion>
      <LiveRegion
        kind="alert"
        className={
          selectedNodeFilteredOut
            ? `${SUMMARY_BOX_CLASS} text-petal`
            : "sr-only"
        }
      >
        {selectedNodeFilteredOut && (
          <>
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-petal"
              aria-hidden="true"
            />
            Selected item is hidden by active filters
          </>
        )}
      </LiveRegion>
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
          type="search"
          aria-keyshortcuts="/"
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

interface LaneEditPopoverProps {
  lane: TaskGardenLane;
  baseRevision: number;
}

function LaneEditPopover({ lane, baseRevision }: LaneEditPopoverProps) {
  // Controlled so LaneInlineEditor unmounts (drops its draft) on dismiss.
  const [editorOpen, setEditorOpen] = useState(false);
  return (
    <Popover
      trigger={
        <button
          type="button"
          aria-label={`Edit lane ${lane.label}`}
          data-testid={`lane-edit-${lane.id}`}
          className="ml-0.5 inline-flex shrink-0 items-center rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        >
          <PencilGlyph size={10} />
        </button>
      }
      ariaLabel={`Edit lane ${lane.label}`}
      open={editorOpen}
      onOpenChange={setEditorOpen}
    >
      <div className="w-64">
        <LaneInlineEditor
          laneId={lane.id}
          committedLane={lane}
          baseRevision={baseRevision}
        />
      </div>
    </Popover>
  );
}

interface LaneFilterSectionProps {
  lanes: readonly { lane: TaskGardenLane; count: number }[];
  baseRevision: number;
}

const LaneFilterSection = memo(function LaneFilterSection({
  lanes,
  baseRevision,
}: LaneFilterSectionProps) {
  const activeLaneIds = usePlanExplorerStore(selectLaneIds);
  const toggleLaneFilter = usePlanExplorerStore((s) => s.toggleLaneFilter);
  const labelId = useId();
  if (lanes.length === 0) return null;
  return (
    <section>
      <FilterSectionHeader
        labelId={labelId}
        label="Lane"
        activeCount={activeLaneIds.length}
      />
      <FilterListGroup
        options={lanes.map(({ lane, count }) => ({
          value: lane.id,
          label: lane.label,
          count,
          trailing: <LaneEditPopover lane={lane} baseRevision={baseRevision} />,
        }))}
        values={[...activeLaneIds]}
        onValuesChange={(next) => {
          const toggled = findToggled(activeLaneIds, next);
          if (toggled !== null) toggleLaneFilter(toggled);
        }}
        labelId={labelId}
      />
    </section>
  );
});

interface StatusFilterSectionProps {
  availableStatuses: readonly { status: TaskGardenStatus; count: number }[];
}

const StatusFilterSection = memo(function StatusFilterSection({
  availableStatuses,
}: StatusFilterSectionProps) {
  const activeStatuses = usePlanExplorerStore(selectStatuses);
  const toggleStatusFilter = usePlanExplorerStore((s) => s.toggleStatusFilter);
  const labelId = useId();
  if (availableStatuses.length === 0) return null;
  return (
    <section>
      <FilterSectionHeader
        labelId={labelId}
        label="Status"
        activeCount={activeStatuses.length}
      />
      <FilterListGroup
        options={availableStatuses.map(({ status, count }) => ({
          value: status,
          label: STATUS_LABELS[status],
          count,
        }))}
        values={[...activeStatuses]}
        onValuesChange={(next) => {
          const toggled = findToggled(activeStatuses, next);
          // Values originate from availableStatuses, so the cast is sound.
          if (toggled !== null) toggleStatusFilter(toggled as TaskGardenStatus);
        }}
        labelId={labelId}
      />
    </section>
  );
});

/** Tag lists can be arbitrarily long — show an inline narrowing input once
    the list is big enough that scanning the scroll region gets slow. */
const TAG_QUERY_THRESHOLD = 8;

interface TagFilterSectionProps {
  availableTags: readonly { tag: string; count: number }[];
}

const TagFilterSection = memo(function TagFilterSection({
  availableTags,
}: TagFilterSectionProps) {
  const activeTags = usePlanExplorerStore(selectTags);
  const toggleTagFilter = usePlanExplorerStore((s) => s.toggleTagFilter);
  const [tagQuery, setTagQuery] = useState("");
  const labelId = useId();

  const visibleTags = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    if (query === "") return availableTags;
    return availableTags.filter(({ tag }) => tag.toLowerCase().includes(query));
  }, [availableTags, tagQuery]);

  if (availableTags.length === 0) return null;

  return (
    <section>
      <FilterSectionHeader
        labelId={labelId}
        label="Tags"
        activeCount={activeTags.length}
      />
      {availableTags.length > TAG_QUERY_THRESHOLD && (
        <input
          type="search"
          value={tagQuery}
          onChange={(e) => setTagQuery(e.target.value)}
          placeholder={`Narrow ${availableTags.length} tags…`}
          aria-label="Narrow tag list"
          className="atlas-field-focus mb-1.5 h-7 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-xs text-foreground placeholder:text-muted-foreground"
        />
      )}
      <FilterListGroup
        options={visibleTags.map(({ tag, count }) => ({
          value: tag,
          label: tag,
          count,
        }))}
        values={[...activeTags]}
        onValuesChange={(next) => {
          const toggled = findToggled(activeTags, next);
          if (toggled !== null) toggleTagFilter(toggled);
        }}
        labelId={labelId}
      />
      {visibleTags.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No tags match "{tagQuery}"
        </p>
      )}
    </section>
  );
});

// ---------------------------------------------------------------------------
// Display sections — single-select dropdowns keep each control at a fixed
// height no matter how many options it offers.
// ---------------------------------------------------------------------------

interface SelectSectionShellProps {
  label: string;
  labelId: string;
  info: ReactNode;
  children: ReactNode;
}

function SelectSectionShell({
  label,
  labelId,
  info,
  children,
}: SelectSectionShellProps) {
  return (
    <section>
      <span className="atlas-kicker mb-1.5 flex items-center gap-1.5">
        <span id={labelId}>{label}</span>
        {info}
      </span>
      {children}
    </section>
  );
}

function ScopeSection() {
  const activeScope = usePlanExplorerStore(selectActiveScope);
  const selectedWorkItemId = usePlanExplorerStore(selectSelectedWorkItemId);
  const setScope = usePlanExplorerStore((s) => s.setScope);
  const labelId = useId();
  const hintId = useId();
  const hasSelection = selectedWorkItemId !== null;
  return (
    <SelectSectionShell
      label="Scope"
      labelId={labelId}
      info={<ScopeInfoModal />}
    >
      <Select
        value={activeScope}
        onValueChange={(value) => setScope(value as GraphScope)}
        options={SCOPE_OPTIONS.map((scope) => ({
          value: scope,
          label: getScopeLabel(scope),
          disabled: !hasSelection && scope !== "all",
        }))}
        ariaLabel="Scope"
        labelId={labelId}
        describedById={hasSelection ? undefined : hintId}
        testId="scope-select"
      />
      {!hasSelection && (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          Select an item to scope the view
        </p>
      )}
    </SelectSectionShell>
  );
}

function ColorEncodingSection() {
  const colorMode = usePlanDisplayStore(selectColorMode);
  const setColorMode = usePlanDisplayStore((s) => s.setColorMode);
  const labelId = useId();
  return (
    <SelectSectionShell
      label="Color"
      labelId={labelId}
      info={<ColorInfoModal />}
    >
      <Select
        value={colorMode}
        onValueChange={(value) => setColorMode(value as ColorEncodingMode)}
        options={COLOR_MODE_OPTIONS.map((mode) => ({
          value: mode,
          label: getColorModeLabel(mode),
        }))}
        ariaLabel="Color"
        labelId={labelId}
        testId="color-mode-select"
      />
    </SelectSectionShell>
  );
}

function ScheduleOverlaySection() {
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const setScheduleOverlay = usePlanDisplayStore((s) => s.setScheduleOverlay);
  const labelId = useId();
  return (
    <SelectSectionShell
      label="Schedule Overlay"
      labelId={labelId}
      info={<ScheduleOverlayInfoModal />}
    >
      <Select
        value={scheduleOverlay}
        onValueChange={(value) =>
          setScheduleOverlay(value as ScheduleOverlayMode)
        }
        options={SCHEDULE_OVERLAY_OPTIONS.map((mode) => ({
          value: mode,
          label: getScheduleOverlayLabel(mode),
        }))}
        ariaLabel="Schedule Overlay"
        labelId={labelId}
        testId="schedule-overlay-select"
      />
    </SelectSectionShell>
  );
}

function SizeEncodingSection() {
  const sizeMode = usePlanDisplayStore(selectSizeMode);
  const setSizeMode = usePlanDisplayStore((s) => s.setSizeMode);
  const labelId = useId();
  return (
    <SelectSectionShell
      label="Node Size"
      labelId={labelId}
      info={<SizeInfoModal />}
    >
      <Select
        value={sizeMode}
        onValueChange={(value) => setSizeMode(value as SizeEncodingMode)}
        options={SIZE_MODE_OPTIONS.map((mode) => ({
          value: mode,
          label: getSizeModeLabel(mode),
        }))}
        ariaLabel="Node Size"
        labelId={labelId}
        testId="size-mode-select"
      />
    </SelectSectionShell>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanToolbarAvailableFilters {
  lanes: readonly { lane: TaskGardenLane; count: number }[];
  statuses: readonly { status: TaskGardenStatus; count: number }[];
  tags: readonly { tag: string; count: number }[];
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
