import { useState } from "react";
import type {
  TaskGardenPriority,
  TaskGardenStatus,
} from "../../lib/plan/task-garden-plan.schema";
import { SectionInfoTooltip } from "./SectionInfoTooltip";
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
  selectPriorities,
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

const PRIORITY_LABELS: Record<TaskGardenPriority, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
  nice_to_have: "Nice to Have",
};

// ---------------------------------------------------------------------------
// Tooltip content
// ---------------------------------------------------------------------------

const METRIC_SIZE_MODES = Object.keys(
  METRIC_SIZE_DESCRIPTIONS,
) as MetricSizeMode[];

function ScopeInfoTooltip() {
  return (
    <SectionInfoTooltip label="Scope explanation">
      <p>
        Scope narrows the graph around the selected item. It is useful when you
        want to focus on just the work before it, after it, or both.
      </p>
      <p>
        Calculation: the app follows dependency links from the selected item.
        Upstream shows prerequisites, downstream shows follow-on work, and full
        chain shows both directions together.
      </p>
    </SectionInfoTooltip>
  );
}

function ColorInfoTooltip() {
  return (
    <SectionInfoTooltip label="Color explanation">
      <p className="atlas-kicker text-[0.62rem] text-foreground">
        What does color show?
      </p>
      <dl className="flex flex-col gap-3">
        {COLOR_MODE_OPTIONS.map((mode) => {
          const desc = getColorModeDescription(mode);
          return (
            <div key={mode}>
              <dt className="text-[0.65rem] font-semibold text-foreground">
                {getColorModeLabel(mode).replace("By ", "")}
              </dt>
              <dd className="mt-0.5">{desc.summary}</dd>
              <dd className="mt-1 rounded-[var(--radius-sm)] bg-surface-muted px-2 py-1.5">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                {desc.calculation}
              </dd>
            </div>
          );
        })}
      </dl>
    </SectionInfoTooltip>
  );
}

function SizeInfoTooltip() {
  return (
    <SectionInfoTooltip label="Node Size explanation">
      <p className="atlas-kicker text-[0.62rem] text-foreground">
        What do these size modes mean?
      </p>
      <dl className="flex flex-col gap-3">
        {METRIC_SIZE_MODES.map((mode) => {
          const desc = METRIC_SIZE_DESCRIPTIONS[mode];
          return (
            <div key={mode}>
              <dt className="text-[0.65rem] font-semibold text-foreground">
                {getSizeModeLabel(mode).replace("By ", "")}
              </dt>
              <dd className="mt-0.5">{desc.summary}</dd>
              <dd className="mt-1 rounded-[var(--radius-sm)] bg-surface-muted px-2 py-1.5">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                {desc.calculation}
              </dd>
            </div>
          );
        })}
      </dl>
    </SectionInfoTooltip>
  );
}

