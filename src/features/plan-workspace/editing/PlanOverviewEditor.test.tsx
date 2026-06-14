// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanPatch } from "../../../../cli/shared/patch-schema";
import type {
  EditApiResult,
  PatchPlanOptions,
} from "../../../lib/plan/edit-api-client";
import type { TaskGardenPlan } from "../../../lib/plan/task-garden-plan.schema";
import { PlanOverviewEditor } from "./PlanOverviewEditor";
import { useEditStore } from "./edit.store";

type PatchPlanFn = (
  patch: PlanPatch,
  opts: PatchPlanOptions,
) => Promise<EditApiResult>;

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

function makePlan(overrides: Partial<TaskGardenPlan> = {}): TaskGardenPlan {
  return {
    version: 1,
    plan_id: "p",
    title: "My Plan",
    last_updated: "2024-01-01",
    summary: "Summary text",
    estimate_unit: "days",
    references: [],
    lanes: [{ id: "lane-1", label: "L1" }],
    work_items: [
      {
        id: "a",
        title: "A",
        summary: "S",
        lane: "lane-1",
        status: "planned",
        priority: "p1",
        depends_on: [],
        tags: [],
        deliverables: [],
        reuse_candidates: [],
        links: [],
      },
    ],
    ...overrides,
  };
}

describe("PlanOverviewEditor", () => {
  it("commits a title edit on blur", async () => {
    const patchPlan = okPatch();
    render(
      <PlanOverviewEditor
        plan={makePlan()}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const titleInput = screen.getByTestId(
      "plan-title-input",
    ) as HTMLInputElement;
    await act(async () => {
      titleInput.focus();
      fireEvent.change(titleInput, { target: { value: "Renamed Plan" } });
      titleInput.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "plan.field",
      field: "title",
      value: "Renamed Plan",
    });
  });

  it("commits a summary edit on blur", async () => {
    const patchPlan = okPatch();
    render(
      <PlanOverviewEditor
        plan={makePlan()}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const summaryInput = screen.getByTestId(
      "plan-summary-input",
    ) as HTMLTextAreaElement;
    await act(async () => {
      summaryInput.focus();
      fireEvent.change(summaryInput, { target: { value: "New summary" } });
      summaryInput.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "plan.field",
      field: "summary",
      value: "New summary",
    });
  });

  it("commits a last_updated edit on blur", async () => {
    const patchPlan = okPatch();
    render(
      <PlanOverviewEditor
        plan={makePlan()}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    const dateInput = screen.getByTestId(
      "plan-last-updated-input",
    ) as HTMLInputElement;
    await act(async () => {
      dateInput.focus();
      fireEvent.change(dateInput, { target: { value: "2024-06-01" } });
      dateInput.blur();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).toHaveBeenCalled();
    const [patchArg] = (patchPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(patchArg).toEqual({
      kind: "plan.field",
      field: "last_updated",
      value: "2024-06-01",
    });
  });

  it("does not commit references while moving focus between fields in the same row", async () => {
    const patchPlan = okPatch();
    render(
      <PlanOverviewEditor
        plan={makePlan({
          references: [{ label: "Doc", href: "https://example.com" }],
        })}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("plan-ref-add"));

    const labels = screen.getAllByTestId(
      /plan-ref-label-/,
    ) as HTMLInputElement[];
    const hrefs = screen.getAllByTestId(/plan-ref-href-/) as HTMLInputElement[];

    await act(async () => {
      labels[1].focus();
      fireEvent.change(labels[1], { target: { value: "Repo" } });
      // Moving from label → href within the same row should not commit.
      fireEvent.blur(labels[1], { relatedTarget: hrefs[1] });
      hrefs[1].focus();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(patchPlan).not.toHaveBeenCalled();
  });

  it("commits a references edit when focus leaves the row entirely", async () => {
    const patchPlan = okPatch();
    render(
      <PlanOverviewEditor
        plan={makePlan({
          references: [{ label: "Doc", href: "https://example.com" }],
        })}
        baseRevision={1}
        patchPlan={patchPlan}
      />,
    );

    fireEvent.click(screen.getByTestId("plan-ref-add"));

    const labels = screen.getAllByTestId(
      /plan-ref-label-/,
    ) as HTMLInputElement[];
    const hrefs = screen.getAllByTestId(/plan-ref-href-/) as HTMLInputElement[];

    await act(async () => {
      labels[1].focus();
      fireEvent.change(labels[1], { target: { value: "Repo" } });
      fireEvent.blur(labels[1], { relatedTarget: hrefs[1] });
      hrefs[1].focus();
      fireEvent.change(hrefs[1], { target: { value: "https://github.com" } });
      fireEvent.blur(hrefs[1], { relatedTarget: null });
      await Promise.resolve();
      await Promise.resolve();
    });

    const calls = (patchPlan as ReturnType<typeof vi.fn>).mock.calls;
    const final = calls[calls.length - 1][0];
    expect(final).toEqual({
      kind: "plan.references",
      value: [
        { label: "Doc", href: "https://example.com" },
        { label: "Repo", href: "https://github.com" },
      ],
    });
  });
});
