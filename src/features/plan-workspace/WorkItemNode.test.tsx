import { cleanup, render } from "@testing-library/react";
// @vitest-environment happy-dom
import { type Node, ReactFlowProvider } from "@xyflow/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { FlowNodeData } from "../../lib/graph/flow-projection-service";
import { MetricBubbleNode } from "./MetricBubbleNode";
import { WorkItemNode } from "./WorkItemNode";

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

function Wrapper({ children }: { children: ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}

describe("Graph node components are memoized", () => {
  it("WorkItemNode is wrapped with React.memo", () => {
    // React.memo returns an exotic object whose $$typeof is the memo symbol.
    const wrapped = WorkItemNode as unknown as {
      $$typeof?: symbol;
      type?: unknown;
    };
    expect(wrapped.$$typeof).toBe(Symbol.for("react.memo"));
    expect(typeof wrapped.type).toBe("function");
  });

  it("MetricBubbleNode is wrapped with React.memo", () => {
    const wrapped = MetricBubbleNode as unknown as {
      $$typeof?: symbol;
      type?: unknown;
    };
    expect(wrapped.$$typeof).toBe(Symbol.for("react.memo"));
    expect(typeof wrapped.type).toBe("function");
  });

  it("WorkItemNode renders without subscribing to the display store directly", () => {
    type WorkItemNodeShape = Node<FlowNodeData, "workItem">;
    const node: WorkItemNodeShape = {
      id: "a",
      type: "workItem",
      position: { x: 0, y: 0 },
      data: baseData,
    };
    // Render with no Zustand provider — would throw if the component required
    // a real store subscription beyond the canvas-provided context defaults.
    const { container } = render(
      <Wrapper>
        <WorkItemNode
          id={node.id}
          data={node.data}
          type="workItem"
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
      </Wrapper>,
    );
    expect(container.textContent).toContain("Task A");
  });
});
