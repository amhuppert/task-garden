// Editable UI components for Task Garden's "v2" (edit-enabled) milestone.
// Pure read-fidelity Atlas styling — no new color tokens, no icon library.
// All components consume the existing CSS variables and .atlas-* utility
// classes from /colors_and_type.css and the primitives loaded by data.jsx +
// Primitives.jsx.

const { useState: useES, useRef: useER, useEffect: useEE } = React;

const EC_STATUSES = [
  "planned",
  "ready",
  "blocked",
  "in_progress",
  "done",
  "future",
];
const EC_PRIORITIES = ["p0", "p1", "p2", "p3", "nice_to_have"];

// ──────────────────────────────────────────────────────────────────────────
// 1.  Glyphs — single-stroke hand-authored SVG, per the iconography rule.
// ──────────────────────────────────────────────────────────────────────────

const PencilGlyph = ({ size = 12, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    style={style}
    aria-hidden="true"
  >
    <path
      d="M2 12 L2.6 9.5 L9 3 L10.6 4.6 L4.2 11 L1.8 11.6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 3 L10.4 1.6 L12.4 3.6 L10.6 4.6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronGlyph = ({ size = 10, dir = "down", style }) => {
  const r = { down: 0, up: 180, left: 90, right: -90 }[dir];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      style={{ transform: `rotate(${r}deg)`, ...style }}
      aria-hidden="true"
    >
      <path
        d="M2 4 L5 7 L8 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const CloseGlyph = ({ size = 10, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="none"
    style={style}
    aria-hidden="true"
  >
    <path
      d="M2 2 L8 8 M8 2 L2 8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const PlusGlyph = ({ size = 10, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="none"
    style={style}
    aria-hidden="true"
  >
    <path
      d="M5 2 V8 M2 5 H8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────────
// 2.  Editable title — keeps the Cormorant face; underlines softly when
//     interactive. State variants: read / edit-idle / edit-focused.
// ──────────────────────────────────────────────────────────────────────────

function EditableTitle({ value, state = "edit-idle", onChange }) {
  const borderBottom =
    state === "edit-focused"
      ? "1px solid var(--color-moss)"
      : state === "edit-idle"
        ? "1px dashed color-mix(in oklab, var(--color-border-strong) 70%, transparent)"
        : "1px solid transparent";
  const bg =
    state === "edit-focused"
      ? "color-mix(in oklab, var(--color-lichen) 12%, transparent)"
      : "transparent";
  return (
    <div
      className="atlas-title"
      contentEditable={state !== "read"}
      suppressContentEditableWarning
      spellCheck={false}
      style={{
        fontSize: 22,
        lineHeight: 1.15,
        marginTop: 6,
        paddingBottom: 4,
        paddingLeft: 4,
        marginLeft: -4,
        paddingRight: 4,
        marginRight: -4,
        borderBottom,
        background: bg,
        borderRadius: 4,
        transition:
          "background 160ms var(--ease-atlas), border-color 160ms var(--ease-atlas)",
        outline: "none",
        caretColor: "var(--color-moss-deep)",
      }}
    >
      {value}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 3.  PickerChip — clickable display chip that opens a popover.  Same
//     visual rhythm as the existing read-only StatCard but tappable.
// ──────────────────────────────────────────────────────────────────────────

function PickerChip({ label, children, open, onClick, dirty, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: "var(--radius-md)",
        border: open
          ? "1px solid var(--color-moss)"
          : "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "8px 11px 9px",
        boxShadow: open
          ? "inset 0 1px 0 color-mix(in oklab, white 38%, transparent), 0 0 0 3px color-mix(in oklab, var(--color-lichen) 22%, transparent)"
          : "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
        cursor: "pointer",
        position: "relative",
        font: "inherit",
        color: "var(--color-foreground)",
        ...style,
      }}
    >
      <div
        className="atlas-kicker"
        style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}
      >
        {label}
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
              boxShadow:
                "0 0 0 2px color-mix(in oklab, var(--color-pollen) 28%, transparent)",
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {children}
        </span>
        <span
          style={{
            color: "var(--color-muted-foreground)",
            display: "inline-flex",
          }}
        >
          <ChevronGlyph size={9} dir={open ? "up" : "down"} />
        </span>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 4.  Popovers — float below the PickerChip.  Built as inline blocks so
//     they render nicely inside design-canvas artboards (no portals).
// ──────────────────────────────────────────────────────────────────────────

function Popover({ children, style }) {
  return (
    <div
      className="atlas-panel"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: 8,
        background: "color-mix(in oklab, var(--color-panel) 100%, white 6%)",
        boxShadow: "var(--shadow-float)",
        borderColor: "var(--color-border-strong)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatusOption({ status, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"atlas-chip" + (selected ? " atlas-chip-active" : "")}
      style={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 8,
        padding: "7px 10px",
        letterSpacing: "0.16em",
        textTransform: "none",
        fontSize: 11.5,
      }}
    >
      <StatusDot status={status} size={9} />
      <span
        style={{
          flex: 1,
          textAlign: "left",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          fontSize: 10.5,
          fontWeight: 600,
        }}
      >
        {STATUS_LABELS[status]}
      </span>
      {selected && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-primary-foreground)",
            opacity: 0.7,
          }}
        >
          current
        </span>
      )}
    </button>
  );
}

function StatusPopover({ current, style }) {
  return (
    <Popover
      style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}
    >
      <div
        className="atlas-kicker"
        style={{ fontSize: 9, padding: "4px 8px 6px" }}
      >
        Set status
      </div>
      {EC_STATUSES.map((s) => (
        <StatusOption key={s} status={s} selected={s === current} />
      ))}
    </Popover>
  );
}

