import { SectionInfoModal } from "task-garden";

// SectionInfoModal is the inline ⓘ affordance used beside toolbar section
// kickers (Scope, Color, Node Size…). It renders a small circled-i trigger that
// opens a Radix dialog with the passed children. The open dialog is
// interaction-only, so the honest static capture is the styled closed trigger
// sitting beside its section label, exactly as it appears in the toolbar.

export function ColorEncoding() {
  return (
    <div style={{ padding: 16 }}>
      <span className="atlas-kicker flex items-center gap-1.5">
        Color
        <SectionInfoModal title="Color Encoding">
          <p>
            Color maps each node to an accent derived from the active encoding —
            status, lane, or a normalized metric ramp.
          </p>
          <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
            <span className="font-semibold text-foreground/70">
              How it works:{" "}
            </span>
            Metric modes normalize the value across the visible nodes, then map
            it onto the moss-to-pollen ramp.
          </div>
        </SectionInfoModal>
      </span>
    </div>
  );
}

export function Scope() {
  return (
    <div style={{ padding: 16 }}>
      <span className="atlas-kicker flex items-center gap-1.5">
        Scope
        <SectionInfoModal title="Scope">
          <p>
            Scope narrows the graph around the selected item — the work before
            it, after it, or both.
          </p>
        </SectionInfoModal>
      </span>
    </div>
  );
}
