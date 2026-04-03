import { beforeEach, describe, expect, it } from "vitest";
import {
  selectCanGoBack,
  selectCanGoForward,
  useNavigationHistoryStore,
} from "./navigation-history.store";

beforeEach(() => {
  useNavigationHistoryStore.setState({ entries: [], cursor: -1 });
});

describe("useNavigationHistoryStore", () => {
  describe("push", () => {
    it("adds the first entry and sets cursor to 0", () => {
      useNavigationHistoryStore.getState().push("a");
      const s = useNavigationHistoryStore.getState();
      expect(s.entries).toEqual(["a"]);
      expect(s.cursor).toBe(0);
    });

    it("appends subsequent entries", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      push("c");
      const s = useNavigationHistoryStore.getState();
      expect(s.entries).toEqual(["a", "b", "c"]);
      expect(s.cursor).toBe(2);
    });

    it("does not duplicate when pushing the same id as current", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("a");
      const s = useNavigationHistoryStore.getState();
      expect(s.entries).toEqual(["a"]);
      expect(s.cursor).toBe(0);
    });

    it("truncates forward history when pushing after going back", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      push("c");
      useNavigationHistoryStore.getState().goBack();
      useNavigationHistoryStore.getState().goBack();
      // cursor is at "a" (index 0), forward history is ["b", "c"]
      useNavigationHistoryStore.getState().push("d");
      const s = useNavigationHistoryStore.getState();
      expect(s.entries).toEqual(["a", "d"]);
      expect(s.cursor).toBe(1);
    });
  });

  describe("goBack", () => {
    it("returns null when history is empty", () => {
      const result = useNavigationHistoryStore.getState().goBack();
      expect(result).toBeNull();
    });

    it("returns null when at the first entry", () => {
      useNavigationHistoryStore.getState().push("a");
      const result = useNavigationHistoryStore.getState().goBack();
      expect(result).toBeNull();
    });

    it("returns the previous entry and decrements cursor", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      const result = useNavigationHistoryStore.getState().goBack();
      expect(result).toBe("a");
      expect(useNavigationHistoryStore.getState().cursor).toBe(0);
    });

    it("can go back multiple times", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      push("c");
      expect(useNavigationHistoryStore.getState().goBack()).toBe("b");
      expect(useNavigationHistoryStore.getState().goBack()).toBe("a");
      expect(useNavigationHistoryStore.getState().goBack()).toBeNull();
    });
  });

  describe("goForward", () => {
    it("returns null when history is empty", () => {
      const result = useNavigationHistoryStore.getState().goForward();
      expect(result).toBeNull();
    });

    it("returns null when at the latest entry", () => {
      useNavigationHistoryStore.getState().push("a");
      const result = useNavigationHistoryStore.getState().goForward();
      expect(result).toBeNull();
    });

    it("returns the next entry after going back", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      useNavigationHistoryStore.getState().goBack();
      const result = useNavigationHistoryStore.getState().goForward();
      expect(result).toBe("b");
      expect(useNavigationHistoryStore.getState().cursor).toBe(1);
    });

    it("can go forward multiple times", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      push("c");
      useNavigationHistoryStore.getState().goBack();
      useNavigationHistoryStore.getState().goBack();
      expect(useNavigationHistoryStore.getState().goForward()).toBe("b");
      expect(useNavigationHistoryStore.getState().goForward()).toBe("c");
      expect(useNavigationHistoryStore.getState().goForward()).toBeNull();
    });
  });

  describe("selectors", () => {
    it("canGoBack is false when empty", () => {
      expect(selectCanGoBack(useNavigationHistoryStore.getState())).toBe(false);
    });

    it("canGoBack is false at first entry", () => {
      useNavigationHistoryStore.getState().push("a");
      expect(selectCanGoBack(useNavigationHistoryStore.getState())).toBe(false);
    });

    it("canGoBack is true when there is a previous entry", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      expect(selectCanGoBack(useNavigationHistoryStore.getState())).toBe(true);
    });

    it("canGoForward is false when empty", () => {
      expect(selectCanGoForward(useNavigationHistoryStore.getState())).toBe(
        false,
      );
    });

    it("canGoForward is false at latest entry", () => {
      useNavigationHistoryStore.getState().push("a");
      expect(selectCanGoForward(useNavigationHistoryStore.getState())).toBe(
        false,
      );
    });

    it("canGoForward is true after going back", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      useNavigationHistoryStore.getState().goBack();
      expect(selectCanGoForward(useNavigationHistoryStore.getState())).toBe(
        true,
      );
    });
  });

  describe("reset", () => {
    it("clears all history", () => {
      const { push } = useNavigationHistoryStore.getState();
      push("a");
      push("b");
      useNavigationHistoryStore.getState().reset();
      const s = useNavigationHistoryStore.getState();
      expect(s.entries).toEqual([]);
      expect(s.cursor).toBe(-1);
    });
  });
});
