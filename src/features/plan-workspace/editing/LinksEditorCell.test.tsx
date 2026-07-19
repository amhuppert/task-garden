// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchPlanFn } from "../../../lib/plan/edit-api-client";
import { LinksEditorCell } from "./LinksEditorCell";
import { useEditStore } from "./edit.store";

function reset() {
  useEditStore.setState({
    drafts: {},
    inflight: {},
    lastWriteResult: { phase: "idle" },
    recentSelfOps: [],
  });
}

beforeEach(reset);
afterEach(cleanup);

function okPatch(): PatchPlanFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    operationId: "op-1",
    revision: 2,
  });
}

describe("LinksEditorCell", () => {
  it("renders existing links", () => {
    render(
      <LinksEditorCell
        workItemId="a"
        committedValue={[{ label: "Docs", href: "https://example.com" }]}
        baseRevision={1}
      />,
    );

    const labels = screen.getAllByTestId(/link-label-/) as HTMLInputElement[];
    expect(labels).toHaveLength(1);
    expect(labels[0].value).toBe("Docs");
  });

  it("does not commit while moving focus between fields within the same row", async () => {
    const patchPlan = okPatch();
    render(
      <LinksEditorCell
        workItemId="a"
        committedValue={[{ label: "Docs", href: "https://example.com" }]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("link-add"));

    const labels = screen.getAllByTestId(/link-label-/) as HTMLInputElement[];
    const hrefs = screen.getAllByTestId(/link-href-/) as HTMLInputElement[];
    const newLabel = labels[1];
    const newHref = hrefs[1];

    // Type into label, then tab to href (focus moves within the same row).
    // No commit should fire because the row still has focus.
    await act(async () => {
      newLabel.focus();
      fireEvent.change(newLabel, { target: { value: "Repo" } });
      // Simulate Tab: blur label, focus href in same row.
      fireEvent.blur(newLabel, { relatedTarget: newHref });
      newHref.focus();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
  });

  it("Add → fill both fields → blur the row commits the appended array", async () => {
    const patchPlan = okPatch();
    render(
      <LinksEditorCell
        workItemId="a"
        committedValue={[{ label: "Docs", href: "https://example.com" }]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("link-add"));

    const labels = screen.getAllByTestId(/link-label-/) as HTMLInputElement[];
    const hrefs = screen.getAllByTestId(/link-href-/) as HTMLInputElement[];
    const newLabel = labels[1];
    const newHref = hrefs[1];

    await act(async () => {
      newLabel.focus();
      fireEvent.change(newLabel, { target: { value: "Repo" } });
      fireEvent.blur(newLabel, { relatedTarget: newHref });
      newHref.focus();
      fireEvent.change(newHref, { target: { value: "https://github.com" } });
      // Blur the row entirely — relatedTarget is outside the row.
      fireEvent.blur(newHref, { relatedTarget: null });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const calls = (patchPlan as ReturnType<typeof vi.fn>).mock.calls;
    const finalCall = calls[calls.length - 1][0];
    expect(finalCall).toEqual({
      kind: "work_item.links",
      target: { id: "a" },
      value: [
        { label: "Docs", href: "https://example.com" },
        { label: "Repo", href: "https://github.com" },
      ],
    });
  });

  it("Enter in a row field blurs it and commits", async () => {
    const patchPlan = okPatch();
    render(
      <LinksEditorCell
        workItemId="a"
        committedValue={[{ label: "Docs", href: "https://example.com" }]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const href = screen.getByTestId("link-href-0") as HTMLInputElement;

    await act(async () => {
      href.focus();
      fireEvent.change(href, { target: { value: "https://example.org" } });
      fireEvent.keyDown(href, { key: "Enter" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const calls = (patchPlan as ReturnType<typeof vi.fn>).mock.calls;
    const finalCall = calls[calls.length - 1][0];
    expect(finalCall).toEqual({
      kind: "work_item.links",
      target: { id: "a" },
      value: [{ label: "Docs", href: "https://example.org" }],
    });
  });

  it("× removes a row", async () => {
    const patchPlan = okPatch();
    render(
      <LinksEditorCell
        workItemId="a"
        committedValue={[
          { label: "Docs", href: "https://example.com" },
          { label: "Repo", href: "https://github.com" },
        ]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Remove link Docs"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalledTimes(1);
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "work_item.links",
      target: { id: "a" },
      value: [{ label: "Repo", href: "https://github.com" }],
    });
  });

  it("filters rows with empty label or href before commit", async () => {
    const patchPlan = okPatch();
    render(
      <LinksEditorCell
        workItemId="a"
        committedValue={[{ label: "Docs", href: "https://example.com" }]}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("link-add"));
    fireEvent.click(screen.getByTestId("link-add"));

    const labels = screen.getAllByTestId(/link-label-/) as HTMLInputElement[];
    const hrefs = screen.getAllByTestId(/link-href-/) as HTMLInputElement[];

    await act(async () => {
      // Row 1: label-only (incomplete) — blur out of row
      labels[1].focus();
      fireEvent.change(labels[1], { target: { value: "OnlyLabel" } });
      fireEvent.blur(labels[1], { relatedTarget: labels[2] });
      // Row 2: complete
      labels[2].focus();
      fireEvent.change(labels[2], { target: { value: "Repo" } });
      fireEvent.blur(labels[2], { relatedTarget: hrefs[2] });
      hrefs[2].focus();
      fireEvent.change(hrefs[2], { target: { value: "https://github.com" } });
      fireEvent.blur(hrefs[2], { relatedTarget: null });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const calls = (patchPlan as ReturnType<typeof vi.fn>).mock.calls;
    const finalCall = calls[calls.length - 1][0];
    expect(finalCall).toEqual({
      kind: "work_item.links",
      target: { id: "a" },
      value: [
        { label: "Docs", href: "https://example.com" },
        { label: "Repo", href: "https://github.com" },
      ],
    });
  });
});
