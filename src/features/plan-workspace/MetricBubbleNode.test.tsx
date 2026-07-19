// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FlowNodeData } from "../../lib/graph/flow-projection-service";
import { MetricBubbleNode } from "./MetricBubbleNode";
import { TooltipProvider } from "./ui/Tooltip";
import { installRadixDomShims } from "./ui/test/radix-dom-shims";

installRadixDomShims();

afterEach(cleanup);

const baseData: FlowNodeData = {
  id: "a",
  title: "Task A",
  laneLabel: "Backend",
  laneColor: null,
  status: "ready",
  value: 60,
  summary: "",
  estimate: undefined,
  estimateUnit: "days",
  isOnCriticalPath: false,
  criticalPathOrder: null,
  slackDays: 0,
  metricSummary: {
    value: 60,
    value_per_effort: 0,
    estimate_days: 0,
    remaining_days: 0,
    downstream_effort_days: 0,
    degree: 0,
    in_degree: 0,
    out_degree: 0,
    betweenness: 0,
    dependency_span: 0,
  },
  isSelected: false,
  visibilityRole: "focus",
};

function renderBubble(data: FlowNodeData = baseData) {
  return render(
    <TooltipProvider>
      <ReactFlowProvider>
        <MetricBubbleNode
          id={data.id}
          data={data}
          type="metricBubble"
          dragging={false}
          isConnectable={false}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          zIndex={1}
          selected={false}
          selectable={true}
          deletable={false}
          draggable={false}
        />
      </ReactFlowProvider>
    </TooltipProvider>,
  );
}

describe("MetricBubbleNode detail tooltip", () => {
  it("renders a focusable trigger named after the work item, with no tooltip open", () => {
    renderBubble();
    const trigger = screen.getByRole("button", { name: "Task A" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on hover and shows title, status, lane, and value", async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.hover(screen.getByRole("button", { name: "Task A" }));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain("Task A");
    expect(tooltip.textContent).toContain("Ready");
    expect(tooltip.textContent).toContain("Backend");
    expect(tooltip.textContent).toContain("V60");
  });

  it("opens on keyboard focus", async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.tab();

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Task A" }),
    );
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain("Task A");
  });

  it("dismisses on Escape", async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.tab();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).toBeNull();
    });
  });
});
