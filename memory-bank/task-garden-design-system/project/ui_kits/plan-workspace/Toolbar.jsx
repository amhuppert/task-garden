// Left rail: search, scope, filters, schedule overlay.
const { useState: useStateToolbar } = React;

function Toolbar({ state, setState }) {
  const {
    query,
    statusFilter,
    priorityFilter,
    laneFilter,
    scope,
    colorBy,
    overlay,
  } = state;
  const setQuery = (v) => setState((s) => ({ ...s, query: v }));
  const toggleSet = (key, value) =>
    setState((s) => {
      const next = new Set(s[key]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...s, [key]: next };
    });
  const setScope = (v) => setState((s) => ({ ...s, scope: v }));
  const setColorBy = (v) => setState((s) => ({ ...s, colorBy: v }));
  const setOverlay = (v) => setState((s) => ({ ...s, overlay: v }));
  const clearFilters = () =>
    setState((s) => ({
      ...s,
      query: "",
      statusFilter: new Set(),
      priorityFilter: new Set(),
      laneFilter: new Set(),
    }));

  return (
    <aside
      className="atlas-panel-strong"
      style={{
        width: 288,
        flexShrink: 0,
        padding: "20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        overflowY: "auto",
        borderRadius: 0,
        borderRight: "1px solid var(--color-border)",
        background: "color-mix(in oklab, var(--color-panel) 98%, transparent)",
        backdropFilter: "blur(20px)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src="../../assets/logo-192.png"
          width={28}
          height={28}
          alt=""
          style={{ borderRadius: 7, boxShadow: "var(--shadow-specimen)" }}
        />
        <div
          style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}
        >
          <span className="atlas-kicker" style={{ fontSize: 9 }}>
            Botanical Atlas
          </span>
          <span className="atlas-title" style={{ fontSize: 18 }}>
            Task Garden
          </span>
        </div>
      </header>

      <Section label="Search">
        <Field
          value={query}
          onChange={setQuery}
          placeholder="Search work items…"
        />
      </Section>

      <Section label="Scope" info="Narrows the graph around the selected item.">
        {["all", "upstream", "downstream", "neighborhood"].map((s) => (
          <Chip key={s} active={scope === s} onClick={() => setScope(s)}>
            {
              {
                all: "All",
                upstream: "Upstream",
                downstream: "Downstream",
                neighborhood: "Neighborhood",
              }[s]
            }
          </Chip>
        ))}
      </Section>

      <Section
        label="Status"
        trailing={statusFilter.size ? `${statusFilter.size} active` : null}
      >
        {Object.keys(STATUS_LABELS).map((st) => (
          <Chip
            key={st}
            active={statusFilter.has(st)}
            onClick={() => toggleSet("statusFilter", st)}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <StatusDot status={st} />
              {STATUS_LABELS[st]}
            </span>
          </Chip>
        ))}
      </Section>

      <Section
        label="Priority"
        trailing={priorityFilter.size ? `${priorityFilter.size} active` : null}
      >
        {["p0", "p1", "p2", "p3"].map((p) => (
          <Chip
            key={p}
            active={priorityFilter.has(p)}
            onClick={() => toggleSet("priorityFilter", p)}
          >
            {PRIORITY_LABELS[p]}
          </Chip>
        ))}
      </Section>

      <Section label="Lane">
        {PLAN.lanes.map((l) => (
          <Chip
            key={l.id}
            active={laneFilter.has(l.id)}
            onClick={() => toggleSet("laneFilter", l.id)}
          >
            {l.label}
          </Chip>
        ))}
      </Section>

      <Section label="Color By">
        {[
          ["status", "Status"],
          ["priority", "Priority"],
          ["lane", "Lane"],
          ["critical", "Critical Path"],
        ].map(([k, l]) => (
          <Chip key={k} active={colorBy === k} onClick={() => setColorBy(k)}>
            {l}
          </Chip>
        ))}
      </Section>

      <Section
        label="Schedule Overlay"
        info="Tints nodes by estimate density along the critical path."
      >
        {[
          ["off", "Off"],
          ["estimate", "Estimate"],
          ["slack", "Slack"],
        ].map(([k, l]) => (
          <Chip key={k} active={overlay === k} onClick={() => setOverlay(k)}>
            {l}
          </Chip>
        ))}
      </Section>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px dashed var(--color-border)",
        }}
      >
        <Button variant="ghost" onClick={clearFilters}>
          Clear Filters
        </Button>
        <Button variant="secondary">Fit Graph</Button>
      </div>
    </aside>
  );
}
window.Toolbar = Toolbar;
