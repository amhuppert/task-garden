// Artboards — composition of the edit-mode components onto the DesignCanvas.

function ArtboardShell({ children, bg = "var(--color-background)" }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        backgroundImage: `
        linear-gradient(to right, var(--color-grid) 1px, transparent 1px),
        linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px),
        radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 22%, transparent), transparent 32%)`,
        backgroundSize: "32px 32px, 32px 32px, 100% 100%",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

// A standalone wrapper for popover close-up artboards.
function CloseupShell({ children, label, hint }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--color-background)",
        backgroundImage: `radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 18%, transparent), transparent 40%)`,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
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
          {label}
        </span>
        {hint && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--color-muted-foreground)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas
      title="Task Garden v2 · Edit Components"
      subtitle="Editing model: hover-reveal with save-on-blur, persisted through CLI write-through to plan.taskgarden.yaml. Field editors, in-graph quick edit, new-item creation, and the full schema-complete field set."
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1 — The editing model                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="model"
        title="Editing model · hover-reveal + save-on-blur"
        subtitle="The Details panel reads as a viewer. Editability reveals on hover/focus (here: Status), and every field commits independently the moment it loses focus — round-tripped through the local CLI into the source YAML. No Edit button, no Save button, no batch 'unsaved' state."
      >
        <DCArtboard
          id="model-resting"
          label="Resting · Status revealed on hover"
          width={360}
          height={900}
        >
          <ArtboardShell>
            <EditableDetailsPanel reveal="status" footerState="synced" />
          </ArtboardShell>
        </DCArtboard>

        <DCArtboard
          id="model-saving"
          label="On blur · field writing through"
          width={360}
          height={900}
        >
          <ArtboardShell>
            <EditableDetailsPanel fieldSave="saving" footerState="saving" />
          </ArtboardShell>
        </DCArtboard>

        <DCArtboard
          id="model-picker"
          label="Editing · status picker open"
          width={360}
          height={900}
        >
          <ArtboardShell>
            <EditableDetailsPanel
              reveal="status"
              openPopover="status"
              footerState="synced"
            />
          </ArtboardShell>
        </DCArtboard>
      </DCSection>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2 — Field pickers, close-ups                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="pickers"
        title="Field editors"
        subtitle="Each pickable field at rest, focused, and in its open state. All chips reuse the existing .atlas-chip / .atlas-chip-active treatment so the editing surface feels native to the read-only one."
      >
        <DCArtboard
          id="pick-status"
          label="Status · popover"
          width={360}
          height={420}
        >
          <CloseupShell label="Status picker" hint="6 OPTIONS">
            <div
              style={{
                width: 260,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <PickerChip label="Status" open>
                <StatusDot status="in_progress" size={9} />
                <span>In Progress</span>
              </PickerChip>
              <StatusPopover current="in_progress" />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="pick-priority"
          label="Priority · popover"
          width={360}
          height={420}
        >
          <CloseupShell label="Priority picker" hint="P0–NTH">
            <div
              style={{
                width: 260,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <PickerChip label="Priority" open>
                <PriorityPill priority="p0" />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  must
                </span>
              </PickerChip>
              <PriorityPopover current="p0" />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="pick-lane"
          label="Lane · dropdown (scales)"
          width={360}
          height={360}
        >
          <CloseupShell label="Lane picker · open" hint="ANY # OF LANES">
            <div style={{ width: 280 }}>
              <LaneSegmented value="domain" open />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="pick-estimate"
          label="Estimate · stepper"
          width={360}
          height={260}
        >
          <CloseupShell label="Estimate stepper" hint="0.5d INCREMENT">
            <div style={{ width: 240 }}>
              <EstimateStepper value={2.5} dirty />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="pick-tags"
          label="Tags · chip-input + suggestions"
          width={360}
          height={420}
        >
          <CloseupShell label="Tag editor" hint="↵ TO ADD">
            <div style={{ width: 280 }}>
              <TagEditor tags={["schema", "validation"]} adding dirty />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="pick-dep"
          label="Dependency · typeahead"
          width={360}
          height={520}
        >
          <CloseupShell label="Dependency editor · adding" hint="↵ TO LINK">
            <div style={{ width: 296 }}>
              <DependencyEditor
                label="Dependencies"
                ids={["plan-schema", "reference-resolver"]}
                addOpen
                dirty
              />
            </div>
          </CloseupShell>
        </DCArtboard>
      </DCSection>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3 — In-context patterns                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="incontext"
        title="In-context editing"
        subtitle="Lightweight edits that don't pull the user out of the graph view."
      >
        <DCArtboard
          id="node-quickedit"
          label="Node · quick-edit popover"
          width={480}
          height={340}
        >
          <NodeQuickEdit />
        </DCArtboard>

        <DCArtboard
          id="title-states"
          label="Editable title · 3 states"
          width={480}
          height={340}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--color-background)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 22,
              backgroundImage: `radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 18%, transparent), transparent 40%)`,
            }}
          >
            <div>
              <div
                className="atlas-kicker"
                style={{ fontSize: 9, marginBottom: 4 }}
              >
                Read
              </div>
              <EditableTitle value="Plan Schema Validation" state="read" />
            </div>
            <div>
              <div
                className="atlas-kicker"
                style={{ fontSize: 9, marginBottom: 4 }}
              >
                Editable · idle
              </div>
              <EditableTitle value="Plan Schema Validation" state="edit-idle" />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--color-muted-foreground)",
                  marginTop: 6,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Soft dashed underline signals editable
              </div>
            </div>
            <div>
              <div
                className="atlas-kicker"
                style={{ fontSize: 9, marginBottom: 4 }}
              >
                Editing · focused
              </div>
              <EditableTitle
                value="Plan Schema Validation"
                state="edit-focused"
              />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--color-muted-foreground)",
                  marginTop: 6,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Lichen wash + moss underline · caret active
              </div>
            </div>
          </div>
        </DCArtboard>

        <DCArtboard
          id="dep-cycle-toast"
          label="Write rejected · validation toast"
          width={480}
          height={220}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--color-background)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              backgroundImage: `radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 18%, transparent), transparent 40%)`,
            }}
          >
            <span className="atlas-kicker" style={{ fontSize: 9 }}>
              Transient toast · blur-write bounced
            </span>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border:
                  "1px solid color-mix(in oklab, var(--color-petal) 50%, transparent)",
                background:
                  "color-mix(in oklab, var(--color-petal) 12%, var(--color-surface))",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--color-petal)",
                  boxShadow:
                    "0 0 0 3px color-mix(in oklab, var(--color-petal) 22%, transparent)",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-foreground)",
                  }}
                >
                  Change reverted — would create a cycle
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-muted-foreground)",
                    marginTop: 1,
                    lineHeight: 1.4,
                  }}
                >
                  The CLI rejected the write; the field rolled back to its last
                  good value.
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-petal)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                cycle_detected
              </span>
            </div>
          </div>
        </DCArtboard>
      </DCSection>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 4 — Write-through save states                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="writethrough"
        title="Save-on-blur · write-through states"
        subtitle="The panel footer reports the lifecycle of the last write — not a batch of pending edits. A field commits on blur; the footer steps synced → writing → saved, or surfaces an error with a retry when the CLI is unreachable."
      >
        {[
          ["synced", "Synced"],
          ["saving", "Writing"],
          ["saved", "Saved"],
          ["error", "Error · CLI offline"],
        ].map(([s, label]) => (
          <DCArtboard
            key={s}
            id={"wt-" + s}
            label={label}
            width={320}
            height={130}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--color-background)",
                display: "flex",
                alignItems: "flex-end",
                backgroundImage: `radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 18%, transparent), transparent 40%)`,
              }}
            >
              <div style={{ width: "100%" }}>
                <WriteThroughStatus state={s} />
              </div>
            </div>
          </DCArtboard>
        ))}

        <DCArtboard
          id="field-blur-lifecycle"
          label="Per-field commit · on blur"
          width={400}
          height={300}
        >
          <CloseupShell
            label="Field-level indicator"
            hint="EDIT → BLUR → COMMIT"
          >
            <div
              style={{
                width: 320,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {[
                ["Focused · editing", null, "edit-focused"],
                ["Blur · writing", "saving", null],
                ["Committed", "saved", null],
              ].map(([cap, fs, titleState], i) => (
                <div key={i}>
                  <div
                    className="atlas-kicker"
                    style={{
                      fontSize: 9,
                      marginBottom: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Status
                    {fs && (
                      <span style={{ marginLeft: "auto" }}>
                        <FieldSaveIndicator state={fs} />
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "6px 9px",
                      borderRadius: "var(--radius-md)",
                      border: titleState
                        ? "1px solid var(--color-moss)"
                        : "1px dashed color-mix(in oklab, var(--color-border-strong) 55%, transparent)",
                      background: titleState
                        ? "color-mix(in oklab, var(--color-lichen) 16%, transparent)"
                        : "var(--color-surface)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <StatusDot status="in_progress" size={9} />
                    <span>In Progress</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "var(--color-muted-foreground)",
                      marginTop: 6,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {cap}
                  </div>
                </div>
              ))}
            </div>
          </CloseupShell>
        </DCArtboard>
      </DCSection>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 5 — Creation                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="create"
        title="Creating new work items"
        subtitle="A new item enters via the same right-rail surface, pre-focused on Title. Auto-id derives from the title in mono. Unlike edits, creation needs one explicit commit — 'Add to plan' validates the whole record before the first write."
      >
        <DCArtboard
          id="new-item"
          label="New work item · right rail"
          width={360}
          height={960}
        >
          <ArtboardShell>
            <NewItemForm />
          </ArtboardShell>
        </DCArtboard>

        <DCArtboard
          id="new-affordance"
          label="Entry affordances"
          width={360}
          height={520}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--color-background)",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              backgroundImage: `radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 18%, transparent), transparent 40%)`,
            }}
          >
            <span className="atlas-kicker" style={{ fontSize: 9 }}>
              Three places to start a new item
            </span>

            {/* 1. global */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                boxShadow:
                  "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-muted-foreground)",
                  letterSpacing: "0.16em",
                  width: 28,
                }}
              >
                01
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  Global · toolbar
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  Adds an unassigned item with lane = currently scoped lane
                </div>
              </div>
              <button
                className="atlas-button atlas-button-primary"
                style={{ padding: "6px 11px", fontSize: 11.5 }}
              >
                <PlusGlyph size={9} /> New item
              </button>
            </div>

            {/* 2. lane */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border)",
                background:
                  "color-mix(in oklab, var(--color-moss) 4%, var(--color-surface))",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-muted-foreground)",
                  letterSpacing: "0.16em",
                  width: 28,
                }}
              >
                02
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  Inside a lane · ghost node at the foot
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  Pre-assigns lane; auto-positions below last item
                </div>
              </div>
              <button
                className="atlas-chip"
                style={{ padding: "5px 9px", fontSize: 10 }}
              >
                <PlusGlyph size={9} /> Add to UI
              </button>
            </div>

            {/* 3. from selected */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                boxShadow:
                  "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-muted-foreground)",
                  letterSpacing: "0.16em",
                  width: 28,
                }}
              >
                03
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  From selected node · downstream
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  Pre-links a new dependency from the selection
                </div>
              </div>
              <button
                className="atlas-chip"
                style={{ padding: "5px 9px", fontSize: 10 }}
              >
                Branch ↘
              </button>
            </div>

            {/* shortcuts */}
            <div
              style={{
                marginTop: "auto",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-muted)",
                border: "1px dashed var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <span className="atlas-kicker" style={{ fontSize: 9 }}>
                Keyboard
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-muted-foreground)",
                }}
              >
                <kbd style={EC_kbd}>N</kbd> new item
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-muted-foreground)",
                }}
              >
                <kbd style={EC_kbd}>⇧N</kbd> branch from selected
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-muted-foreground)",
                }}
              >
                <kbd style={EC_kbd}>E</kbd> edit selected
              </span>
            </div>
          </div>
        </DCArtboard>
      </DCSection>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 6 — Schema-complete fields (cross-check additions)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="schema-complete"
        title="Schema-complete fields"
        subtitle="Added after cross-checking the live codebase: the read-only PlanDetailsPanel surfaces summary, deliverables, reuse_candidates, notes, and links — every one of which needs an editable counterpart. Plus a chip-style picker that matches the existing read-only chip treatment exactly."
      >
        <DCArtboard id="field-summary" label="Summary" width={400} height={260}>
          <CloseupShell label="Summary field" hint="REQUIRED">
            <div style={{ width: 340 }}>
              <SummaryEditor
                value="Parse YAML into a typed plan using Zod schemas with cross-record integrity checks (lane refs, duplicate IDs, dependency cycles)."
                dirty
              />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="field-notes"
          label="Notes · multi-line"
          width={400}
          height={340}
        >
          <CloseupShell label="Notes field" hint="OPTIONAL">
            <div style={{ width: 340 }}>
              <NotesEditor
                focused
                dirty
                value={
                  "Lift the shared cycle detector out of the schema layer once Analysis Engine is ready —\nright now both touch DFS three-colour and we'll drift.\n\nSee plan-schema.test.ts case `cycle_detected/back-edge`."
                }
              />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="field-deliverables"
          label="Deliverables · string list"
          width={400}
          height={420}
        >
          <CloseupShell label="Deliverables · string list" hint="· BULLET">
            <div style={{ width: 340 }}>
              <StringListEditor
                label="Deliverables"
                items={[
                  "Zod schema with cross-record checks",
                  "ValidationIssue type with semantic codes",
                  "Service wrapper exposing parse() → Result",
                ]}
                placeholder="Add deliverable…"
                dirty
              />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="field-reuse"
          label="Reuse candidates · string list"
          width={400}
          height={420}
        >
          <CloseupShell label="Reuse Candidates" hint="↺ BULLET">
            <div style={{ width: 340 }}>
              <StringListEditor
                label="Reuse Candidates"
                bulletGlyph="↺"
                items={[
                  "graphology — DAG traversal + cycle detection",
                  "zod/v4 — schema parsing primitives",
                ]}
                placeholder="Add reuse candidate…"
              />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="field-links"
          label="Links · {label, href}[]"
          width={420}
          height={420}
        >
          <CloseupShell label="Links editor" hint="URL OR .MD PATH">
            <div style={{ width: 360 }}>
              <LinksEditor
                links={[
                  {
                    label: "Plan schema source",
                    href: "src/lib/plan/task-garden-plan.schema.ts",
                  },
                  {
                    label: "Implementation plan",
                    href: "memory-bank/implementation-plan.md",
                  },
                  { label: "Zod v4 docs", href: "https://zod.dev/" },
                ]}
                dirty
              />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="chip-pickers"
          label="Chip-style pickers · match read-only"
          width={400}
          height={340}
        >
          <CloseupShell
            label="Status / Priority · chip variant"
            hint="ALT TO STAT-CARD"
          >
            <div
              style={{
                width: 340,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--color-muted-foreground)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Closed · interactive
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusChipPicker status="in_progress" />
                <PriorityChipPicker priority="p0" />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--color-muted-foreground)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Open · halo glow
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusChipPicker status="in_progress" open />
                <PriorityChipPicker priority="p0" open />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-muted-foreground)",
                  lineHeight: 1.5,
                  marginTop: 6,
                }}
              >
                Mirrors the production chip exactly — colored border at 46% mix
                of the accent token, colored label, no fill. Read mode and edit
                mode look identical until the user clicks.
              </div>
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="dep-error-cycle"
          label="Dep picker · cycle detected"
          width={400}
          height={300}
        >
          <CloseupShell label="Validation feedback" hint="CYCLE_DETECTED">
            <div style={{ width: 340 }}>
              <DepPickerError kind="cycle" />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="dep-error-self"
          label="Dep picker · self / duplicate"
          width={400}
          height={400}
        >
          <CloseupShell
            label="Validation feedback · other codes"
            hint="SELF · DUPLICATE"
          >
            <div
              style={{
                width: 340,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <DepPickerError kind="self" />
              <DepPickerError kind="duplicate" />
            </div>
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="plan-overview-edit"
          label="Plan-level editor"
          width={400}
          height={600}
        >
          <CloseupShell label="Plan Overview editor" hint="VIA INFO POPOVER">
            <PlanOverviewEditor />
          </CloseupShell>
        </DCArtboard>

        <DCArtboard
          id="lane-edit"
          label="Lane · inline editor"
          width={420}
          height={420}
        >
          <CloseupShell
            label="Lane editor · color + description"
            hint="OPTIONAL FIELDS"
          >
            <LaneInlineEditor />
          </CloseupShell>
        </DCArtboard>
      </DCSection>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 7 — Chosen save architecture: CLI write-through       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DCSection
        id="save-semantics"
        title="Save semantics · CLI write-through"
        subtitle="V1 was explicitly read-only (.kiro/steering/product.md). V2 keeps the source .taskgarden.yaml as the single source of truth: each blur-write round-trips through the local CLI, which validates with Zod and rewrites the file. Hot-reload then re-renders from disk."
      >
        <DCArtboard
          id="wt-flow"
          label="Write-through flow · field blur → disk"
          width={760}
          height={300}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--color-background)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              backgroundImage: `radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--color-lichen) 18%, transparent), transparent 40%)`,
            }}
          >
            <span className="atlas-kicker" style={{ fontSize: 9 }}>
              The happy path
            </span>
            <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
              {[
                {
                  n: "01",
                  t: "Field blur",
                  d: "User leaves a revealed field with a changed value.",
                },
                {
                  n: "02",
                  t: "PATCH /item",
                  d: "Panel sends the single changed field to the local CLI server.",
                },
                {
                  n: "03",
                  t: "Zod validate",
                  d: "CLI re-parses the whole plan; cross-record checks run.",
                },
                {
                  n: "04",
                  t: "Write YAML",
                  d: "On pass, plan.taskgarden.yaml is rewritten atomically.",
                },
                {
                  n: "05",
                  t: "Hot-reload",
                  d: "Watcher re-emits; panel re-renders from disk. Footer → Saved.",
                },
              ].map((s, i, arr) => (
                <React.Fragment key={s.n}>
                  <div
                    style={{
                      flex: 1,
                      padding: "12px 13px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      boxShadow:
                        "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        color: "var(--color-muted-foreground)",
                        letterSpacing: "0.16em",
                      }}
                    >
                      {s.n}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--color-foreground)",
                      }}
                    >
                      {s.t}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        lineHeight: 1.45,
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      {s.d}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 6px",
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8 H12 M9 5 L12 8 L9 11"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "11px 13px",
                  borderRadius: "var(--radius-md)",
                  border:
                    "1px solid color-mix(in oklab, var(--color-petal) 45%, transparent)",
                  background:
                    "color-mix(in oklab, var(--color-petal) 9%, var(--color-surface))",
                }}
              >
                <span
                  style={{
                    marginTop: 3,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--color-petal)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-foreground)",
                    }}
                  >
                    Validation fails (e.g. cycle)
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--color-muted-foreground)",
                      marginTop: 2,
                      lineHeight: 1.45,
                    }}
                  >
                    CLI returns the issue code; the field rolls back to its last
                    good value and a toast explains why. Nothing is written.
                  </div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "11px 13px",
                  borderRadius: "var(--radius-md)",
                  border:
                    "1px solid color-mix(in oklab, var(--color-pollen) 50%, transparent)",
                  background:
                    "color-mix(in oklab, var(--color-pollen) 12%, var(--color-surface))",
                }}
              >
                <span
                  style={{
                    marginTop: 3,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--color-pollen)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-foreground)",
                    }}
                  >
                    CLI unreachable
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--color-muted-foreground)",
                      marginTop: 2,
                      lineHeight: 1.45,
                    }}
                  >
                    Footer shows "Write failed — CLI offline" with Retry. The
                    edit is held in memory until the write succeeds.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

const EC_kbd = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 5,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-foreground)",
  boxShadow:
    "inset 0 -1px 0 color-mix(in oklab, var(--color-bark) 14%, transparent)",
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
