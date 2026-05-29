import { describe, expect, it, vi } from "vitest";
import { createPlanState } from "./plan-state";

const PLAN_PATH = "/abs/dir/my-plan.yaml";

describe("createPlanState", () => {
  it("initial snapshot has revision 0 and null source/error with planFileName from basename", () => {
    const state = createPlanState(PLAN_PATH);
    const snap = state.get();
    expect(snap.revision).toBe(0);
    expect(snap.source).toBeNull();
    expect(snap.sourceError).toBeNull();
    expect(snap.planFileName).toBe("my-plan.yaml");
  });

  it("setSource increments revision, stores source, clears error", () => {
    const state = createPlanState(PLAN_PATH);
    state.setError("boom", false);
    expect(state.get().revision).toBe(1);
    state.setSource("hello: world");
    const snap = state.get();
    expect(snap.revision).toBe(2);
    expect(snap.source).toBe("hello: world");
    expect(snap.sourceError).toBeNull();
  });

  it("setError(msg, keepLastSource=true) preserves source and sets error", () => {
    const state = createPlanState(PLAN_PATH);
    state.setSource("a: 1");
    state.setError("read failed", true);
    const snap = state.get();
    expect(snap.source).toBe("a: 1");
    expect(snap.sourceError).toEqual({ message: "read failed" });
    expect(snap.revision).toBe(2);
  });

  it("setError(msg, keepLastSource=false) clears source", () => {
    const state = createPlanState(PLAN_PATH);
    state.setSource("a: 1");
    state.setError("read failed", false);
    const snap = state.get();
    expect(snap.source).toBeNull();
    expect(snap.sourceError).toEqual({ message: "read failed" });
  });

  it("setMissing nulls source and sets a missing-file message", () => {
    const state = createPlanState(PLAN_PATH);
    state.setSource("a: 1");
    state.setMissing();
    const snap = state.get();
    expect(snap.source).toBeNull();
    expect(snap.sourceError).not.toBeNull();
    expect(snap.sourceError?.message).toMatch(
      /my-plan\.yaml|no longer exists|missing/i,
    );
    expect(snap.revision).toBe(2);
  });

  it("subscribers receive every update synchronously", () => {
    const state = createPlanState(PLAN_PATH);
    const fn = vi.fn();
    state.subscribe(fn);
    state.setSource("a: 1");
    state.setError("boom", true);
    state.setMissing();
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn.mock.calls[0][0].source).toBe("a: 1");
    expect(fn.mock.calls[1][0].sourceError).toEqual({ message: "boom" });
    expect(fn.mock.calls[2][0].source).toBeNull();
  });

  it("unsubscribe stops further notifications", () => {
    const state = createPlanState(PLAN_PATH);
    const fn = vi.fn();
    const unsub = state.subscribe(fn);
    state.setSource("a: 1");
    unsub();
    state.setSource("b: 2");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("supports multiple subscribers", () => {
    const state = createPlanState(PLAN_PATH);
    const a = vi.fn();
    const b = vi.fn();
    state.subscribe(a);
    state.subscribe(b);
    state.setSource("x");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("markSelfWrite bumps revision, stores source, and notifies subscribers", () => {
    const state = createPlanState(PLAN_PATH);
    const fn = vi.fn();
    state.subscribe(fn);
    state.markSelfWrite("self: written");
    const snap = state.get();
    expect(snap.revision).toBe(1);
    expect(snap.source).toBe("self: written");
    expect(snap.sourceError).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("setSourceFromWatcher with matching self-written text does not bump revision or notify", () => {
    const state = createPlanState(PLAN_PATH);
    state.markSelfWrite("self: written");
    const revAfterSelfWrite = state.get().revision;
    const fn = vi.fn();
    state.subscribe(fn);
    state.setSourceFromWatcher("self: written");
    expect(state.get().revision).toBe(revAfterSelfWrite);
    expect(fn).not.toHaveBeenCalled();
  });

  it("setSourceFromWatcher with differing text bumps revision and notifies", () => {
    const state = createPlanState(PLAN_PATH);
    state.markSelfWrite("self: written");
    const revAfterSelfWrite = state.get().revision;
    const fn = vi.fn();
    state.subscribe(fn);
    state.setSourceFromWatcher("external: change");
    expect(state.get().revision).toBe(revAfterSelfWrite + 1);
    expect(state.get().source).toBe("external: change");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].source).toBe("external: change");
  });

  it("setSourceFromWatcher clears lastSelfWrittenText after match (subsequent echo bumps revision)", () => {
    const state = createPlanState(PLAN_PATH);
    state.markSelfWrite("self: written");
    state.setSourceFromWatcher("self: written");
    const rev = state.get().revision;
    // The self-written text marker is now cleared; a second event with the same text is treated as external.
    state.setSourceFromWatcher("self: written");
    expect(state.get().revision).toBe(rev + 1);
  });

  it("setMissing clears lastSelfWrittenText", () => {
    const state = createPlanState(PLAN_PATH);
    state.markSelfWrite("self: written");
    state.setMissing();
    const revAfterMissing = state.get().revision;
    state.setSourceFromWatcher("self: written");
    expect(state.get().revision).toBe(revAfterMissing + 1);
    expect(state.get().source).toBe("self: written");
  });

  it("setError clears lastSelfWrittenText", () => {
    const state = createPlanState(PLAN_PATH);
    state.markSelfWrite("self: written");
    state.setError("boom", true);
    const revAfterError = state.get().revision;
    state.setSourceFromWatcher("self: written");
    expect(state.get().revision).toBe(revAfterError + 1);
    expect(state.get().source).toBe("self: written");
  });
});
