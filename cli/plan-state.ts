import path from "node:path";

export type PlanStateSnapshot = {
  revision: number;
  source: string | null;
  sourceError: { message: string } | null;
  planFileName: string;
};

export interface PlanState {
  get(): PlanStateSnapshot;
  setSource(source: string): void;
  setError(message: string, keepLastSource: boolean): void;
  setMissing(): void;
  markSelfWrite(source: string): void;
  setSourceFromWatcher(source: string): void;
  subscribe(fn: (s: PlanStateSnapshot) => void): () => void;
}

export function createPlanState(planAbsPath: string): PlanState {
  const planFileName = path.basename(planAbsPath);
  let snapshot: PlanStateSnapshot = {
    revision: 0,
    source: null,
    sourceError: null,
    planFileName,
  };
  let lastSelfWrittenText: string | null = null;
  const subscribers = new Set<(s: PlanStateSnapshot) => void>();

  const update = (
    next: Omit<PlanStateSnapshot, "revision" | "planFileName">,
  ) => {
    snapshot = {
      revision: snapshot.revision + 1,
      planFileName,
      source: next.source,
      sourceError: next.sourceError,
    };
    for (const fn of subscribers) fn(snapshot);
  };

  const setSource = (source: string) => {
    update({ source, sourceError: null });
  };

  return {
    get() {
      return snapshot;
    },
    setSource,
    setError(message, keepLastSource) {
      lastSelfWrittenText = null;
      update({
        source: keepLastSource ? snapshot.source : null,
        sourceError: { message },
      });
    },
    setMissing() {
      lastSelfWrittenText = null;
      update({
        source: null,
        sourceError: {
          message: `Plan file no longer exists at ${planAbsPath}`,
        },
      });
    },
    markSelfWrite(source) {
      lastSelfWrittenText = source;
      setSource(source);
    },
    setSourceFromWatcher(source) {
      if (source === lastSelfWrittenText) {
        lastSelfWrittenText = null;
        return;
      }
      lastSelfWrittenText = null;
      setSource(source);
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
  };
}
