import { useEffect, useRef, useState } from "react";
import {
  type PlanStateSnapshot,
  fetchPlanState as defaultFetchPlanState,
  subscribePlanState as defaultSubscribePlanState,
} from "./plan-api-client";

export type TaskGardenPlanState =
  | { phase: "loading" }
  | { phase: "ready"; snapshot: PlanStateSnapshot };

export type UseTaskGardenPlanStateDeps = {
  fetchPlanState?: () => Promise<PlanStateSnapshot>;
  subscribePlanState?: (
    onEvent: (snapshot: PlanStateSnapshot) => void,
    onReconnect: () => void,
  ) => () => void;
};

export function useTaskGardenPlanState(
  deps?: UseTaskGardenPlanStateDeps,
): TaskGardenPlanState {
  const fetchFn = deps?.fetchPlanState ?? defaultFetchPlanState;
  const subscribeFn = deps?.subscribePlanState ?? defaultSubscribePlanState;

  const depsRef = useRef({ fetchFn, subscribeFn });
  depsRef.current = { fetchFn, subscribeFn };

  const [state, setState] = useState<TaskGardenPlanState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    let lastAppliedRevision = Number.NEGATIVE_INFINITY;

    const setReady = (snapshot: PlanStateSnapshot) => {
      if (cancelled) return;
      lastAppliedRevision = snapshot.revision;
      setState({ phase: "ready", snapshot });
    };

    depsRef.current.fetchFn().then((snapshot) => {
      if (cancelled) return;
      setReady(snapshot);
    });

    const unsubscribe = depsRef.current.subscribeFn(
      (snapshot) => {
        if (snapshot.revision > lastAppliedRevision) {
          setReady(snapshot);
        }
      },
      () => {
        depsRef.current.fetchFn().then((snapshot) => {
          if (cancelled) return;
          setReady(snapshot);
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
