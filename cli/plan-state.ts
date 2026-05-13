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

  return {
    get() {
      return snapshot;
    },
    setSource(source) {
      update({ source, sourceError: null });
    },
    setError(message, keepLastSource) {
      update({
        source: keepLastSource ? snapshot.source : null,
        sourceError: { message },
      });
    },
    setMissing() {
      update({
        source: null,
        sourceError: {
          message: `Plan file no longer exists at ${planAbsPath}`,
        },
      });
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
  };
}
