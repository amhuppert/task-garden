import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchDocument,
  fetchPlanState,
  subscribePlanState,
} from "./plan-api-client";

type Listener = (event: { type: string; data?: string }) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: { type: string; data?: string }): boolean {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const listener of [...set]) {
        listener(event);
      }
    }
    return true;
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data?: string): void {
    this.dispatchEvent({ type, data });
  }
}

const asEventSourceCtor = FakeEventSource as unknown as typeof EventSource;

afterEach(() => {
  FakeEventSource.instances = [];
  vi.restoreAllMocks();
});

describe("fetchPlanState", () => {
  it("GETs /api/plan and parses the JSON snapshot", async () => {
    const snapshot = {
      revision: 3,
      source: "version: 1\nplan_id: x\n",
      sourceError: null,
      planFileName: "x.yaml",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchPlanState();

    expect(fetchSpy).toHaveBeenCalledWith("/api/plan");
    expect(result).toEqual(snapshot);
  });

  it("handles a source-error snapshot", async () => {
    const snapshot = {
      revision: 7,
      source: null,
      sourceError: { message: "Plan file no longer exists at /abs" },
      planFileName: "x.yaml",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(snapshot), { status: 200 }),
    );

    const result = await fetchPlanState();
    expect(result).toEqual(snapshot);
  });
});

describe("fetchDocument", () => {
  it("returns ok with the markdown content on 200", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("# hello", {
        status: 200,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      }),
    );

    const result = await fetchDocument("docs/intro.md");

    expect(fetchSpy).toHaveBeenCalledWith("/api/document?path=docs%2Fintro.md");
    expect(result).toEqual({ ok: true, content: "# hello" });
  });

  it("returns ok:false with status and code on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "document_not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchDocument("missing.md");

    expect(result).toEqual({
      ok: false,
      status: 404,
      code: "document_not_found",
    });
  });

  it("returns ok:false with status 400 and unsafe_path code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "unsafe_path" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchDocument("../etc/passwd");
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "unsafe_path",
    });
  });

  it("returns ok:false with status 500 and document_read_failed code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "document_read_failed" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchDocument("broken.md");
    expect(result).toEqual({
      ok: false,
      status: 500,
      code: "document_read_failed",
    });
  });
});

describe("subscribePlanState", () => {
  it("opens an EventSource at /api/events via the injected constructor", () => {
    subscribePlanState(
      () => {},
      () => {},
      { EventSourceCtor: asEventSourceCtor },
    );

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe("/api/events");
  });

  it("parses plan-state events and forwards the snapshot to onEvent", () => {
    const onEvent = vi.fn();
    subscribePlanState(onEvent, () => {}, {
      EventSourceCtor: asEventSourceCtor,
    });
    const fake = FakeEventSource.instances[0];
    const snapshot = {
      revision: 5,
      source: "yaml",
      sourceError: null,
      planFileName: "p.yaml",
    };

    fake.emit("plan-state", JSON.stringify(snapshot));

    expect(onEvent).toHaveBeenCalledWith(snapshot);
  });

  it("does not call onReconnect on the initial open", () => {
    const onReconnect = vi.fn();
    subscribePlanState(() => {}, onReconnect, {
      EventSourceCtor: asEventSourceCtor,
    });
    const fake = FakeEventSource.instances[0];

    fake.emit("open");
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("calls onReconnect when an error is followed by a re-open", () => {
    const onReconnect = vi.fn();
    subscribePlanState(() => {}, onReconnect, {
      EventSourceCtor: asEventSourceCtor,
    });
    const fake = FakeEventSource.instances[0];

    fake.emit("error");
    fake.emit("open");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    fake.emit("open");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    fake.emit("error");
    fake.emit("open");
    expect(onReconnect).toHaveBeenCalledTimes(2);
  });

  it("returns a cleanup function that closes the EventSource", () => {
    const cleanup = subscribePlanState(
      () => {},
      () => {},
      { EventSourceCtor: asEventSourceCtor },
    );
    const fake = FakeEventSource.instances[0];

    expect(fake.closed).toBe(false);
    cleanup();
    expect(fake.closed).toBe(true);
  });
});
