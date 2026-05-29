// Right rail: details / insights tabs.
const { useState: useStateDetails } = React;

function DetailsPanel({ state, setState }) {
  const [tab, setTab] = useStateDetails("details");
  const item = PLAN.items.find((i) => i.id === state.selectedId);
  const downstream = item
    ? PLAN.deps.filter(([f]) => f === item.id).map(([, t]) => t)
    : [];
  const upstream = item
    ? PLAN.deps.filter(([, t]) => t === item.id).map(([f]) => f)
    : [];

  return (
    <aside
      className="atlas-panel-strong"
      style={{
        width: 320,
        flexShrink: 0,
        padding: "20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflowY: "auto",
        borderRadius: 0,
        borderLeft: "1px solid var(--color-border)",
        background: "color-mix(in oklab, var(--color-panel) 98%, transparent)",
        backdropFilter: "blur(20px)",
      }}
    >
      <nav
        style={{
          display: "flex",
          gap: 6,
          padding: 3,
          background: "var(--color-surface-muted)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
        }}
      >
        {[
          ["details", "Details"],
          ["insights", "Insights"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 9,
              border:
                "1px solid " +
                (tab === k ? "var(--color-border-strong)" : "transparent"),
              background: tab === k ? "var(--color-surface)" : "transparent",
              color:
                tab === k
                  ? "var(--color-foreground)"
                  : "var(--color-muted-foreground)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: tab === k ? "var(--shadow-specimen)" : "none",
            }}
          >
            {l}
          </button>
        ))}
      </nav>

      {tab === "details" &&
        (item ? (
          <DetailsBody
            item={item}
            upstream={upstream}
            downstream={downstream}
          />
        ) : (
          <EmptyState />
        ))}

      {tab === "insights" && <InsightsBody />}
    </aside>
  );
}

function DetailsBody({ item, upstream, downstream }) {
  const lane = PLAN.lanes.find((l) => l.id === item.lane);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <Kicker>Work Item Details</Kicker>
        <div
          className="atlas-title"
          style={{ fontSize: 22, marginTop: 6, lineHeight: 1.15 }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-muted-foreground)",
            marginTop: 4,
          }}
        >
          {item.id} · seq{" "}
          {String(PLAN.items.indexOf(item) + 1).padStart(2, "0")}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatCard label="Status">
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <StatusDot status={item.status} />
            {STATUS_LABELS[item.status]}
          </span>
        </StatCard>
        <StatCard label="Priority">
          <PriorityPill priority={item.priority} />
        </StatCard>
        <StatCard label="Estimate">{item.estimate}d</StatCard>
        <StatCard label="Lane">{lane.label}</StatCard>
      </div>

      <div>
        <Kicker>Tags</Kicker>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
        >
          {item.tags.map((t) => (
            <Microchip key={t}>#{t}</Microchip>
          ))}
        </div>
      </div>

      <RefList label="Upstream" ids={upstream} />
      <RefList label="Downstream" ids={downstream} />
    </div>
  );
}

function StatCard({ label, children }) {
  return (
    <div
      className="atlas-stat-card"
      style={{ padding: "10px 12px", borderRadius: 14 }}
    >
      <div className="atlas-kicker" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-foreground)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RefList({ label, ids }) {
  return (
    <div>
      <Kicker>{label}</Kicker>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 8,
        }}
      >
        {ids.length === 0 && (
          <span
            style={{
              fontSize: 12,
              color: "var(--color-muted-foreground)",
              fontStyle: "italic",
            }}
          >
            — none —
          </span>
        )}
        {ids.map((id) => {
          const ref = PLAN.items.find((i) => i.id === id);
          return (
            <div
              key={id}
              className="atlas-ref"
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <StatusDot status={ref.status} size={7} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-muted-foreground)",
                }}
              >
                {ref.id}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: "var(--color-foreground)",
                }}
              >
                {ref.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "28px 18px",
        marginTop: 20,
        color: "var(--color-muted-foreground)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, color: "var(--color-iron-light)" }}>⊞</div>
      <div style={{ fontSize: 12 }}>
        Select a work item in the graph to see its details.
      </div>
    </div>
  );
}

function InsightsBody() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Kicker>Plan Overview</Kicker>
        <div
          className="atlas-title"
          style={{ fontSize: 22, marginTop: 6, lineHeight: 1.15 }}
        >
          {PLAN.title}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-muted-foreground)",
            lineHeight: 1.55,
            marginTop: 6,
          }}
        >
          {PLAN.summary}
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatCard label="Work Items">{PLAN.items.length}</StatCard>
        <StatCard label="Edges">{PLAN.deps.length}</StatCard>
        <StatCard label="Total Estimate">
          {PLAN.items.reduce((s, i) => s + i.estimate, 0)}d
        </StatCard>
        <StatCard label="Critical Path">3.2d chain</StatCard>
      </div>
      <div>
        <Kicker>By Status</Kicker>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 8,
          }}
        >
          {Object.keys(STATUS_LABELS).map((st) => {
            const n = PLAN.items.filter((i) => i.status === st).length;
            const pct = n / PLAN.items.length;
            return (
              <div
                key={st}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <StatusDot status={st} />
                <span
                  style={{
                    fontSize: 11,
                    width: 78,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  {STATUS_LABELS[st]}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: pct * 100 + "%",
                      height: "100%",
                      background: STATUS_COLOR[st],
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    width: 18,
                    textAlign: "right",
                  }}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DetailsPanel });
