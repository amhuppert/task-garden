// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FetchDocumentResult } from "../../../lib/plan/plan-api-client";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

type FetchDocumentFn = (
  path: string,
  opts?: { signal?: AbortSignal },
) => Promise<FetchDocumentResult>;

describe("DocumentPreviewModal", () => {
  it("renders nothing when documentPath is null (idle phase)", () => {
    const fetchDocument: FetchDocumentFn = vi.fn();
    const { container } = render(
      <DocumentPreviewModal
        documentPath={null}
        onClose={() => {}}
        deps={{ fetchDocument }}
      />,
    );

    expect(container.querySelector("dialog")).toBeNull();
    expect(fetchDocument).not.toHaveBeenCalled();
  });

  it("renders the loading state while the document is being fetched", () => {
    const fetchDocument: FetchDocumentFn = vi.fn(
      () => new Promise<FetchDocumentResult>(() => {}),
    );

    render(
      <DocumentPreviewModal
        documentPath="docs/intro.md"
        onClose={() => {}}
        deps={{ fetchDocument }}
      />,
    );

    expect(screen.getByLabelText("Loading document")).toBeTruthy();
    expect(fetchDocument).toHaveBeenCalledWith(
      "docs/intro.md",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("renders the document content once the fetch resolves", async () => {
    const fetchDocument: FetchDocumentFn = vi
      .fn()
      .mockResolvedValue({ ok: true, content: "# Hello\nWorld" });

    render(
      <DocumentPreviewModal
        documentPath="docs/intro.md"
        onClose={() => {}}
        deps={{ fetchDocument }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/# Hello/)).toBeTruthy();
    });
  });

  it("renders an error panel when the fetch fails (document_not_found)", async () => {
    const fetchDocument: FetchDocumentFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      code: "document_not_found",
    });

    render(
      <DocumentPreviewModal
        documentPath="missing.md"
        onClose={() => {}}
        deps={{ fetchDocument }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText("Document not found.")).toBeTruthy();
    });
  });

  it("renders an error message specific to unsafe_path", async () => {
    const fetchDocument: FetchDocumentFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      code: "unsafe_path",
    });

    render(
      <DocumentPreviewModal
        documentPath="../etc/passwd"
        onClose={() => {}}
        deps={{ fetchDocument }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("This document path is not allowed."),
      ).toBeTruthy();
    });
  });

  it("renders an error message specific to document_read_failed", async () => {
    const fetchDocument: FetchDocumentFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      code: "document_read_failed",
    });

    render(
      <DocumentPreviewModal
        documentPath="broken.md"
        onClose={() => {}}
        deps={{ fetchDocument }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not read the document.")).toBeTruthy();
    });
  });
});
