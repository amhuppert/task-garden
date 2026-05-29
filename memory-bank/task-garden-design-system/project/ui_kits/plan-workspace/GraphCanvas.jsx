// Graph canvas: lanes, nodes, dependency edges. Click a node to select.

const LANE_X = { input: 60, domain: 420, ui: 790 };
const LANE_W = 320;

function laneYPositions(items) {
  // Vertical positions by lane, in order
  const byLane = {};
  PLAN.lanes.forEach((l) => (byLane[l.id] = []));
  items.forEach((it) => byLane[it.lane].push(it));
  const map = {};
  Object.entries(byLane).forEach(([laneId, list]) => {
    list.forEach((it, i) => {
      map[it.id] = 80 + i * 128;
    });
  });
  return map;
}

function itemMatchesFilters(it, s) {
  if (s.query) {
    const q = s.query.toLowerCase();
    if (
      !it.title.toLowerCase().includes(q) &&
      !it.id.includes(q) &&
      !it.tags.some((t) => t.includes(q))
    )
      return "dim";
  }
  if (s.statusFilter.size && !s.statusFilter.has(it.status)) return "dim";
  if (s.priorityFilter.size && !s.priorityFilter.has(it.priority)) return "dim";
  if (s.laneFilter.size && !s.laneFilter.has(it.lane)) return "dim";
  return "match";
}

function GraphCanvas({ state, setState }) {
  const { selectedId, colorBy } = state;
  const yPos = laneYPositions(PLAN.items);
  const selected = PLAN.items.find((i) => i.id === selectedId);

  const critical = new Set([
    "plan-schema",
    "analysis-engine",
    "plan-graph-canvas",
    "details-panel",
  ]);

  const xOf = (it) => LANE_X[it.lane];
  const yOf = (it) => yPos[it.id];

  const select = (id) => setState((s) => ({ ...s, selectedId: id }));

  return (
    <div
      className="atlas-page"
      style={{ flex: 1, position: "relative", overflow: "auto" }}
    >
      {/* Lane bands */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {PLAN.lanes.map((l, i) => (
          <div
            key={l.id}
            style={{
              position: "absolute",
              left: LANE_X[l.id] - 28,
              top: 24,
              width: LANE_W,
              bottom: 24,
              borderLeft: "1px dashed var(--color-border)",
              borderRight: "1px dashed var(--color-border)",
              background:
                i % 2
                  ? "color-mix(in oklab, var(--color-moss) 2.5%, transparent)"
                  : "transparent",
              borderRadius: 18,
            }}
          >
            <div
              className="atlas-kicker"
              style={{
                position: "absolute",
                top: -6,
                left: 12,
                background: "var(--color-background)",
                padding: "0 8px",
              }}
            >
              {l.label}
            </div>
          </div>
        ))}
      </div>

      {/* Edges */}
      <svg
        width="1200"
        height="1000"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-bark-light)" />
          </marker>
          <marker
            id="arrow-crit"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-pollen-deep)" />
          </marker>
        </defs>
        {PLAN.deps.map(([from, to]) => {
          const a = PLAN.items.find((i) => i.id === from);
          const b = PLAN.items.find((i) => i.id === to);
          if (!a || !b) return null;
          const x1 = xOf(a) + 240,
            y1 = yOf(a) + 44;
          const x2 = xOf(b),
            y2 = yOf(b) + 44;
          const mx = (x1 + x2) / 2;
          const isCrit = critical.has(from) && critical.has(to);
          const path = `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
          return (
            <path
              key={from + "->" + to}
              d={path}
              fill="none"
              stroke={
                isCrit ? "var(--color-pollen-deep)" : "var(--color-bark-light)"
              }
              strokeWidth={isCrit ? 2 : 1.25}
              strokeDasharray={isCrit ? "none" : "none"}
              markerEnd={"url(#" + (isCrit ? "arrow-crit" : "arrow") + ")"}
              opacity={isCrit ? 0.9 : 0.6}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {PLAN.items.map((it) => {
        const match = itemMatchesFilters(it, state);
        const isSel = selectedId === it.id;
        const accent =
          colorBy === "priority"
            ? PRIORITY_COLOR[it.priority]
            : colorBy === "lane"
              ? it.lane === "input"
                ? "var(--color-water)"
                : it.lane === "domain"
                  ? "var(--color-moss)"
                  : "var(--color-sage-deep)"
              : colorBy === "critical"
                ? critical.has(it.id)
                  ? "var(--color-pollen-deep)"
                  : "var(--color-iron)"
                : STATUS_COLOR[it.status];
        return (
          <div
            key={it.id}
            onClick={() => select(it.id)}
            className={"atlas-node" + (isSel ? " atlas-node-selected" : "")}
            style={{
              position: "absolute",
              left: xOf(it),
              top: yOf(it),
              width: 240,
              minHeight: 92,
              padding: "12px 14px",
              borderLeftWidth: 3,
              borderLeftColor: accent,
              opacity: match === "dim" ? 0.32 : 1,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="atlas-kicker" style={{ fontSize: 8.5 }}>
                {it.id}
              </span>
              <PriorityPill priority={it.priority} />
            </div>
            <div
              className="atlas-title"
              style={{
                fontSize: 16,
                marginTop: 6,
                marginBottom: 6,
                lineHeight: 1.2,
              }}
            >
              {it.title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <StatusDot status={it.status} size={7} />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  {STATUS_LABELS[it.status]}
                </span>
              </span>
              <Microchip>{it.estimate}d</Microchip>
              {critical.has(it.id) && (
                <Microchip tone="var(--color-pollen-deep)">crit</Microchip>
              )}
            </div>
            {/* Bottom metric bar */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, " +
                  accent +
                  " 60%, transparent)",
                opacity: 0.55,
                borderRadius: "0 0 22px 22px",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
window.GraphCanvas = GraphCanvas;
