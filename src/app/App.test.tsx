// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanStateSnapshot } from "../lib/plan/plan-api-client";

const useTaskGardenPlanStateMock = vi.hoisted(() => vi.fn());
const PlanWorkspacePageMock = vi.hoisted(() =>
  vi.fn((props: { source: string; revision: number; planFileName: string }) => (
    <div
      data-testid="plan-workspace-page"
      data-source={props.source}
      data-revision={props.revision}
      data-plan-file-name={props.planFileName}
    />
  )),
);

vi.mock("../lib/plan/use-task-garden-plan-state", () => ({
  useTaskGardenPlanState: useTaskGardenPlanStateMock,
}));

vi.mock("../features/plan-workspace/PlanWorkspacePage", () => ({
  PlanWorkspacePage: PlanWorkspacePageMock,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    useTaskGardenPlanStateMock.mockReset();
    PlanWorkspacePageMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading state in the loading phase", () => {
    useTaskGardenPlanStateMock.mockReturnValue({ phase: "loading" });

    render(<App />);

    expect(screen.getByLabelText("Loading plan")).toBeTruthy();
    expect(PlanWorkspacePageMock).not.toHaveBeenCalled();
  });

  it("renders a filesystem error panel when ready but source is null", async () => {
    const snapshot: PlanStateSnapshot = {
      revision: 3,
      source: null,
      sourceError: { message: "Plan file no longer exists at /tmp/x.yaml" },
      planFileName: "x.yaml",
    };
    useTaskGardenPlanStateMock.mockReturnValue({
      phase: "ready",
      snapshot,
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText("Plan file no longer exists at /tmp/x.yaml"),
      ).toBeTruthy();
    });
    expect(PlanWorkspacePageMock).not.toHaveBeenCalled();
  });

  it("renders PlanWorkspacePage when ready with source", () => {
    const snapshot: PlanStateSnapshot = {
      revision: 11,
      source: "version: 1\nplan_id: demo\n",
      sourceError: null,
      planFileName: "demo.yaml",
    };
    useTaskGardenPlanStateMock.mockReturnValue({
      phase: "ready",
      snapshot,
    });

    render(<App />);

    const node = screen.getByTestId("plan-workspace-page");
    expect(node.getAttribute("data-source")).toBe(
      "version: 1\nplan_id: demo\n",
    );
    expect(node.getAttribute("data-revision")).toBe("11");
    expect(node.getAttribute("data-plan-file-name")).toBe("demo.yaml");
  });
});
