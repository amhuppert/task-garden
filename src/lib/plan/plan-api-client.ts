export type PlanStateSnapshot = {
  revision: number;
  source: string | null;
  sourceError: { message: string } | null;
  planFileName: string;
};

export type DocumentErrorCode =
  | "unsafe_path"
  | "document_not_found"
  | "document_read_failed";

export type FetchDocumentResult =
  | { ok: true; content: string }
  | { ok: false; status: number; code: DocumentErrorCode };

export type SubscribeDeps = {
  EventSourceCtor?: typeof EventSource;
};

export async function fetchPlanState(): Promise<PlanStateSnapshot> {
  const res = await fetch("/api/plan");
  return (await res.json()) as PlanStateSnapshot;
}

export async function fetchDocument(
  documentPath: string,
  opts?: { signal?: AbortSignal },
): Promise<FetchDocumentResult> {
  const url = `/api/document?path=${encodeURIComponent(documentPath)}`;
  const res = opts?.signal
    ? await fetch(url, { signal: opts.signal })
    : await fetch(url);
  if (res.ok) {
    return { ok: true, content: await res.text() };
  }
  const body = (await res.json()) as { error: DocumentErrorCode };
  return { ok: false, status: res.status, code: body.error };
}

export function subscribePlanState(
  onEvent: (snapshot: PlanStateSnapshot) => void,
  onReconnect: () => void,
  deps?: SubscribeDeps,
): () => void {
  const Ctor = deps?.EventSourceCtor ?? EventSource;
  const eventSource = new Ctor("/api/events");

  let needsReconnect = false;

  const handlePlanState = (event: MessageEvent) => {
    const snapshot = JSON.parse(event.data) as PlanStateSnapshot;
    onEvent(snapshot);
  };

  const handleError = () => {
    needsReconnect = true;
  };

  const handleOpen = () => {
    if (needsReconnect) {
      needsReconnect = false;
      onReconnect();
    }
  };

  eventSource.addEventListener("plan-state", handlePlanState as EventListener);
  eventSource.addEventListener("error", handleError);
  eventSource.addEventListener("open", handleOpen);

  return () => {
    eventSource.close();
  };
}