function ScheduleOverlayInfoTooltip() {
  return (
    <SectionInfoTooltip label="Schedule Overlay explanation">
      <p className="atlas-kicker text-[0.62rem] text-foreground">
        What does the schedule overlay show?
      </p>
      <dl className="flex flex-col gap-3">
        {SCHEDULE_OVERLAY_OPTIONS.map((mode) => {
          const desc = SCHEDULE_OVERLAY_DESCRIPTIONS[mode];
          return (
            <div key={mode}>
              <dt className="text-[0.65rem] font-semibold text-foreground">
                {getScheduleOverlayLabel(mode)}
              </dt>
              <dd className="mt-0.5">{desc.summary}</dd>
              <dd className="mt-1 rounded-[var(--radius-sm)] bg-surface-muted px-2 py-1.5">
                <span className="font-semibold text-foreground/70">
                  How it works:{" "}
                </span>
                {desc.calculation}
              </dd>
            </div>
          );
        })}
      </dl>
    </SectionInfoTooltip>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlanToolbarAvailableFilters {
  lanes: readonly { id: string; label: string }[];
  statuses: readonly TaskGardenStatus[];
  priorities: readonly TaskGardenPriority[];
  tags: readonly string[];
}

export interface PlanToolbarProjectionSummary {
  hiddenNodeCount: number;
  selectedNodeFilteredOut: boolean;
}

export interface PlanToolbarProps {
  availableFilters: PlanToolbarAvailableFilters;
  projectionSummary: PlanToolbarProjectionSummary;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanToolbar({
  availableFilters,
  projectionSummary,
}: PlanToolbarProps) {
  const {
    lanes,
    statuses: availableStatuses,
    priorities: availablePriorities,
    tags: availableTags,
  } = availableFilters;
  const { hiddenNodeCount, selectedNodeFilteredOut } = projectionSummary;

  // Explorer store — state
  const searchQuery = usePlanExplorerStore(selectSearchQuery);
  const activeScope = usePlanExplorerStore(selectActiveScope);
  const activeLaneIds = usePlanExplorerStore(selectLaneIds);
  const activeStatuses = usePlanExplorerStore(selectStatuses);
  const activePriorities = usePlanExplorerStore(selectPriorities);
  const activeTags = usePlanExplorerStore(selectTags);
  const hasActiveFilters = usePlanExplorerStore(selectHasActiveFilters);
  const selectedWorkItemId = usePlanExplorerStore(selectSelectedWorkItemId);

  // Explorer store — actions
  const setSearchQuery = usePlanExplorerStore((s) => s.setSearchQuery);
  const setScope = usePlanExplorerStore((s) => s.setScope);
  const toggleLaneFilter = usePlanExplorerStore((s) => s.toggleLaneFilter);
  const toggleStatusFilter = usePlanExplorerStore((s) => s.toggleStatusFilter);
  const togglePriorityFilter = usePlanExplorerStore(
    (s) => s.togglePriorityFilter,
  );
  const toggleTagFilter = usePlanExplorerStore((s) => s.toggleTagFilter);
  const clearFilters = usePlanExplorerStore((s) => s.clearFilters);

  // Display store — state
  const colorMode = usePlanDisplayStore(selectColorMode);
  const scheduleOverlay = usePlanDisplayStore(selectScheduleOverlay);
  const sizeMode = usePlanDisplayStore(selectSizeMode);

  // Display store — actions
  const setColorMode = usePlanDisplayStore((s) => s.setColorMode);
  const setScheduleOverlay = usePlanDisplayStore((s) => s.setScheduleOverlay);
  const setSizeMode = usePlanDisplayStore((s) => s.setSizeMode);

  const hasSelection = selectedWorkItemId !== null;

  const [tagsExpanded, setTagsExpanded] = useState(
    () => availableTags.length <= 5,
  );

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      {/* ------------------------------------------------------------------ */}
      {/* Visibility summary                                                   */}
      {/* ------------------------------------------------------------------ */}
      {(hiddenNodeCount > 0 || selectedNodeFilteredOut) && (
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
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Search                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <label>
          <span className="atlas-kicker mb-2 block">Search</span>
          <input
            type="text"
            className="atlas-field atlas-field-focus"
            placeholder="Search title, tag, lane…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </section>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="atlas-button-secondary w-full text-xs"
        >
          Clear all filters
        </button>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Lane filter (derived from plan data)                                */}
      {/* ------------------------------------------------------------------ */}
      {lanes.length > 0 && (
        <section>
          <span className="atlas-kicker mb-2 block">Lane</span>
          <div className="flex flex-wrap gap-1.5">
            {lanes.map((lane) => (
              <button
                key={lane.id}
                type="button"
                onClick={() => toggleLaneFilter(lane.id)}
                className={`atlas-chip hover:border-border-strong${activeLaneIds.includes(lane.id) ? " atlas-chip-active" : ""}`}
              >
                {lane.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Status filter (derived from plan data)                              */}
      {/* ------------------------------------------------------------------ */}
      {availableStatuses.length > 0 && (
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
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Priority filter (derived from plan data)                            */}
      {/* ------------------------------------------------------------------ */}
      {availablePriorities.length > 0 && (
        <section>
          <span className="atlas-kicker mb-2 block">Priority</span>
          <div className="flex flex-wrap gap-1.5">
            {availablePriorities.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => togglePriorityFilter(priority)}
                className={`atlas-chip hover:border-border-strong${activePriorities.includes(priority) ? " atlas-chip-active" : ""}`}
              >
                {PRIORITY_LABELS[priority]}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tag filter (derived from plan data)                                 */}
      {/* ------------------------------------------------------------------ */}
      {availableTags.length > 0 && (
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
            {(() => {
              if (tagsExpanded) return availableTags;
              const active = availableTags.filter((t) =>
                activeTags.includes(t),
              );
              const visible =
                active.length > 0 ? active : availableTags.slice(0, 3);
              return visible;
            })().map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTagFilter(tag)}
                className={`atlas-chip hover:border-border-strong${activeTags.includes(tag) ? " atlas-chip-active" : ""}`}
              >
                {tag}
              </button>
            ))}
            {!tagsExpanded &&
              (() => {
                const active = availableTags.filter((t) =>
                  activeTags.includes(t),
                );
                const visibleCount =
                  active.length > 0
                    ? active.length
                    : Math.min(3, availableTags.length);
                const hidden = availableTags.length - visibleCount;
                return hidden > 0 ? (
                  <span className="text-xs text-muted-foreground self-center">
                    +{hidden} more
                  </span>
                ) : null;
              })()}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Scope controls                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="atlas-kicker flex items-center gap-1.5">
            Scope
            <ScopeInfoTooltip />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
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

      {/* ------------------------------------------------------------------ */}
      {/* Color encoding                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="atlas-kicker flex items-center gap-1.5">
            Color
            <ColorInfoTooltip />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
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

      {/* ------------------------------------------------------------------ */}
      {/* Schedule overlay                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="atlas-kicker flex items-center gap-1.5">
            Schedule Overlay
            <ScheduleOverlayInfoTooltip />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
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

      {/* ------------------------------------------------------------------ */}
      {/* Size encoding                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="atlas-kicker flex items-center gap-1.5">
            Node Size
            <SizeInfoTooltip />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
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
    </div>
  );
}
