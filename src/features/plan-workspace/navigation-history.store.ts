import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavigationHistoryStateValue {
  entries: readonly string[];
  cursor: number;
}

interface NavigationHistoryActions {
  push(id: string): void;
  goBack(): string | null;
  goForward(): string | null;
  reset(): void;
}

type NavigationHistoryStore = NavigationHistoryStateValue &
  NavigationHistoryActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNavigationHistoryStore = create<NavigationHistoryStore>(
  (set, get) => ({
    entries: [],
    cursor: -1,

    push(id) {
      const { entries, cursor } = get();
      if (cursor >= 0 && entries[cursor] === id) return;
      const truncated = entries.slice(0, cursor + 1);
      set({ entries: [...truncated, id], cursor: truncated.length });
    },

    goBack() {
      const { entries, cursor } = get();
      if (cursor <= 0) return null;
      const newCursor = cursor - 1;
      set({ cursor: newCursor });
      return entries[newCursor];
    },

    goForward() {
      const { entries, cursor } = get();
      if (cursor >= entries.length - 1) return null;
      const newCursor = cursor + 1;
      set({ cursor: newCursor });
      return entries[newCursor];
    },

    reset() {
      set({ entries: [], cursor: -1 });
    },
  }),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectCanGoBack = (s: NavigationHistoryStateValue): boolean =>
  s.cursor > 0;

export const selectCanGoForward = (s: NavigationHistoryStateValue): boolean =>
  s.cursor < s.entries.length - 1;
