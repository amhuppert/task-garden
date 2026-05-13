import { useEffect, useRef, useState } from "react";
import {
  type DocumentErrorCode,
  type FetchDocumentResult,
  fetchDocument as defaultFetchDocument,
} from "./plan-api-client";

export type DocState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "loaded"; content: string }
  | { phase: "error"; code: DocumentErrorCode; status: number };

export type UseDocumentDeps = {
  fetchDocument?: (
    path: string,
    opts?: { signal?: AbortSignal },
  ) => Promise<FetchDocumentResult>;
};

export function useDocument(
  documentPath: string | null,
  deps?: UseDocumentDeps,
): DocState {
  const fetchFn = deps?.fetchDocument ?? defaultFetchDocument;
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const [state, setState] = useState<DocState>(() =>
    documentPath === null ? { phase: "idle" } : { phase: "loading" },
  );

  useEffect(() => {
    if (documentPath === null) {
      setState({ phase: "idle" });
      return;
    }

    setState({ phase: "loading" });
    const controller = new AbortController();

    fetchFnRef.current(documentPath, { signal: controller.signal }).then(
      (result) => {
        if (controller.signal.aborted) return;
        if (result.ok) {
          setState({ phase: "loaded", content: result.content });
        } else {
          setState({
            phase: "error",
            code: result.code,
            status: result.status,
          });
        }
      },
      () => {
        // fetch rejection (e.g. AbortError) is swallowed; the aborted
        // check above ensures we never apply state after abort.
      },
    );

    return () => {
      controller.abort();
    };
  }, [documentPath]);

  return state;
}