function PriorityPopover({ current, style }) {
  return (
    <Popover
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 4,
        padding: 8,
        ...style,
      }}
    >
      <div
        className="atlas-kicker"
        style={{ fontSize: 9, padding: "4px 4px 4px", gridColumn: "1 / -1" }}
      >
        Set priority
      </div>
      {EC_PRIORITIES.map((p) => {
        const sel = p === current;
        return (
          <button
            key={p}
            type="button"
            className={"atlas-chip" + (sel ? " atlas-chip-active" : "")}
            style={{
              gridColumn: p === "nice_to_have" ? "1 / -1" : "auto",
              padding: "7px 8px",
              gap: 6,
              fontSize: 10.5,
              justifyContent: "flex-start",
              letterSpacing: "0.18em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: PRIORITY_COLOR[p],
                boxShadow: sel
                  ? "inset 0 0 0 1px color-mix(in oklab, white 40%, transparent)"
                  : "none",
              }}
            />
            {PRIORITY_LABELS[p]}
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                opacity: 0.55,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {EC_PRIORITY_NOTE[p]}
            </span>
          </button>
        );
      })}
    </Popover>
  );
}

const EC_PRIORITY_NOTE = {
  p0: "must",
  p1: "should",
  p2: "could",
  p3: "won't yet",
  nice_to_have: "—",
};

// ──────────────────────────────────────────────────────────────────────────
// 5.  Lane picker — segmented control (3 options fits naturally).
// ──────────────────────────────────────────────────────────────────────────

// Lane picker — a dropdown that scales to any number of lanes (the old
// 3-up segmented control didn't). Closed state mirrors PickerChip; open
// state drops a scrollable list keyed by each lane's accent color.
function LaneSegmented({ value, dirty, open }) {
  const current = PLAN.lanes.find((l) => l.id === value) || PLAN.lanes[0];
  const laneColor = (l) =>
    l.color
      ? l.color
      : {
          input: "var(--color-water)",
          domain: "var(--color-moss)",
          ui: "var(--color-pollen)",
        }[l.id] || "var(--color-iron)";
  return (
    <div style={{ position: "relative" }}>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Lane
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
      </div>
      <button
        type="button"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          border: open
            ? "1px solid var(--color-moss)"
            : "1px solid var(--color-border)",
          background: "var(--color-surface)",
          boxShadow: open
            ? "inset 0 1px 0 color-mix(in oklab, white 38%, transparent), 0 0 0 3px color-mix(in oklab, var(--color-lichen) 22%, transparent)"
            : "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
          cursor: "pointer",
          font: "inherit",
          color: "var(--color-foreground)",
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 3,
            background: laneColor(current),
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {current.label}
        </span>
        <span
          style={{
            color: "var(--color-muted-foreground)",
            display: "inline-flex",
          }}
        >
          <ChevronGlyph size={9} dir={open ? "up" : "down"} />
        </span>
      </button>
      {open && (
        <Popover
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 5,
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: 196,
            overflowY: "auto",
          }}
        >
          {PLAN.lanes.map((l) => {
            const active = l.id === value;
            return (
              <button
                key={l.id}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 9px",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  background: active
                    ? "color-mix(in oklab, var(--color-lichen) 20%, transparent)"
                    : "transparent",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: laneColor(l),
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    color: "var(--color-foreground)",
                  }}
                >
                  {l.label}
                </span>
                {active && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      opacity: 0.6,
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    current
                  </span>
                )}
              </button>
            );
          })}
        </Popover>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 6.  Estimate stepper — mono digits with day suffix.
// ──────────────────────────────────────────────────────────────────────────

function EstimateStepper({ value, dirty }) {
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Estimate
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          boxShadow:
            "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
          overflow: "hidden",
        }}
      >
        <button type="button" style={EC_stepBtn}>
          −
        </button>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 4,
            padding: "8px 0",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {value.toFixed(1)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-muted-foreground)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
            }}
          >
            days
          </span>
        </div>
        <button type="button" style={EC_stepBtn}>
          +
        </button>
      </div>
    </div>
  );
}

const EC_stepBtn = {
  width: 36,
  border: "none",
  cursor: "pointer",
  background: "transparent",
  color: "var(--color-muted-foreground)",
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  fontWeight: 600,
  borderLeft: "1px solid var(--color-border)",
  borderRight: "1px solid var(--color-border)",
};

// ──────────────────────────────────────────────────────────────────────────
// 7.  Tag editor — existing microchips gain an × on hover; "+ Add tag"
//     looks like an outlined microchip.  Input variant shown when active.
// ──────────────────────────────────────────────────────────────────────────

