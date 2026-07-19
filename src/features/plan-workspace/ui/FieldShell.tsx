import type { ReactNode } from "react";
import { LiveRegion } from "./LiveRegion";

export interface FieldShellProps {
  label: string;
  /** Id stamped on the label element so a child control can point aria-labelledby at it. */
  labelId?: string;
  /** When the child is a labellable native control, renders a real <label> associated with it. */
  htmlFor?: string;
  /** Shows the unsaved-changes dot plus visually-hidden "unsaved changes" text for assistive tech. */
  dirty?: boolean;
  /** Slot for a save-status indicator, e.g. <FieldSaveIndicator />. */
  status?: ReactNode;
  /** Extra label-row chrome, e.g. an "OPTIONAL" chip. */
  trailing?: ReactNode;
  children: ReactNode;
}

/**
 * The frame around an editing field: kicker label, dirty marker, and
 * save-status chrome above the field control. Labelling composite (no APG
 * widget pattern) — it provides the field's accessible name association
 * (`htmlFor` for native controls, `labelId` for aria-labelledby wiring) and
 * announces unsaved-changes state to assistive tech; the child control keeps
 * its own role and keyboard behavior. Edit-store-agnostic: all state arrives
 * via props.
 */
export function FieldShell({
  label,
  labelId,
  htmlFor,
  dirty,
  status,
  trailing,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {htmlFor ? (
          <label id={labelId} htmlFor={htmlFor} className="atlas-kicker">
            {label}
          </label>
        ) : (
          <span id={labelId} className="atlas-kicker">
            {label}
          </span>
        )}
        {trailing}
        {dirty && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-pollen)" }}
          />
        )}
        {/* Persistent polite region so the dirty transition itself is
            announced; bare sr-only text would only be found by linear
            reading. */}
        <LiveRegion kind="status" className="sr-only">
          {dirty ? "unsaved changes" : null}
        </LiveRegion>
        {status}
      </div>
      {children}
    </div>
  );
}
