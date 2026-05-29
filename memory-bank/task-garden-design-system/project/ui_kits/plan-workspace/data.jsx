// Sample plan — mirrors task-garden-v1.yaml shape at a smaller scale so we can
// render a believable Plan Workspace screen. Exposed on window for other files.

const PLAN = {
  title: "Task Garden V1",
  summary:
    "Initial implementation plan for Task Garden, a single-user read-only planning tool for visualizing work items and dependencies as an interactive graph.",
  lanes: [
    { id: "input", label: "Input Boundary" },
    { id: "domain", label: "Domain" },
    { id: "ui", label: "UI" },
  ],
  items: [
    // INPUT lane
    {
      id: "plan-runtime-config",
      lane: "input",
      title: "Plan Runtime Config",
      status: "done",
      priority: "p0",
      estimate: 1,
      tags: ["startup", "config"],
    },
    {
      id: "plan-registry",
      lane: "input",
      title: "Plan Registry",
      status: "done",
      priority: "p0",
      estimate: 1,
      tags: ["startup", "registry"],
    },
    {
      id: "plan-source-subscription",
      lane: "input",
      title: "Plan Source Subscription",
      status: "done",
      priority: "p0",
      estimate: 1.5,
      tags: ["hmr"],
    },

    // DOMAIN lane
    {
      id: "plan-schema",
      lane: "domain",
      title: "Plan Schema Validation",
      status: "in_progress",
      priority: "p0",
      estimate: 2,
      tags: ["schema"],
    },
    {
      id: "reference-resolver",
      lane: "domain",
      title: "Reference Resolver",
      status: "ready",
      priority: "p1",
      estimate: 1.5,
      tags: ["refs"],
    },
    {
      id: "analysis-engine",
      lane: "domain",
      title: "Analysis Engine",
      status: "blocked",
      priority: "p0",
      estimate: 3,
      tags: ["graph"],
    },

    // UI lane
    {
      id: "plan-graph-canvas",
      lane: "ui",
      title: "Plan Graph Canvas",
      status: "planned",
      priority: "p0",
      estimate: 3,
      tags: ["canvas"],
    },
    {
      id: "plan-toolbar",
      lane: "ui",
      title: "Plan Toolbar",
      status: "planned",
      priority: "p1",
      estimate: 2,
      tags: ["controls"],
    },
    {
      id: "details-panel",
      lane: "ui",
      title: "Details Panel",
      status: "future",
      priority: "p2",
      estimate: 1.5,
      tags: ["details"],
    },
    {
      id: "insights-panel",
      lane: "ui",
      title: "Insights Panel",
      status: "future",
      priority: "p3",
      estimate: 2,
      tags: ["insights"],
    },
  ],
  deps: [
    ["plan-registry", "plan-source-subscription"],
    ["plan-runtime-config", "plan-source-subscription"],
    ["plan-source-subscription", "plan-schema"],
    ["plan-schema", "reference-resolver"],
    ["plan-schema", "analysis-engine"],
    ["reference-resolver", "analysis-engine"],
    ["analysis-engine", "plan-graph-canvas"],
    ["plan-graph-canvas", "plan-toolbar"],
    ["plan-graph-canvas", "details-panel"],
    ["analysis-engine", "insights-panel"],
  ],
};

const STATUS_LABELS = {
  planned: "Planned",
  ready: "Ready",
  blocked: "Blocked",
  in_progress: "In Progress",
  done: "Done",
  future: "Future",
};
const STATUS_COLOR = {
  planned: "var(--color-status-planned)",
  ready: "var(--color-status-ready)",
  blocked: "var(--color-status-blocked)",
  in_progress: "var(--color-status-in-progress)",
  done: "var(--color-status-done)",
  future: "var(--color-status-future)",
};
const PRIORITY_LABELS = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
  nice_to_have: "NTH",
};
const PRIORITY_COLOR = {
  p0: "var(--color-petal)",
  p1: "var(--color-pollen)",
  p2: "var(--color-moss)",
  p3: "var(--color-water)",
  nice_to_have: "var(--color-iron)",
};

Object.assign(window, {
  PLAN,
  STATUS_LABELS,
  STATUS_COLOR,
  PRIORITY_LABELS,
  PRIORITY_COLOR,
});
