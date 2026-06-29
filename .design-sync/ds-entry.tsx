// Scoped design-system entry for design-sync (NOT an app entry).
//
// Re-exports only the plan-workspace components so the compiled bundle assigns
// exactly these to window.TaskGarden — deliberately excluding src/main.tsx
// (which calls createRoot().render() at load) and unrelated store modules with
// load-time side effects. Regenerate by listing the PascalCase component
// exports under src/features/plan-workspace (see .design-sync/NOTES.md).

// Provider re-export: graph nodes render React Flow <Handle>s, which require a
// React Flow store context. Exposed on the bundle so cfg.provider can wrap every
// preview in it (harmless for non-graph components). Not in componentSrcMap, so
// it ships in the global without getting its own DS card.
export { ReactFlowProvider } from "@xyflow/react";

// Graph display-mode contexts: WorkItemNode / MetricBubbleNode read color/size/
// overlay encodings from these. Exposed on the bundle so a preview can supply rich
// (non-default) values to the bundled node (the source-path context object would be
// a different React instance). Not components — excluded from cards by name.
export {
  GraphDisplayModeContext,
  GraphMetricRangesContext,
  GraphScheduleOverlayContext,
} from "../src/features/plan-workspace/plan-graph-canvas.context";

// ── Graph / visualization
export { WorkItemNode } from "../src/features/plan-workspace/WorkItemNode";
export { MetricBubbleNode } from "../src/features/plan-workspace/MetricBubbleNode";
export { PlanGraphCanvas } from "../src/features/plan-workspace/PlanGraphCanvas";

// ── Panels & page structure
export { PlanDetailsPanel } from "../src/features/plan-workspace/PlanDetailsPanel";
export { PlanInsightsPanel } from "../src/features/plan-workspace/PlanInsightsPanel";
export { PlanOverviewHeader } from "../src/features/plan-workspace/PlanOverviewHeader";
export { PlanToolbar } from "../src/features/plan-workspace/PlanToolbar";
export { PlanWorkspacePage } from "../src/features/plan-workspace/PlanWorkspacePage";
export { PlanEmptyState } from "../src/features/plan-workspace/PlanEmptyState";
export { PlanValidationState } from "../src/features/plan-workspace/PlanValidationState";

// ── Presentational
export { ResourceLink } from "../src/features/plan-workspace/ResourceLink";
export { ResourceLinkIcon } from "../src/features/plan-workspace/ResourceLinkIcon";
export { SectionInfoModal } from "../src/features/plan-workspace/SectionInfoModal";

// ── Editing cells & write-through UI
export { CreateBar } from "../src/features/plan-workspace/editing/CreateBar";
export { DependencyEditorCell } from "../src/features/plan-workspace/editing/DependencyEditorCell";
export { EditableTitleCell } from "../src/features/plan-workspace/editing/EditableTitleCell";
export { EstimateStepperCell } from "../src/features/plan-workspace/editing/EstimateStepperCell";
export { FieldSaveIndicator } from "../src/features/plan-workspace/editing/FieldSaveIndicator";
export { LaneInlineEditor } from "../src/features/plan-workspace/editing/LaneInlineEditor";
export { LanePickerCell } from "../src/features/plan-workspace/editing/LanePickerCell";
export { LinksEditorCell } from "../src/features/plan-workspace/editing/LinksEditorCell";
export { NewItemForm } from "../src/features/plan-workspace/editing/NewItemForm";
export { NotesEditorCell } from "../src/features/plan-workspace/editing/NotesEditorCell";
export { PlanOverviewEditor } from "../src/features/plan-workspace/editing/PlanOverviewEditor";
export { StatusPickerCell } from "../src/features/plan-workspace/editing/StatusPickerCell";
export { StringListEditorCell } from "../src/features/plan-workspace/editing/StringListEditorCell";
export { SummaryEditorCell } from "../src/features/plan-workspace/editing/SummaryEditorCell";
export { TagEditorCell } from "../src/features/plan-workspace/editing/TagEditorCell";
export { ValidationToast } from "../src/features/plan-workspace/editing/ValidationToast";
export { ValueInputCell } from "../src/features/plan-workspace/editing/ValueInputCell";
export { WriteThroughStatusFooter } from "../src/features/plan-workspace/editing/WriteThroughStatusFooter";
