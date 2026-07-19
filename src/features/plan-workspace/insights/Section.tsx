import type { ReactNode } from "react";
import { SectionInfoModal } from "../SectionInfoModal";

/**
 * Titled section of an insights mode: kicker heading plus an optional
 * info-modal explanation affordance next to it. All insight content renders
 * inside these so every section gets the same heading treatment and the same
 * "what is this?" entry point.
 */
export function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <h2 className="atlas-kicker">{label}</h2>
        {description ? (
          <SectionInfoModal title={label}>{description}</SectionInfoModal>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The "How it works" callout used by every section explanation: a muted box
 * with the shared lead-in, so explanation copy supplies only the mechanism
 * sentence(s).
 */
export function HowItWorks({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-2">
      <span className="font-semibold text-foreground/70">How it works: </span>
      {children}
    </div>
  );
}
