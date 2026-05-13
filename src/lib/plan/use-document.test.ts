// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FetchDocumentResult } from "./plan-api-client";
import { useDocument } from "./use-document";

type FetchDocumentFn = (
  path: string,
  opts?: { signal?: AbortSignal },
) => Promise<FetchDocumentResult>;

describe("useDocument", () => {
  it("stays idle and does not fetch when documentPath is null", () => {
    const fetchDocument: FetchDocumentFn = vi.fn();
    const { result } = renderHook(() => useDocument(null, { fetchDocument }));

    expect(result.current).toEqual({ phase: "idle" });
    expect(fetchDocument).not.toHaveBeenCalled();
  });

  it("transitions from loading to loaded when the fetch succeeds", async () => {
    const fetchDocument: FetchDocumentFn = vi
      .fn()
      .mockResolvedValue({ ok: true, content: "# hello" });

    const { result } = renderHook(() =>
      useDocument("docs/intro.md", { fetchDocument }),
    );

    expect(result.current).toEqual({ phase: "loading" });

    await waitFor(() => {
      expect(result.current).toEqual({ phase: "loaded", content: "# hello" });
    });

    expect(fetchDocument).toHaveBeenCalledTimes(1);
    const call = (fetchDocument as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("docs/intro.md");
    expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("transitions from loading to error with the right code and status", async () => {
    const fetchDocument: FetchDocumentFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      code: "document_not_found",
    });

    const { result } = renderHook(() =>
      useDocument("missing.md", { fetchDocument }),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        phase: "error",
        code: "document_not_found",
        status: 404,
      });
    });
  });

  it("aborts the previous request when documentPath changes", async () => {
    const signals: AbortSignal[] = [];
    const fetchDocument: FetchDocumentFn = vi.fn(
      (_path, opts) =>
        new Promise<FetchDocumentResult>(() => {
          if (opts?.signal) signals.push(opts.signal);
        }),
    );

    const { rerender } = renderHook(
      ({ path }: { path: string | null }) =>
        useDocument(path, { fetchDocument }),
      { initialProps: { path: "first.md" as string | null } },
    );

    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    rerender({ path: "second.md" });

    expect(signals[0].aborted).toBe(true);
    expect(signals).toHaveLength(2);
    expect(signals[1].aborted).toBe(false);
  });

  it("ignores a late response from a previously-aborted request", async () => {
    let resolveFirst: (value: FetchDocumentResult) => void = () => {};
    const fetchDocument: FetchDocumentFn = vi
      .fn<FetchDocumentFn>()
      .mockImplementationOnce(
        () =>
          new Promise<FetchDocumentResult>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ ok: true, content: "second" });

    const { result, rerender } = renderHook(
      ({ path }: { path: string | null }) =>
        useDocument(path, { fetchDocument }),
      { initialProps: { path: "first.md" as string | null } },
    );

    expect(result.current).toEqual({ phase: "loading" });

    rerender({ path: "second.md" });

    await waitFor(() => {
      expect(result.current).toEqual({ phase: "loaded", content: "second" });
    });

    await act(async () => {
      resolveFirst({ ok: true, content: "stale-first" });
    });

    expect(result.current).toEqual({ phase: "loaded", content: "second" });
  });

  it("returns to idle when documentPath becomes null", async () => {
    const fetchDocument: FetchDocumentFn = vi
      .fn()
      .mockResolvedValue({ ok: true, content: "x" });

    const { result, rerender } = renderHook(
      ({ path }: { path: string | null }) =>
        useDocument(path, { fetchDocument }),
      { initialProps: { path: "x.md" as string | null } },
    );

    await waitFor(() => {
      expect(result.current.phase).toBe("loaded");
    });

    rerender({ path: null });
    expect(result.current).toEqual({ phase: "idle" });
  });

  it("aborts the in-flight request on unmount", () => {
    const signals: AbortSignal[] = [];
    const fetchDocument: FetchDocumentFn = vi.fn(
      (_path, opts) =>
        new Promise<FetchDocumentResult>(() => {
          if (opts?.signal) signals.push(opts.signal);
        }),
    );

    const { unmount } = renderHook(() =>
      useDocument("x.md", { fetchDocument }),
    );

    expect(signals[0].aborted).toBe(false);
    unmount();
    expect(signals[0].aborted).toBe(true);
  });
});
