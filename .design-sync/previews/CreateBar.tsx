import type { ReactNode } from "react";
import { CreateBar } from "task-garden";

// CreateBar is the right-aligned action footer shared by the create/commit
// forms: a primary CTA, an optional secondary (Cancel-style) action, and a
// muted hint slot on the left. Sweep its states — ready, disabled, busy, and a
// single-CTA variant — inside a panel shell so the top border reads as a real
// form footer. Callbacks are no-ops for static capture.

const noop = () => {};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: 440 }} className="atlas-panel overflow-hidden">
      <div className="px-4 py-3">
        <p className="atlas-title text-sm text-foreground">New work item</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A slug, title, and lane are required before the item can be saved to
          the plan.
        </p>
      </div>
      {children}
    </div>
  );
}

export function Ready() {
  return (
    <Shell>
      <CreateBar
        primaryLabel="Add to plan"
        onPrimary={noop}
        secondaryLabel="Cancel"
        onSecondary={noop}
        hint="Ready to save"
      />
    </Shell>
  );
}

export function NeedsInput() {
  return (
    <Shell>
      <CreateBar
        primaryLabel="Add to plan"
        primaryDisabled
        onPrimary={noop}
        secondaryLabel="Cancel"
        onSecondary={noop}
        hint="Form has unresolved fields"
      />
    </Shell>
  );
}

export function Saving() {
  return (
    <Shell>
      <CreateBar
        primaryLabel="Add to plan"
        busy
        onPrimary={noop}
        secondaryLabel="Cancel"
        onSecondary={noop}
        hint="Writing through to plan.yaml…"
      />
    </Shell>
  );
}

export function CommitOnly() {
  return (
    <Shell>
      <CreateBar
        primaryLabel="Commit edit"
        onPrimary={noop}
        hint="Saved 2 seconds ago"
      />
    </Shell>
  );
}
