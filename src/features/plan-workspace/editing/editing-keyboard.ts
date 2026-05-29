import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useEditStore } from "./edit.store";

export interface NewItemFormPrefill {
  lane?: string;
  dependsOn?: string[];
}

export interface UseEditingHotkeysOptions {
  openNewItemForm: (init?: NewItemFormPrefill) => void;
  selectedWorkItemId: string | null;
  /** Lane currently filtered to (when exactly one lane filter is active), or null. */
  activeLaneScope: string | null;
  /** First lane in the plan — used as the fallback for the "new item" hotkey. */
  firstLaneId: string | null;
  /** Open the right-panel details tab and focus the editable title cell. */
  openDetailsAndFocusTitle?: () => void;
}

/**
 * Returns true when the keyboard event originated inside a text-input region
 * (an <input>, <textarea>, or contentEditable element). The N/E hotkeys are
 * suppressed in those cases so the user can type those letters into fields.
 */
export function isEventInsideTextInput(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return false;
  return true;
}

function isInsideTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}

export const EDITING_ROLLBACK_EVENT = "editing:rollback";

export function useEditingHotkeys(opts: UseEditingHotkeysOptions): void {
  const {
    openNewItemForm,
    selectedWorkItemId,
    activeLaneScope,
    firstLaneId,
    openDetailsAndFocusTitle,
  } = opts;

  const handleNewItem = useCallback(
    (event: KeyboardEvent) => {
      if (isInsideTextField(event.target)) return;
      const lane = activeLaneScope ?? firstLaneId ?? undefined;
      event.preventDefault();
      openNewItemForm(lane ? { lane } : undefined);
    },
    [openNewItemForm, activeLaneScope, firstLaneId],
  );

  const handleBranchNewItem = useCallback(
    (event: KeyboardEvent) => {
      if (isInsideTextField(event.target)) return;
      if (!selectedWorkItemId) return;
      event.preventDefault();
      openNewItemForm({ dependsOn: [selectedWorkItemId] });
    },
    [openNewItemForm, selectedWorkItemId],
  );

  const handleEdit = useCallback(
    (event: KeyboardEvent) => {
      if (isInsideTextField(event.target)) return;
      if (!selectedWorkItemId) return;
      event.preventDefault();
      openDetailsAndFocusTitle?.();
    },
    [selectedWorkItemId, openDetailsAndFocusTitle],
  );

  const handleEscapeRollback = useCallback((_event: KeyboardEvent) => {
    useEditStore.getState().rollbackAll();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EDITING_ROLLBACK_EVENT));
    }
  }, []);

  // 'n' opens the new-item form (suppressed inside text fields)
  useHotkeys("n", handleNewItem, {
    enableOnFormTags: false,
    enableOnContentEditable: false,
  });

  // 'shift+n' branches from the selected work item
  useHotkeys("shift+n", handleBranchNewItem, {
    enableOnFormTags: false,
    enableOnContentEditable: false,
  });

  // 'e' opens the details panel and focuses the title cell
  useHotkeys("e", handleEdit, {
    enableOnFormTags: false,
    enableOnContentEditable: false,
  });

  // 'escape' broadcasts a rollback request to any active drafts
  useHotkeys("escape", handleEscapeRollback, {
    enableOnFormTags: false,
    enableOnContentEditable: false,
  });
}
