import type { ReactNode } from "react";

interface LiveRegionProps {
  kind: "status" | "alert";
  children: ReactNode;
  className?: string;
}

/**
 * ARIA live region for announcing dynamic text to assistive technology —
 * APG "status" (polite) and "alert" (assertive interruption) patterns.
 *
 * Invariant: the region element itself must persist across renders and only
 * its text content may change. Assistive technology only announces mutations
 * inside a live region that already exists in the DOM, so consumers must keep
 * a `LiveRegion` mounted (passing empty children when there is nothing to
 * announce) rather than conditionally mounting one with its content.
 */
export function LiveRegion({ kind, children, className }: LiveRegionProps) {
  if (kind === "alert") {
    // Pure role=alert: implies aria-live="assertive" + aria-atomic="true";
    // adding aria-live explicitly would risk contradicting the role.
    return (
      <div role="alert" className={className}>
        {children}
      </div>
    );
  }
  // <output> carries implicit role=status; explicit aria-live/aria-atomic
  // because implicit live semantics are inconsistently implemented, and the
  // whole message must re-announce when the text swaps.
  return (
    <output aria-live="polite" aria-atomic="true" className={className}>
      {children}
    </output>
  );
}
