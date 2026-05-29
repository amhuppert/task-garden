// Small reusable primitives.
const { useState } = React;

const Kicker = ({ children, style }) => (
  <span className="atlas-kicker" style={style}>
    {children}
  </span>
);

const Chip = ({ active, onClick, children, disabled, style }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={"atlas-chip" + (active ? " atlas-chip-active" : "")}
    style={{
      ...(disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}),
      ...style,
    }}
  >
    {children}
  </button>
);

const Microchip = ({ children, tone, style }) => {
  const custom = tone
    ? {
        borderColor: `color-mix(in oklab, ${tone} 44%, transparent)`,
        color: tone,
      }
    : {};
  return (
    <span className="atlas-microchip" style={{ ...custom, ...style }}>
      {children}
    </span>
  );
};

const Button = ({ variant = "primary", children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={"atlas-button atlas-button-" + variant}
    style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}}
  >
    {children}
  </button>
);

const Field = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    className="atlas-field"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
  />
);

const StatusDot = ({ status, size = 8 }) => (
  <span
    aria-label={STATUS_LABELS[status]}
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: STATUS_COLOR[status],
      flexShrink: 0,
    }}
  />
);

const PriorityPill = ({ priority }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 6px",
      borderRadius: 9999,
      background: PRIORITY_COLOR[priority],
      color:
        priority === "p1" || priority === "p3"
          ? "var(--color-foreground)"
          : "var(--color-primary-foreground)",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      fontWeight: 700,
      lineHeight: 1,
    }}
  >
    {PRIORITY_LABELS[priority]}
  </span>
);

const Section = ({ label, info, trailing, children }) => (
  <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Kicker>
        {label}
        {info && (
          <span
            style={{
              marginLeft: 6,
              display: "inline-flex",
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "1px solid var(--color-border)",
              color: "var(--color-muted-foreground)",
              fontSize: 9,
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              cursor: "help",
            }}
            title={info}
          >
            i
          </span>
        )}
      </Kicker>
      {trailing && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-muted-foreground)",
          }}
        >
          {trailing}
        </span>
      )}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
  </section>
);

Object.assign(window, {
  Kicker,
  Chip,
  Microchip,
  Button,
  Field,
  StatusDot,
  PriorityPill,
  Section,
});