function TagEditor({ tags, adding, dirty }) {
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Tags
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {tags.map((t, i) => (
          <span
            key={t}
            className="atlas-microchip"
            style={{
              paddingRight: 4,
              gap: 4,
              background: "var(--color-surface)",
              borderColor:
                i === 0
                  ? "color-mix(in oklab, var(--color-border-strong) 60%, transparent)"
                  : "color-mix(in oklab, var(--color-border-strong) 30%, transparent)",
            }}
          >
            #{t}
            <button
              type="button"
              style={{
                border: "none",
                background: "transparent",
                padding: "2px 4px",
                borderRadius: 4,
                cursor: "pointer",
                color: "var(--color-muted-foreground)",
                display: "inline-flex",
                alignItems: "center",
              }}
              aria-label={"Remove " + t}
            >
              <CloseGlyph size={8} />
            </button>
          </span>
        ))}
        {adding ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              borderRadius: 9999,
              border: "1px solid var(--color-moss)",
              background: "var(--color-surface)",
              padding: "2px 6px 2px 8px",
              boxShadow:
                "0 0 0 3px color-mix(in oklab, var(--color-lichen) 22%, transparent)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "var(--color-muted-foreground)",
              }}
            >
              #
            </span>
            <input
              autoFocus
              placeholder="schema"
              defaultValue="schem"
              style={{
                width: 64,
                border: "none",
                outline: "none",
                background: "transparent",
                font: "var(--text-mono)",
                fontSize: 10,
                padding: "3px 0",
                color: "var(--color-foreground)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            />
          </span>
        ) : (
          <button
            type="button"
            className="atlas-microchip"
            style={{
              border:
                "1px dashed color-mix(in oklab, var(--color-border-strong) 55%, transparent)",
              background: "transparent",
              color: "var(--color-muted-foreground)",
              cursor: "pointer",
              display: "inline-flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <PlusGlyph size={8} /> Add tag
          </button>
        )}
      </div>
      {adding && (
        <Popover style={{ marginTop: 6, padding: 4 }}>
          {["schema", "validation", "zod", "yaml-parser"].map((s) => (
            <button
              key={s}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "6px 8px",
                border: "none",
                background: "transparent",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: s.startsWith("schem")
                  ? "var(--color-foreground)"
                  : "var(--color-muted-foreground)",
                textTransform: "uppercase",
                background:
                  s === "schema"
                    ? "color-mix(in oklab, var(--color-lichen) 18%, transparent)"
                    : "transparent",
              }}
            >
              <span style={{ color: "var(--color-moss-deep)" }}>#</span>
              {s}
              {s === "schema" && (
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    letterSpacing: 0,
                    textTransform: "none",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                    style={{ color: "var(--color-foreground)", flexShrink: 0 }}
                  >
                    <path
                      d="M11 3.5 V6.5 A1.5 1.5 0 0 1 9.5 8 H4 M6.5 5.5 L4 8 L6.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      shapeRendering="geometricPrecision"
                    />
                  </svg>
                  to add
                </span>
              )}
            </button>
          ))}
        </Popover>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 8.  Dependency editor — list of refs with × on each, plus an inline
//     typeahead row for adding more.
// ──────────────────────────────────────────────────────────────────────────

function DependencyEditor({ label, ids, addOpen, dirty, derived, error }) {
  // `derived=true` indicates this list is computed from other items' depends_on
  // (i.e. Dependents). Editing requires opening the *other* item, so the add
  // affordance differs.
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {label}
        {derived && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              letterSpacing: "0.12em",
              color: "var(--color-iron)",
              padding: "1px 4px",
              borderRadius: 3,
              border:
                "1px solid color-mix(in oklab, var(--color-iron) 35%, transparent)",
            }}
          >
            DERIVED
          </span>
        )}
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: 0,
            color: "var(--color-muted-foreground)",
            textTransform: "none",
          }}
        >
          {ids.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {ids.map((id) => {
          const ref = PLAN.items.find((i) => i.id === id);
          if (!ref) return null;
          return (
            <div
              key={id}
              style={{
                padding: "7px 6px 7px 10px",
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
                  fontSize: 9.5,
                  color: "var(--color-muted-foreground)",
                }}
              >
                {ref.id}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 11.5,
                  color: "var(--color-foreground)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ref.title}
              </span>
              <button
                type="button"
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "4px 5px",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "var(--color-muted-foreground)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                aria-label="Unlink"
              >
                <CloseGlyph size={9} />
              </button>
            </div>
          );
        })}
        {addOpen ? (
          <div style={{ position: "relative" }}>
            <div
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                border: "1px solid var(--color-moss)",
                background: "var(--color-surface)",
                boxShadow:
                  "0 0 0 3px color-mix(in oklab, var(--color-lichen) 22%, transparent)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                style={{
                  color: "var(--color-muted-foreground)",
                  flexShrink: 0,
                }}
              >
                <path
                  d="M3.5 2.5 V8.5 H11 M8 5.5 L11 8.5 L8 11.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  shapeRendering="geometricPrecision"
                />
              </svg>
              <input
                autoFocus
                placeholder="Search items…"
                defaultValue="analy"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  font: "var(--text-body)",
                  fontSize: 12,
                  color: "var(--color-foreground)",
                }}
              />
              <kbd
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 5,
                  border: "1px solid var(--color-border-strong)",
                  background: "var(--color-surface)",
                  color: "var(--color-foreground)",
                  boxShadow:
                    "inset 0 -1px 0 color-mix(in oklab, var(--color-bark) 14%, transparent)",
                  letterSpacing: 0,
                  textTransform: "lowercase",
                  lineHeight: 1,
                }}
              >
                esc
              </kbd>
            </div>
            <Popover
              style={{
                marginTop: 6,
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {[
                { id: "analysis-engine", match: true },
                { id: "reference-resolver", match: false },
                { id: "plan-graph-canvas", match: false },
              ].map((o) => {
                const r = PLAN.items.find((i) => i.id === o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      width: "100%",
                      padding: "6px 8px",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: o.match
                        ? "color-mix(in oklab, var(--color-lichen) 20%, transparent)"
                        : "transparent",
                      textAlign: "left",
                    }}
                  >
                    <StatusDot status={r.status} size={6} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      {r.id}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: "var(--color-foreground)",
                      }}
                    >
                      {r.title}
                    </span>
                    {o.match && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        style={{
                          color: "var(--color-foreground)",
                          flexShrink: 0,
                        }}
                      >
                        <path
                          d="M11 3.5 V6.5 A1.5 1.5 0 0 1 9.5 8 H4 M6.5 5.5 L4 8 L6.5 10.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          shapeRendering="geometricPrecision"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </Popover>
          </div>
        ) : derived ? (
          <button
            type="button"
            style={{
              padding: "7px 10px",
              borderRadius: 10,
              border:
                "1px dashed color-mix(in oklab, var(--color-border-strong) 55%, transparent)",
              background: "transparent",
              color: "var(--color-muted-foreground)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
            }}
          >
            <PlusGlyph size={9} />
            Branch new dependent…
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                opacity: 0.7,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              creates new item
            </span>
          </button>
        ) : (
          <button
            type="button"
            style={{
              padding: "7px 10px",
              borderRadius: 10,
              border:
                "1px dashed color-mix(in oklab, var(--color-border-strong) 55%, transparent)",
              background: "transparent",
              color: "var(--color-muted-foreground)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
            }}
          >
            <PlusGlyph size={9} />
            Link {label.toLowerCase()}…
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 9.  Write-through status — save-on-blur feedback for the chosen model.
//     Edits commit per-field on blur and round-trip through the local CLI,
//     which validates with Zod and writes plan.taskgarden.yaml. There is no
//     explicit Save button and no batch "unsaved" state — only the lifecycle
//     of an individual write: synced → saving → saved, or → error.
// ──────────────────────────────────────────────────────────────────────────

function WriteThroughStatus({
  state = "synced",
  file = "plan.taskgarden.yaml",
}) {
  // state: synced | saving | saved | error
  const cfg = {
    synced: { label: "Synced · " + file, dot: "var(--color-status-done)" },
    saving: { label: "Writing " + file + "…", dot: "var(--color-water)" },
    saved: { label: "Saved · just now", dot: "var(--color-status-done)" },
    error: { label: "Write failed — CLI offline", dot: "var(--color-petal)" },
  }[state];
  const isErr = state === "error";
  return (
    <div
      style={{
        padding: isErr ? "10px 14px" : "10px 16px",
        borderTop:
          "1px solid " +
          (isErr
            ? "color-mix(in oklab, var(--color-petal) 45%, var(--color-border))"
            : "var(--color-border)"),
        background: isErr
          ? "color-mix(in oklab, var(--color-petal) 9%, var(--color-panel-strong))"
          : "color-mix(in oklab, var(--color-panel) 88%, transparent)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        backdropFilter: "blur(10px)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          flexShrink: 0,
          background: cfg.dot,
          boxShadow:
            state === "saving"
              ? "0 0 0 3px color-mix(in oklab, var(--color-water) 24%, transparent)"
              : "none",
          animation:
            state === "saving"
              ? "canopy-pulse 1.6s var(--ease-atlas) infinite"
              : "none",
        }}
      />
      <span
        style={{
          flex: 1,
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isErr ? "var(--color-petal)" : "var(--color-muted-foreground)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {cfg.label}
      </span>
      {isErr && (
        <button
          type="button"
          className="atlas-chip"
          style={{
            padding: "4px 9px",
            fontSize: 10,
            letterSpacing: "0.16em",
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Per-field commit chip — shown inline next to a field while its blur-write
// is in flight or just landed. Disappears back to nothing once synced.
function FieldSaveIndicator({ state }) {
  // state: saving | saved
  if (state === "saving") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "var(--font-mono)",
          fontSize: 8.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-water)",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--color-water)",
            animation: "canopy-pulse 1.6s var(--ease-atlas) infinite",
          }}
        />
        Saving
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--color-status-done)",
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 5.2 L4 7.2 L8 2.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Saved
    </span>
  );
}

// Explicit create/cancel footer — used ONLY by the new-item flow, where an
// item must be committed once (it has nothing to save-on-blur into yet).
function CreateBar({ ready = true }) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--color-panel) 60%, transparent), var(--color-panel-strong))",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--color-muted-foreground)",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: ready
              ? "var(--color-status-done)"
              : "var(--color-iron)",
          }}
        />
        {ready ? "Validates · ready to add" : "Title required"}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="atlas-button atlas-button-secondary"
          style={{ flex: 1, padding: "9px 12px", fontSize: 12.5 }}
        >
          Cancel
        </button>
        <button
          className="atlas-button atlas-button-primary"
          disabled={!ready}
          style={{
            flex: 1.4,
            padding: "9px 12px",
            fontSize: 12.5,
            opacity: ready ? 1 : 0.45,
            cursor: ready ? "pointer" : "not-allowed",
          }}
        >
          Add to plan
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 10. EditableDetailsPanel — the chosen model: hover-reveal + save-on-blur.
//     The panel reads as a viewer; editability reveals on hover/focus, and
//     each field commits independently on blur via CLI write-through.
// ──────────────────────────────────────────────────────────────────────────

// Flat, read-only-looking field — used by the hover-reveal variant so the
// panel reads as a viewer until you reach for something. Label sits above a
// plain value, no input chrome.
function FlatField({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <div className="atlas-kicker" style={{ fontSize: 9, marginBottom: 5 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-foreground)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          minHeight: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EditableDetailsPanel({
  reveal = "status",
  fieldSave = null,
  footerState = "synced",
  openPopover = null,
}) {
  // The in-progress, P0 item — most pedagogically rich state.
  const item = PLAN.items.find((i) => i.id === "plan-schema");
  const lane = PLAN.lanes.find((l) => l.id === item.lane);
  const upstream = PLAN.deps.filter(([, t]) => t === item.id).map(([f]) => f);
  const downstream = PLAN.deps.filter(([f]) => f === item.id).map(([, t]) => t);

  // The Status field is the demo surface for the reveal + blur-write lifecycle.
  const statusRevealed = reveal === "status" || !!fieldSave;

  return (
    <aside
      style={{
        width: 320,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--color-border)",
        background:
          "linear-gradient(180deg, var(--color-panel), var(--color-panel-strong))",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* tabs */}
        <nav
          style={{
            display: "flex",
            gap: 4,
            padding: 3,
            background: "var(--color-surface-muted)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
          }}
        >
          {[
            ["details", "Details"],
            ["insights", "Insights"],
          ].map(([k, l], i) => (
            <button
              key={k}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 9,
                border:
                  "1px solid " +
                  (i === 0 ? "var(--color-border-strong)" : "transparent"),
                background: i === 0 ? "var(--color-surface)" : "transparent",
                color:
                  i === 0
                    ? "var(--color-foreground)"
                    : "var(--color-muted-foreground)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: i === 0 ? "var(--shadow-specimen)" : "none",
                fontFamily: "var(--font-sans)",
              }}
            >
              {l}
            </button>
          ))}
        </nav>

        {/* header — no Edit button: editing is ambient. A quiet hint tells
            the user fields are editable in place. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span className="atlas-kicker">Work Item Details</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-muted-foreground)",
            }}
          >
            <PencilGlyph size={10} /> Hover a field to edit
          </span>
        </div>

        {/* title — read by default; reveals on hover */}
        <div>
          <EditableTitle
            value="Plan Schema Validation"
            state={reveal === "title" ? "edit-focused" : "read"}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--color-muted-foreground)",
              marginTop: 4,
            }}
          >
            {item.id} · seq 04
          </div>
        </div>

        {/* 2×2 field grid — flat values, Status caught mid-interaction */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            position: "relative",
          }}
        >
          {/* Status — revealed (hovered / editing) */}
          <div style={{ position: "relative" }}>
            <div
              className="atlas-kicker"
              style={{
                fontSize: 9,
                marginBottom: 5,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              Status
              {fieldSave ? (
                <span style={{ marginLeft: "auto" }}>
                  <FieldSaveIndicator state={fieldSave} />
                </span>
              ) : (
                statusRevealed && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 8,
                      letterSpacing: "0.1em",
                      color: "var(--color-moss-deep)",
                    }}
                  >
                    ◂ hover
                  </span>
                )
              )}
            </div>
            {statusRevealed ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 9px",
                  margin: "-6px -9px",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--color-moss)",
                  background:
                    "color-mix(in oklab, var(--color-lichen) 14%, transparent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <StatusDot status={item.status} size={9} />
                <span>{STATUS_LABELS[item.status]}</span>
                <ChevronGlyph
                  size={9}
                  style={{ color: "var(--color-muted-foreground)" }}
                />
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  minHeight: 18,
                }}
              >
                <StatusDot status={item.status} size={9} />
                <span>{STATUS_LABELS[item.status]}</span>
              </div>
            )}
            {openPopover === "status" && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: -6,
                  width: 240,
                  zIndex: 5,
                }}
              >
                <StatusPopover current={item.status} />
              </div>
            )}
          </div>
          {/* Priority — flat */}
          <FlatField label="Priority">
            <PriorityPill priority={item.priority} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-muted-foreground)",
              }}
            >
              must
            </span>
          </FlatField>
          {/* Estimate — flat */}
          <FlatField label="Estimate">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>
              2.5
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--color-muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
              }}
            >
              days
            </span>
          </FlatField>
          {/* Lane — flat */}
          <FlatField label="Lane">
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: "var(--color-moss)",
              }}
            />
            {lane.label}
          </FlatField>
        </div>

        {/* tags — flat microchips */}
        <div>
          <div
            className="atlas-kicker"
            style={{ fontSize: 9, marginBottom: 8 }}
          >
            Tags
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[...item.tags, "validation"].map((t) => (
              <span key={t} className="atlas-microchip">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* deps — flat rows, no add affordance until hovered */}
        {[
          ["Dependencies", upstream, false],
          ["Dependents", downstream, true],
        ].map(([label, ids, derived]) => (
          <div key={label}>
            <div
              className="atlas-kicker"
              style={{
                fontSize: 9,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {label}
              {derived && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8.5,
                    letterSpacing: "0.12em",
                    color: "var(--color-iron)",
                    padding: "1px 4px",
                    borderRadius: 3,
                    border:
                      "1px solid color-mix(in oklab, var(--color-iron) 35%, transparent)",
                  }}
                >
                  DERIVED
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-muted-foreground)",
                }}
              >
                {ids.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {ids.map((id) => {
                const ref = PLAN.items.find((i) => i.id === id);
                if (!ref) return null;
                return (
                  <div
                    key={id}
                    style={{
                      padding: "7px 10px",
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
                        fontSize: 9.5,
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      {ref.id}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11.5,
                        color: "var(--color-foreground)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ref.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* footer — write-through status; no save button, no batch state */}
      <WriteThroughStatus state={footerState} />
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 12. NodeQuickEdit — minimal popover that appears above a selected node,
//     for rapid status / title changes without opening the side rail.
// ──────────────────────────────────────────────────────────────────────────

function NodeQuickEdit() {
  const item = PLAN.items.find((i) => i.id === "analysis-engine");
  return (
    <div
      style={{
        position: "relative",
        width: 440,
        height: 280,
        background: "var(--color-background)",
        backgroundImage: `
                    linear-gradient(to right, var(--color-grid) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
        borderRadius: 0,
        overflow: "hidden",
        padding: 24,
      }}
    >
      {/* popover */}
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 28,
          width: 304,
          zIndex: 3,
        }}
      >
        <div
          className="atlas-panel"
          style={{
            padding: 12,
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-float)",
            borderColor: "var(--color-border-strong)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span className="atlas-kicker" style={{ fontSize: 9 }}>
              Quick edit
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--color-muted-foreground)",
              }}
            >
              {item.id}
            </span>
          </div>
          <input
            defaultValue={item.title}
            style={{
              font: "var(--text-display-sm)",
              fontSize: 18,
              border: "none",
              outline: "none",
              padding: "2px 0",
              borderBottom: "1px solid var(--color-moss)",
              background: "transparent",
              color: "var(--color-foreground)",
            }}
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            <button
              className="atlas-chip"
              style={{ padding: "6px 8px", fontSize: 10 }}
            >
              <StatusDot status="blocked" size={8} />
              <span style={{ flex: 1, textAlign: "left" }}>Blocked</span>
              <ChevronGlyph size={8} />
            </button>
            <button
              className="atlas-chip"
              style={{ padding: "6px 8px", fontSize: 10 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: PRIORITY_COLOR.p0,
                }}
              />
              <span style={{ flex: 1, textAlign: "left" }}>P0</span>
              <ChevronGlyph size={8} />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingTop: 4,
              borderTop: "1px dashed var(--color-border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              ↵ save · esc close
            </span>
            <button
              className="atlas-button atlas-button-secondary"
              style={{
                marginLeft: "auto",
                padding: "5px 9px",
                fontSize: 11,
              }}
            >
              Open in panel ↗
            </button>
          </div>
        </div>
        {/* small notch */}
        <div
          style={{
            position: "absolute",
            left: 32,
            bottom: -7,
            width: 12,
            height: 12,
            background: "var(--color-card)",
            borderLeft: "1px solid var(--color-border-strong)",
            borderBottom: "1px solid var(--color-border-strong)",
            transform: "rotate(-45deg)",
          }}
        />
      </div>

      {/* the node beneath, in selected state */}
      <div
        className="atlas-node atlas-node-selected"
        style={{
          position: "absolute",
          left: 64,
          top: 168,
          width: 224,
          padding: "12px 14px",
          borderLeftWidth: 3,
          borderLeftColor: STATUS_COLOR.blocked,
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
            {item.id}
          </span>
          <PriorityPill priority={item.priority} />
        </div>
        <div
          className="atlas-title"
          style={{ fontSize: 15, marginTop: 6, lineHeight: 1.2 }}
        >
          {item.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <StatusDot status={item.status} size={7} />
            <span
              style={{ fontSize: 11, color: "var(--color-muted-foreground)" }}
            >
              {STATUS_LABELS[item.status]}
            </span>
          </span>
          <span className="atlas-microchip">{item.estimate}d</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 13. NewItemForm — empty-state edit panel for creating a new work item.
// ──────────────────────────────────────────────────────────────────────────

function NewItemForm() {
  return (
    <aside
      style={{
        width: 320,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--color-border)",
        background:
          "linear-gradient(180deg, var(--color-panel), var(--color-panel-strong))",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span className="atlas-kicker">New Work Item</span>
          <button
            className="atlas-chip"
            style={{
              padding: "4px 8px",
              fontSize: 10,
              letterSpacing: "0.22em",
            }}
          >
            <CloseGlyph size={9} /> Cancel
          </button>
        </div>

        <div>
          <div
            className="atlas-kicker"
            style={{ fontSize: 9, marginBottom: 4 }}
          >
            Title
          </div>
          <div
            className="atlas-title"
            contentEditable
            suppressContentEditableWarning
            style={{
              fontSize: 22,
              lineHeight: 1.15,
              padding: "4px 6px",
              margin: "0 -6px",
              borderBottom: "1px solid var(--color-moss)",
              background:
                "color-mix(in oklab, var(--color-lichen) 12%, transparent)",
              borderRadius: 4,
              color: "var(--color-foreground)",
              outline: "none",
              minHeight: 28,
            }}
          >
            Surface Critical Path
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-muted-foreground)",
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>surface-critical-path</span>
            <span style={{ opacity: 0.4 }}>· auto-id</span>
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <PickerChip label="Status">
            <StatusDot status="planned" size={9} />
            <span>Planned</span>
          </PickerChip>
          <PickerChip label="Priority">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: PRIORITY_COLOR.p2,
              }}
            />
            <span>P2</span>
          </PickerChip>
          <EstimateStepper value={1.5} />
          <LaneSegmented value="ui" />
        </div>

        <TagEditor tags={["analysis"]} adding={false} />

        <DependencyEditor
          label="Upstream"
          ids={["analysis-engine"]}
          addOpen={false}
        />
        <DependencyEditor label="Downstream" ids={[]} addOpen={false} />
      </div>

      <CreateBar ready />
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 14. Schema-complete field editors — Summary, Notes, Deliverables / Reuse,
//     Links.  All correspond to fields on TaskGardenWorkItem that the
//     existing read-only panel already surfaces.
// ──────────────────────────────────────────────────────────────────────────

function SummaryEditor({ value, dirty }) {
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Summary
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-muted-foreground)",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {value.length} / 240
        </span>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        style={{
          minHeight: 56,
          padding: "9px 11px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          boxShadow:
            "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--color-foreground)",
          outline: "none",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--color-muted-foreground)",
          marginTop: 6,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        What this item delivers — and why
      </div>
    </div>
  );
}

function NotesEditor({ value, dirty, focused = false }) {
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Notes
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 8.5,
            letterSpacing: "0.12em",
            color: "var(--color-iron)",
            padding: "1px 4px",
            borderRadius: 3,
            border:
              "1px solid color-mix(in oklab, var(--color-iron) 35%, transparent)",
          }}
        >
          OPTIONAL
        </span>
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        style={{
          minHeight: 96,
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          border:
            "1px solid " +
            (focused ? "var(--color-moss)" : "var(--color-border)"),
          background: "var(--color-surface)",
          boxShadow: focused
            ? "inset 0 1px 0 color-mix(in oklab, white 38%, transparent), 0 0 0 3px color-mix(in oklab, var(--color-lichen) 22%, transparent)"
            : "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "var(--color-foreground)",
          whiteSpace: "pre-wrap",
          outline: "none",
        }}
      >
        {value || ""}
      </div>
    </div>
  );
}

// String-list editor — used for deliverables & reuse_candidates.  Bullets
// match the read-only panel's "·" and "↺" markers.
function StringListEditor({
  label,
  items,
  bulletGlyph = "·",
  placeholder,
  dirty,
}) {
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {label}
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-muted-foreground)",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {items.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "7px 8px 7px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <span
              style={{
                color: "var(--color-muted-foreground)",
                fontFamily:
                  bulletGlyph === "↺" ? "var(--font-mono)" : "inherit",
                fontSize: 13,
                lineHeight: 1.5,
                marginTop: 1,
                width: 12,
                flexShrink: 0,
                textAlign: "center",
              }}
            >
              {bulletGlyph}
            </span>
            <span
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "var(--color-foreground)",
                outline: "none",
              }}
            >
              {s}
            </span>
            <button
              type="button"
              aria-label="Remove"
              style={{
                border: "none",
                background: "transparent",
                padding: "3px 4px",
                borderRadius: 5,
                cursor: "pointer",
                color: "var(--color-muted-foreground)",
                display: "inline-flex",
                alignItems: "center",
                marginTop: 2,
                flexShrink: 0,
              }}
            >
              <CloseGlyph size={9} />
            </button>
          </div>
        ))}
        <button
          type="button"
          style={{
            padding: "7px 10px",
            borderRadius: 10,
            border:
              "1px dashed color-mix(in oklab, var(--color-border-strong) 55%, transparent)",
            background: "transparent",
            color: "var(--color-muted-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 11.5,
            fontFamily: "var(--font-sans)",
            textAlign: "left",
          }}
        >
          <span style={{ width: 12, textAlign: "center" }}>
            <PlusGlyph size={9} />
          </span>
          {placeholder}
        </button>
      </div>
    </div>
  );
}

// Links editor — schema `{label, href}[]` where href is URL or .md path.
function LinksEditor({ links, dirty }) {
  return (
    <div>
      <div
        className="atlas-kicker"
        style={{
          fontSize: 9,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Links
        {dirty && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-pollen)",
            }}
          />
        )}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-muted-foreground)",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {links.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {links.map((l, i) => {
          const isDoc = l.href.endsWith(".md");
          const kindLabel = isDoc ? "DOC" : "URL";
          const kindColor = isDoc
            ? "var(--color-moss-deep)"
            : "var(--color-water)";
          return (
            <div
              key={i}
              style={{
                padding: "7px 8px 7px 10px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  padding: "2px 5px",
                  borderRadius: 3,
                  letterSpacing: "0.16em",
                  color: kindColor,
                  border: `1px solid color-mix(in oklab, ${kindColor} 38%, transparent)`,
                  flexShrink: 0,
                }}
              >
                {kindLabel}
              </span>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-foreground)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {l.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    color: "var(--color-muted-foreground)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {l.href}
                </span>
              </div>
              <button
                type="button"
                aria-label="Remove"
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "4px 5px",
                  borderRadius: 5,
                  cursor: "pointer",
                  color: "var(--color-muted-foreground)",
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <CloseGlyph size={9} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          style={{
            padding: "7px 10px",
            borderRadius: 10,
            border:
              "1px dashed color-mix(in oklab, var(--color-border-strong) 55%, transparent)",
            background: "transparent",
            color: "var(--color-muted-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontSize: 11.5,
            fontFamily: "var(--font-sans)",
          }}
        >
          <PlusGlyph size={9} /> Add link…
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              opacity: 0.7,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            URL or .md path
          </span>
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 15. Chip-style picker — alternative to PickerChip that mirrors the
//     existing read-only Status/Priority chip treatment exactly.  Toggles
//     open like a real <select>.  Useful where you want editing to disappear
//     visually until interacted with.
// ──────────────────────────────────────────────────────────────────────────

function StatusChipPicker({ status, open }) {
  const c = STATUS_COLOR[status];
  return (
    <button
      type="button"
      className="atlas-chip"
      style={{
        borderColor: open ? c : `color-mix(in oklab, ${c} 46%, transparent)`,
        color: c,
        gap: 6,
        boxShadow: open
          ? `0 0 0 3px color-mix(in oklab, ${c} 18%, transparent)`
          : "none",
      }}
    >
      <StatusDot status={status} size={7} />
      {STATUS_LABELS[status]}
      <ChevronGlyph size={8} dir={open ? "up" : "down"} />
    </button>
  );
}

function PriorityChipPicker({ priority, open }) {
  const c = PRIORITY_COLOR[priority];
  return (
    <button
      type="button"
      className="atlas-chip"
      style={{
        borderColor: open ? c : `color-mix(in oklab, ${c} 46%, transparent)`,
        color: c,
        gap: 6,
        boxShadow: open
          ? `0 0 0 3px color-mix(in oklab, ${c} 18%, transparent)`
          : "none",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
      {PRIORITY_LABELS[priority]}
      <ChevronGlyph size={8} dir={open ? "up" : "down"} />
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 16. DepPickerError — cycle / self-dependency feedback in the typeahead.
//     Mirrors the schema's "cycle_detected" / "self_dependency" codes.
// ──────────────────────────────────────────────────────────────────────────

function DepPickerError({ kind = "cycle" }) {
  const copy = {
    cycle: {
      title: "Would create a cycle",
      detail:
        "Adding analysis-engine here closes a loop: plan-schema → analysis-engine → plan-schema.",
      code: "cycle_detected",
    },
    self: {
      title: "Self-dependency",
      detail: "An item cannot depend on itself.",
      code: "self_dependency",
    },
    duplicate: {
      title: "Already linked",
      detail: "This dependency is already in the list.",
      code: "duplicate_dependency",
    },
  }[kind];
  return (
    <div
      style={{
        padding: "9px 11px",
        borderRadius: 10,
        border:
          "1px solid color-mix(in oklab, var(--color-petal) 50%, transparent)",
        background:
          "color-mix(in oklab, var(--color-petal) 10%, var(--color-surface))",
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
      }}
    >
      <span
        style={{
          marginTop: 2,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--color-petal)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: 12, fontWeight: 600, color: "var(--color-petal)" }}
        >
          {copy.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-muted-foreground)",
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {copy.detail}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-muted-foreground)",
            marginTop: 4,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {copy.code}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 17. PlanOverviewEditor — plan-level fields: title, summary, last_updated,
//     references[].  Reached via the InfoPopover button in the left rail.
// ──────────────────────────────────────────────────────────────────────────

function PlanOverviewEditor() {
  return (
    <div
      style={{
        width: 340,
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border-strong)",
        background:
          "linear-gradient(180deg, var(--color-panel), var(--color-panel-strong))",
        backdropFilter: "blur(20px)",
        boxShadow: "var(--shadow-atlas)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="atlas-kicker">Plan Overview</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-status-done)",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 5.2 L4 7.2 L8 2.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Saved
          </span>
          <button
            type="button"
            className="atlas-chip"
            aria-label="Close"
            style={{ padding: "5px 7px", fontSize: 10 }}
          >
            <CloseGlyph size={9} />
          </button>
        </span>
      </div>

      <div>
        <div className="atlas-kicker" style={{ fontSize: 9, marginBottom: 4 }}>
          Title
        </div>
        <div
          className="atlas-title"
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: 22,
            lineHeight: 1.15,
            padding: "4px 6px",
            margin: "0 -6px",
            borderBottom: "1px solid var(--color-moss)",
            background:
              "color-mix(in oklab, var(--color-lichen) 12%, transparent)",
            borderRadius: 4,
            outline: "none",
          }}
        >
          {PLAN.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-muted-foreground)",
          }}
        >
          <span>plan_id · task-garden-v1</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>last_updated · 2026-05-27</span>
        </div>
      </div>

      <SummaryEditor value={PLAN.summary} dirty />

      <div>
        <div
          className="atlas-kicker"
          style={{
            fontSize: 9,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          Plan References
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--color-muted-foreground)",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            2
          </span>
        </div>
        <LinksEditor
          links={[
            {
              label: "Implementation plan",
              href: "memory-bank/implementation-plan.md",
            },
            {
              label: "Atlas design system",
              href: "memory-bank/botanical-systems-atlas-design-system.md",
            },
          ]}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 18. Lane editor — optional fields `description` and `color` on each lane.
//     Inline within the lane-band header.
// ──────────────────────────────────────────────────────────────────────────

function LaneInlineEditor() {
  return (
    <div
      style={{
        width: 360,
        padding: 14,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-specimen)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="atlas-kicker">Lane</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "var(--color-muted-foreground)",
          }}
        >
          slug · domain
        </span>
      </div>
      <div
        className="atlas-title"
        contentEditable
        suppressContentEditableWarning
        style={{
          fontSize: 18,
          lineHeight: 1.15,
          padding: "2px 4px",
          margin: "0 -4px",
          borderBottom:
            "1px dashed color-mix(in oklab, var(--color-border-strong) 60%, transparent)",
          outline: "none",
          color: "var(--color-foreground)",
        }}
      >
        Domain
      </div>
      <div>
        <div className="atlas-kicker" style={{ fontSize: 9, marginBottom: 5 }}>
          Description · optional
        </div>
        <div
          contentEditable
          suppressContentEditableWarning
          style={{
            padding: "7px 10px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--color-foreground)",
            outline: "none",
          }}
        >
          Schema validation, reference resolution, and analysis.
        </div>
      </div>
      <div>
        <div className="atlas-kicker" style={{ fontSize: 9, marginBottom: 8 }}>
          Accent color · optional
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { name: "moss", v: "var(--color-moss)", active: true },
            { name: "water", v: "var(--color-water)", active: false },
            { name: "sage", v: "var(--color-sage)", active: false },
            { name: "pollen", v: "var(--color-pollen)", active: false },
            { name: "petal", v: "var(--color-petal)", active: false },
            { name: "iron", v: "var(--color-iron)", active: false },
            { name: "none", v: null, active: false },
          ].map((c) => (
            <button
              key={c.name}
              type="button"
              aria-label={c.name}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: c.active
                  ? "2px solid var(--color-foreground)"
                  : "1px solid var(--color-border)",
                background: c.v ?? "var(--color-surface)",
                cursor: "pointer",
                padding: 0,
                position: "relative",
              }}
            >
              {!c.v && (
                <span
                  style={{
                    position: "absolute",
                    inset: 4,
                    background:
                      "linear-gradient(45deg, transparent 47%, var(--color-muted-foreground) 47% 53%, transparent 53%)",
                    borderRadius: "50%",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PencilGlyph,
  ChevronGlyph,
  CloseGlyph,
  PlusGlyph,
  EditableTitle,
  PickerChip,
  Popover,
  FlatField,
  StatusPopover,
  PriorityPopover,
  LaneSegmented,
  EstimateStepper,
  TagEditor,
  DependencyEditor,
  WriteThroughStatus,
  FieldSaveIndicator,
  CreateBar,
  EditableDetailsPanel,
  NodeQuickEdit,
  NewItemForm,
  SummaryEditor,
  NotesEditor,
  StringListEditor,
  LinksEditor,
  StatusChipPicker,
  PriorityChipPicker,
  DepPickerError,
  PlanOverviewEditor,
  LaneInlineEditor,
  EC_STATUSES,
  EC_PRIORITIES,
  EC_PRIORITY_NOTE,
});
